// Production migration history wall: compares production's migration versions
// and policies with the local migrations, read-only and only with --linked.
// Every Supabase CLI call goes through the allow-list below.
import { spawnSync } from 'node:child_process'
import { expectedPolicies, policyProblems } from './rls.js'
import { fail, passIfEmpty, skip } from '../results.js'

export const VERSIONS_QUERY = 'select version from supabase_migrations.schema_migrations order by version'
export const POLICIES_QUERY =
  "select tablename, policyname, cmd, qual, with_check from pg_policies where schemaname = 'public' order by tablename, policyname"

const dbQuery = (sql) => ['db', 'query', '--linked', '--output', 'json', sql]

// The only Supabase CLI invocations this script may ever run, matched exactly.
export const ALLOWED_COMMANDS = Object.freeze([dbQuery(VERSIONS_QUERY), dbQuery(POLICIES_QUERY)].map(Object.freeze))

const HOW_TO_LINK = 'run `npx supabase login` and `npx supabase link --project-ref <ref>` first'

// The only CLI failures that SKIP the wall; every other failure is a FAIL.
// The CLI could not be started at all:
const CLI_MISSING = [
  /\bspawn(?:Sync)? \S+ ENOENT\b/, // Node's spawn error when the executable does not exist
  /is not recognized as an internal or external command/i, // cmd.exe
  /command not found/i, // POSIX shells
]
// Not logged in or not linked, matched on the Supabase CLI's own messages
// (supabase/cli: ErrMissingToken in internal/utils/access_token.go, ErrNotLinked
// in internal/utils/misc.go):
const CLI_NOT_LINKED = [
  /Access token not provided/, // no `supabase login` and no SUPABASE_ACCESS_TOKEN
  /Cannot find project ref/, // no `supabase link`
]

export function assertAllowed(args) {
  const allowed = ALLOWED_COMMANDS.some(
    (command) => Array.isArray(args) && command.length === args.length && command.every((part, i) => part === args[i]),
  )
  if (!allowed) throw new Error(`refusing to run a Supabase CLI command that is not allow-listed: supabase ${[].concat(args).join(' ')}`)
}

// Only reached when ctx.linked is true. On Windows `npx` is a .cmd shim that
// needs a shell; allow-listed arguments contain no double quotes to escape.
export function defaultRunner(args, { cwd }) {
  assertAllowed(args)
  const windows = process.platform === 'win32'
  const argv = ['--yes', 'supabase', ...args]
  const child = spawnSync(windows ? 'npx.cmd' : 'npx', windows ? argv.map((arg) => `"${arg}"`) : argv, {
    cwd,
    encoding: 'utf8',
    shell: windows,
    timeout: 120000,
  })
  return { code: child.error ? null : child.status, stdout: child.stdout ?? '', stderr: `${child.stderr ?? ''}${child.error?.message ?? ''}` }
}

