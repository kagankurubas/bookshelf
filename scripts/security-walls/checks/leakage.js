import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const LINK_DIR = 'supabase/.temp'
const PROJECT_REF_FILE = `${LINK_DIR}/project-ref`
const BUILD_DIR = 'dist'
const MUST_BE_IGNORED = ['.env', '.env.test.local', `${LINK_DIR}/`]
const ENV_EXAMPLE = '.env.example'

// Real project refs are 20 lowercase alphanumerics, so placeholders such as
// `<ref>.supabase.co` or `example.supabase.co` in docs don't match.
const SECRET_PATTERNS = [
  { kind: 'Supabase project URL (*.supabase.co)', regex: /\b[a-z0-9]{20}\.supabase\.co\b/gi },
  { kind: 'Supabase secret key (sb_secret_)', regex: /\bsb_secret_[A-Za-z0-9_-]{10,}/g },
  { kind: 'Gemini API key (AIza…)', regex: /\bAIza[0-9A-Za-z_-]{35}/g },
  { kind: 'Anthropic API key (sk-ant-)', regex: /\bsk-ant-[A-Za-z0-9_-]{20,}/g },
]
const JWT = /\beyJ[A-Za-z0-9_-]+\.(eyJ[A-Za-z0-9_-]+)\.[A-Za-z0-9_-]*/g
const BUILD_TEXT_EXTENSIONS = /\.(?:js|mjs|cjs|html|css|json|map|webmanifest|txt|svg)$/i

function jwtPayload(segment) {
  try {
    return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'))
  } catch {
    return null
  }
}

function readText(root, file) {
  let buffer
  try {
    buffer = readFileSync(join(root, file))
  } catch {
    return null
  }
  return buffer.includes(0) ? null : buffer.toString('utf8')
}

// Yields { line, jwtRole } for every JWT in `text` that isn't a local demo key.
function* findJwts(text, demoIssuers) {
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    for (const match of lines[i].matchAll(JWT)) {
      const payload = jwtPayload(match[1])
      if (!payload || demoIssuers.has(payload.iss)) continue
      yield { line: i + 1, role: payload.role }
    }
  }
}

function scanTrackedFiles(ctx, demoIssuers, projectRef) {
  const results = []
  const fail = (file, line, message) => results.push({ status: 'fail', file, line, message })
  for (const file of ctx.trackedFiles) {
    const text = readText(ctx.root, file)
    if (text === null) continue
    const lines = text.split('\n')
    lines.forEach((content, index) => {
      for (const { kind, regex } of SECRET_PATTERNS) {
        if (content.match(regex)) fail(file, index + 1, `${kind} in a tracked file`)
      }
      if (projectRef && content.toLowerCase().includes(projectRef)) {
        fail(file, index + 1, 'production project ref in a tracked file')
      }
    })
    for (const { line, role } of findJwts(text, demoIssuers)) {
      if (role === 'service_role' || role === 'anon') fail(file, line, `${role} JWT in a tracked file`)
    }
  }
  return results
}

function listFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    return entry.isDirectory() ? listFiles(path) : [path]
  })
}

function scanBuildOutput(ctx, demoIssuers) {
  const dir = join(ctx.root, BUILD_DIR)
  if (!existsSync(dir) || !statSync(dir).isDirectory()) {
    return [{ status: 'skip', message: `no build output (${BUILD_DIR}/) to scan for service_role JWTs` }]
  }
  const results = []
  for (const path of listFiles(dir).filter((p) => BUILD_TEXT_EXTENSIONS.test(p))) {
    const file = relative(ctx.root, path).split('\\').join('/')
    const text = readText(ctx.root, file)
    if (text === null) continue
    for (const { line, role } of findJwts(text, demoIssuers)) {
      if (role === 'service_role') results.push({ status: 'fail', file, line, message: 'service_role JWT in build output' })
    }
  }
  return results.length ? results : [{ status: 'pass', message: `build output (${BUILD_DIR}/) has no service_role JWT` }]
}

function readProjectRef(root) {
  try {
    return readFileSync(join(root, PROJECT_REF_FILE), 'utf8').trim().toLowerCase() || null
  } catch {
    return null
  }
}

function checkIgnored(ctx) {
  const results = []
  const tracked = ctx.trackedFiles
  for (const path of MUST_BE_IGNORED) {
    const trackedMatch = path.endsWith('/') ? tracked.find((f) => f.startsWith(path)) : tracked.find((f) => f === path)
    if (trackedMatch) {
      results.push({ status: 'fail', file: trackedMatch, message: `${path} must not be tracked by git` })
      continue
    }
    const { status } = spawnSync('git', ['check-ignore', '-q', path], { cwd: ctx.root })
    if (status !== 0) results.push({ status: 'fail', message: `${path} is not ignored by .gitignore` })
  }
  return results.length ? results : [{ status: 'pass', message: `${MUST_BE_IGNORED.join(', ')} are git-ignored and untracked` }]
}

function checkEnvExample(ctx) {
  const text = readText(ctx.root, ENV_EXAMPLE)
  if (text === null) return [{ status: 'skip', message: `no ${ENV_EXAMPLE}` }]
  const results = []
  text.split('\n').forEach((content, index) => {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/.exec(content)
    if (!match) return
    const value = match[2].trim().replace(/^(['"])(.*)\1$/, '$2')
    if (value) results.push({ status: 'fail', file: ENV_EXAMPLE, line: index + 1, message: `${match[1]} has a non-empty value` })
  })
  return results.length ? results : [{ status: 'pass', message: `${ENV_EXAMPLE} values are empty` }]
}

export const leakage = {
  id: 'leakage',
  title: 'Leakage',
  run(ctx) {
    const demoIssuers = new Set(ctx.exceptions.localDemoJwtIssuers?.map((e) => e.iss) ?? [])
    const projectRef = readProjectRef(ctx.root)
    const trackedResults = scanTrackedFiles(ctx, demoIssuers, projectRef)
    const results = trackedResults.length
      ? trackedResults
      : [{ status: 'pass', message: 'tracked files have no Supabase URL, secret key or service_role/anon JWT' }]
    if (!projectRef) {
      results.push({ status: 'skip', message: `no ${PROJECT_REF_FILE}; production project ref search skipped` })
    } else if (!trackedResults.some((r) => r.message.startsWith('production project ref'))) {
      results.push({ status: 'pass', message: `production project ref (from ${PROJECT_REF_FILE}) not found in tracked files` })
    }
    return [...results, ...scanBuildOutput(ctx, demoIssuers), ...checkIgnored(ctx), ...checkEnvExample(ctx)]
  },
}
