import { existsSync } from 'node:fs'
import { join } from 'node:path'

const AI_CHAT = 'supabase/functions/ai-chat/index.ts'
const QUOTA_FUNCTION = 'try_consume_ai_quota'
const USAGE_TABLE = 'ai_daily_usage'

// Returns the index after a quoted string or template literal starting at
// `start`, recursing into `${...}` substitutions.
function skipString(src, start) {
  const quote = src[start]
  let i = start + 1
  while (i < src.length) {
    const ch = src[i]
    if (ch === '\\') i += 2
    else if (ch === quote) return i + 1
    else if (quote === '`' && ch === '$' && src[i + 1] === '{') i = skipCode(src, i + 2, '}')
    else if (quote !== '`' && ch === '\n') return i
    else i++
  }
  return i
}

// Scans code until an unbalanced `close` (or end of input) and returns the
// index after it.
function skipCode(src, start, close) {
  let depth = 0
  let i = start
  while (i < src.length) {
    const ch = src[i]
    if (ch === "'" || ch === '"' || ch === '`') i = skipString(src, i)
    else if (ch === '{') {
      depth++
      i++
    } else if (ch === '}') {
      if (depth === 0 && close === '}') return i + 1
      depth--
      i++
    } else i++
  }
  return i
}

// Replaces `//` and `/* */` comments with spaces (keeping newlines) so that
// offsets and line numbers still match the original source.
function blankComments(src) {
  let out = ''
  let i = 0
  while (i < src.length) {
    const ch = src[i]
    const next = src[i + 1]
    if (ch === '/' && next === '/') {
      while (i < src.length && src[i] !== '\n') {
        out += ' '
        i++
      }
    } else if (ch === '/' && next === '*') {
      const end = src.indexOf('*/', i + 2)
      const stop = end === -1 ? src.length : end + 2
      out += src.slice(i, stop).replace(/[^\n]/g, ' ')
      i = stop
    } else if (ch === "'" || ch === '"' || ch === '`') {
      const end = skipString(src, i)
      out += src.slice(i, end)
      i = end
    } else {
      out += ch
      i++
    }
  }
  return out
}

const lineOf = (src, index) => src.slice(0, index).split('\n').length

function checkMigrations(ctx) {
  const { functions, tables, policies } = ctx.migrations
  const results = []

  const fn = functions.get(QUOTA_FUNCTION)
  if (!fn) {
    results.push({ status: 'fail', message: `${QUOTA_FUNCTION} is not defined by the migrations` })
  } else {
    const missing = [
      !fn.securityDefiner && 'security definer',
      !fn.searchPath && 'set search_path',
    ].filter(Boolean)
    results.push(
      missing.length
        ? { status: 'fail', message: `last definition of ${QUOTA_FUNCTION} lacks ${missing.join(' and ')}`, file: fn.file, line: fn.line }
        : { status: 'pass', message: `${QUOTA_FUNCTION} is security definer with a pinned search_path`, file: fn.file, line: fn.line },
    )
  }

  const table = tables.get(USAGE_TABLE)
  const tablePolicies = [...policies.values()].filter((p) => p.table === USAGE_TABLE)
  if (!table) {
    results.push({ status: 'fail', message: `${USAGE_TABLE} is not created by the migrations` })
  } else if (!table.rls) {
    results.push({ status: 'fail', message: `${USAGE_TABLE} does not have row level security enabled`, file: table.rlsFile ?? table.file, line: table.rlsLine ?? table.line })
  } else if (tablePolicies.length) {
    for (const policy of tablePolicies) {
      results.push({ status: 'fail', message: `${USAGE_TABLE} must stay policyless but has policy "${policy.name}"`, file: policy.file, line: policy.line })
    }
  } else {
    results.push({ status: 'pass', message: `${USAGE_TABLE} has RLS enabled and no policies`, file: table.rlsFile, line: table.rlsLine })
  }
  return results
}

function checkEdgeFunction(ctx) {
  if (!existsSync(join(ctx.root, AI_CHAT))) {
    return [{ status: 'fail', message: `${AI_CHAT} not found; cannot verify the quota guard` }]
  }
  const src = blankComments(ctx.readFile(AI_CHAT))
  const at = (index) => ({ file: AI_CHAT, line: lineOf(src, index) })

  const rpc = new RegExp(String.raw`\.rpc\s*\(\s*(['"\`])${QUOTA_FUNCTION}\1`).exec(src)
  if (!rpc) {
    return [{ status: 'fail', message: `no rpc('${QUOTA_FUNCTION}', ...) call`, file: AI_CHAT }]
  }

  const results = []
  const firstInsert = /\.insert\s*\(/.exec(src)
  const firstFetch = /\bfetch\s*\(/.exec(src)
  const after = src.slice(rpc.index)
  const guardEnd = rpc.index + Math.min(
    ...[/\.insert\s*\(/, /\bfetch\s*\(/].map((pattern) => pattern.exec(after)?.index ?? after.length),
  )
  for (const [call, match] of [['.insert(', firstInsert], ['fetch(', firstFetch]]) {
    if (match && match.index < rpc.index) {
      results.push({ status: 'fail', message: `quota is consumed after the first ${call} call (line ${lineOf(src, match.index)})`, ...at(rpc.index) })
    }
  }

  // The guard branches must sit between the quota call and the first write/fetch.
  const guard = src.slice(rpc.index, guardEnd)
  if (!/\bif\s*\(\s*quotaError\s*\)\s*\{?\s*throw\b/.test(guard)) {
    results.push({ status: 'fail', message: 'no `if (quotaError) throw` right after the quota call', ...at(rpc.index) })
  }
  if (!/\bif\s*\(\s*!\s*quotaOk\s*\)\s*\{?\s*return\b/.test(guard)) {
    results.push({ status: 'fail', message: 'no early `return` when `!quotaOk` right after the quota call', ...at(rpc.index) })
  }

  if (!results.length) {
    results.push({ status: 'pass', message: 'quota is consumed and enforced before any insert or Gemini fetch', ...at(rpc.index) })
  }
  return results
}

export const quotaGuard = {
  id: 'quota-guard',
  title: 'Wall 5: Gemini quota guard',
  run: (ctx) => [...checkMigrations(ctx), ...checkEdgeFunction(ctx)],
}
