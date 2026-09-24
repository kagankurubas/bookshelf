import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fail, pass, passIfEmpty, skip } from '../results.js'

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

const JWT_LABELS = {
  service_role: 'service_role JWT',
  anon: 'anon JWT',
  'unknown role': 'JWT whose role is neither anon nor service_role',
  undecodable: 'JWT-shaped token with an undecodable payload',
}

function jwtPayload(segment) {
  try {
    const payload = JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'))
    return payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : null
  } catch {
    return null
  }
}

// Yields { line, kind } for every JWT-shaped token in `text` except local demo
// anon keys; `kind` is a key of JWT_LABELS.
function* findJwts(text, demoIssuers) {
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    for (const match of lines[i].matchAll(JWT)) {
      const payload = jwtPayload(match[1])
      if (!payload) {
        yield { line: i + 1, kind: 'undecodable' }
        continue
      }
      const { role, iss } = payload
      if (role === 'anon' && demoIssuers.has(iss)) continue
      yield { line: i + 1, kind: role === 'anon' || role === 'service_role' ? role : 'unknown role' }
    }
  }
}

function scanTrackedFiles(ctx, demoIssuers, projectRef) {
  const results = []
  for (const file of ctx.trackedFiles) {
    const text = ctx.readText(file)
    if (text === null) continue
    const lines = text.split('\n')
    lines.forEach((content, index) => {
      for (const { kind, regex } of SECRET_PATTERNS) {
        if (content.match(regex)) results.push(fail({ file, line: index + 1, message: `${kind} in a tracked file` }))
      }
      if (projectRef && content.toLowerCase().includes(projectRef)) {
        results.push(fail({ file, line: index + 1, message: 'production project ref in a tracked file' }))
      }
    })
    for (const { line, kind } of findJwts(text, demoIssuers)) {
      results.push(fail({ file, line, message: `${JWT_LABELS[kind]} in a tracked file` }))
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

// The anon key belongs in the build; every other JWT does not.
function scanBuildOutput(ctx, demoIssuers) {
  const dir = join(ctx.root, BUILD_DIR)
  if (!existsSync(dir) || !statSync(dir).isDirectory()) {
    return [skip({ message: `no build output (${BUILD_DIR}/) to scan for service_role JWTs` })]
  }
  const results = []
  for (const path of listFiles(dir).filter((p) => BUILD_TEXT_EXTENSIONS.test(p))) {
    const file = relative(ctx.root, path).split('\\').join('/')
    const text = ctx.readText(file)
    if (text === null) continue
    for (const { line, kind } of findJwts(text, demoIssuers)) {
      if (kind !== 'anon') results.push(fail({ file, line, message: `${JWT_LABELS[kind]} in build output` }))
    }
  }
  return passIfEmpty(results, `build output (${BUILD_DIR}/) has no service_role JWT`)
}

function checkIgnored(ctx) {
  const results = []
  const tracked = ctx.trackedFiles
  for (const path of MUST_BE_IGNORED) {
    const trackedMatch = path.endsWith('/') ? tracked.find((f) => f.startsWith(path)) : tracked.find((f) => f === path)
    if (trackedMatch) {
      results.push(fail({ file: trackedMatch, message: `${path} must not be tracked by git` }))
      continue
    }
    const { status } = spawnSync('git', ['check-ignore', '-q', path], { cwd: ctx.root })
    if (status !== 0) results.push(fail({ message: `${path} is not ignored by .gitignore` }))
  }
  return passIfEmpty(results, `${MUST_BE_IGNORED.join(', ')} are git-ignored and untracked`)
}

function checkEnvExample(ctx) {
  const text = ctx.readText(ENV_EXAMPLE)
  if (text === null) return [skip({ message: `no ${ENV_EXAMPLE}` })]
  const results = []
  text.split('\n').forEach((content, index) => {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/.exec(content)
    if (!match) return
    const value = match[2].trim().replace(/^(['"])(.*)\1$/, '$2')
    if (value) results.push(fail({ file: ENV_EXAMPLE, line: index + 1, message: `${match[1]} has a non-empty value` }))
  })
  return passIfEmpty(results, `${ENV_EXAMPLE} values are empty`)
}

export const leakage = {
  id: 'leakage',
  title: 'Secret leakage',
  run(ctx) {
    const demoIssuers = new Set(ctx.exceptions.localDemoJwtIssuers?.map((e) => e.iss) ?? [])
    const projectRef = ctx.readText(PROJECT_REF_FILE)?.trim().toLowerCase() || null
    const trackedResults = scanTrackedFiles(ctx, demoIssuers, projectRef)
    const results = passIfEmpty([...trackedResults], 'tracked files have no Supabase URL, secret key or service_role/anon JWT')
    if (!projectRef) {
      results.push(skip({ message: `no ${PROJECT_REF_FILE}; production project ref search skipped` }))
    } else if (!trackedResults.some((r) => r.message.startsWith('production project ref'))) {
      results.push(pass({ message: `production project ref (from ${PROJECT_REF_FILE}) not found in tracked files` }))
    }
    return [...results, ...scanBuildOutput(ctx, demoIssuers), ...checkIgnored(ctx), ...checkEnvExample(ctx)]
  },
}