// Last few non-empty stderr lines, capped, with credentials and project hosts redacted.
function stderrExcerpt(stderr) {
  const lines = `${stderr ?? ''}`.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const text = lines.slice(-3).join(' | ')
    .replace(/\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g, '<redacted JWT>')
    .replace(/\bsb[a-z]*_[A-Za-z0-9_-]{10,}/g, '<redacted key>')
    .replace(/(\b[a-z][a-z0-9+.-]*:\/\/[^:/?#\s@]+:)[^@\s]+@/gi, '$1<redacted>@')
    .replace(/\b[a-z0-9]{20}\.supabase\.(co|com)\b/gi, '<ref>.supabase.$1')
  return text.length > 300 ? `${text.slice(0, 300)}…` : text
}

class CliSkip extends Error {}
class CliFailure extends Error {}

function cliError(args, { code, stderr }) {
  const command = `supabase ${args.slice(0, 3).join(' ')}`
  const detail = stderrExcerpt(stderr)
  const text = `${stderr ?? ''}`
  if (CLI_MISSING.some((pattern) => pattern.test(text))) {
    return new CliSkip(`Supabase CLI could not be started (${detail}); install it and ${HOW_TO_LINK}`)
  }
  if (CLI_NOT_LINKED.some((pattern) => pattern.test(text))) {
    return new CliSkip(`\`${command}\` failed (${detail}); ${HOW_TO_LINK}`)
  }
  return new CliFailure(`\`${command}\` failed with exit ${code ?? 'unknown'}${detail ? `: ${detail}` : ''}`)
}

async function query(runner, sql, cwd) {
  const args = dbQuery(sql)
  assertAllowed(args)
  let result
  try {
    result = await runner(args, { cwd })
  } catch (error) {
    throw cliError(args, { code: null, stderr: `${error?.message ?? error}` })
  }
  if (result?.code !== 0) throw cliError(args, result ?? {})
  return parseRows(result.stdout)
}

// Accepts a bare JSON array of rows or an object with a `rows` array, with
// any non-JSON noise (warnings, banners) before or after it.
export function parseRows(stdout) {
  const text = `${stdout ?? ''}`
  const starts = [text.indexOf('['), text.indexOf('{')].filter((i) => i !== -1)
  if (starts.length === 0) throw new Error('no JSON found in Supabase CLI output')
  const start = Math.min(...starts)
  const ends = [text.lastIndexOf(']'), text.lastIndexOf('}')].filter((i) => i > start).sort((a, b) => b - a)
  for (const end of ends) {
    let parsed
    try {
      parsed = JSON.parse(text.slice(start, end + 1))
    } catch {
      continue
    }
    const rows = Array.isArray(parsed) ? parsed : parsed?.rows
    if (Array.isArray(rows)) return rows
  }
  throw new Error('could not parse Supabase CLI output as JSON rows')
}

const localVersion = (file) => /^(\d+)_/.exec(file.split('/').pop())?.[1]

// A version's format is its digit count: `001` (3), `1` (1), a timestamp (14).
const formatsOf = (versions) => new Set(versions.map((version) => version.length))
const describeFormats = (versions) =>
  [...formatsOf(versions)].map((digits) => `${digits}-digit, e.g. ${versions.find((v) => v.length === digits)}`).join('; ')

function compareVersions(ctx, rows) {
  const local = new Map()
  const results = []
  for (const file of ctx.migrations.files) {
    const version = localVersion(file)
    if (!version) continue
    if (local.has(version)) {
      results.push(fail({ message: `migration version ${version} is used by more than one local file (also ${local.get(version)})`, file }))
    } else {
      local.set(version, file)
    }
  }
  const remote = new Set(rows.map((row) => String(row.version)))

  const localVersions = [...local.keys()]
  const remoteVersions = [...remote]
  const localFormats = formatsOf(localVersions)
  if (local.size && remote.size && ![...formatsOf(remoteVersions)].some((format) => localFormats.has(format))) {
    results.push(fail({
      message: `local migration versions (${describeFormats(localVersions)}) and production schema_migrations versions (${describeFormats(remoteVersions)}) share no common format, so they cannot be compared version by version`,
    }))
    return results
  }

  for (const [version, file] of local) {
    if (!remote.has(version)) {
      results.push(fail({ message: `migration ${version} is not recorded in production schema_migrations`, file }))
    }
  }
  for (const version of remote) {
    if (!local.has(version)) {
      results.push(fail({ message: `production schema_migrations has version ${version}, which no local migration file has` }))
    }
  }
  return passIfEmpty(results, `${local.size} migration versions match production schema_migrations`)
}

function comparePolicies(ctx, rows) {
  const expected = expectedPolicies(ctx)
  const remote = new Map(rows.map((row) => [`${row.tablename}:${row.policyname}`, row]))
  const results = []
  for (const policy of expected) {
    const { file, line } = policy
    const row = remote.get(`${policy.table}:${policy.name}`)
    if (!row) {
      results.push(fail({ message: `policy "${policy.name}" on ${policy.table} is missing in production pg_policies`, file, line }))
      continue
    }
    const remoteCommand = `${row.cmd ?? ''}`.toLowerCase()
    if (remoteCommand !== policy.command) {
      results.push(fail({
        message: `production policy "${policy.name}" on ${policy.table}: command is ${remoteCommand.toUpperCase() || 'missing'}, the migrations define ${policy.command.toUpperCase()}`,
        file,
        line,
      }))
    }
    for (const problem of policyProblems({ ...policy, using: row.qual ?? null, withCheck: row.with_check ?? null })) {
      results.push(fail({ message: `production policy "${policy.name}" on ${policy.table}: ${problem}`, file, line }))
    }
  }
  const expectedKeys = new Set(expected.map((policy) => `${policy.table}:${policy.name}`))
  for (const [key, row] of remote) {
    if (!expectedKeys.has(key)) {
      results.push(fail({ message: `production has policy "${row.policyname}" on ${row.tablename}, which the migrations do not define` }))
    }
  }
  return passIfEmpty(results, `${expected.length} policies match production pg_policies`)
}

export function createLinkedMigrationsCheck({ runner = defaultRunner } = {}) {
  return {
    id: 'linked-migrations',
    title: 'Production migration history (--linked)',
    async run(ctx) {
      if (!ctx.linked) return [skip({ message: 'use --linked for the production check' })]
      try {
        const versions = await query(runner, VERSIONS_QUERY, ctx.root)
        const policies = await query(runner, POLICIES_QUERY, ctx.root)
        return [...compareVersions(ctx, versions), ...comparePolicies(ctx, policies)]
      } catch (error) {
        if (error instanceof CliSkip) return [skip({ message: error.message })]
        if (error instanceof CliFailure) return [fail({ message: error.message })]
        throw error
      }
    },
  }
}

export const linkedMigrations = createLinkedMigrationsCheck()
