import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { blankJsComments } from '../jsComments.js'
import { DEFAULT_FUNCTION_GRANTEES } from '../migrations.js'
import { fail, pass, passIfEmpty } from '../results.js'

const AI_CHAT = 'supabase/functions/ai-chat/index.ts'
const QUOTA_FUNCTION = 'try_consume_ai_quota'
const REFUND_FUNCTION = 'refund_ai_quota'
const USAGE_TABLE = 'ai_daily_usage'
const CLIENT_ROLES = DEFAULT_FUNCTION_GRANTEES.filter((role) => role !== 'service_role')

const lineOf = (src, index) => src.slice(0, index).split('\n').length

function checkMigrations(ctx) {
  const { functions, tables, policies } = ctx.migrations
  const results = []

  for (const name of [QUOTA_FUNCTION, REFUND_FUNCTION]) {
    const fn = functions.get(name)
    if (!fn) {
      results.push(fail({ message: `${name} is not defined by the migrations` }))
      continue
    }
    const missing = [
      !fn.securityDefiner && 'security definer',
      !fn.searchPath && 'set search_path',
    ].filter(Boolean)
    results.push(
      missing.length
        ? fail({ message: `last definition of ${name} lacks ${missing.join(' and ')}`, file: fn.file, line: fn.line })
        : pass({ message: `${name} is security definer with a pinned search_path`, file: fn.file, line: fn.line }),
    )
    results.push(...checkCallerSurface(fn))
  }

  const table = tables.get(USAGE_TABLE)
  const tablePolicies = [...policies.values()].filter((p) => p.table === USAGE_TABLE)
  if (!table) {
    results.push(fail({ message: `${USAGE_TABLE} is not created by the migrations` }))
  } else if (!table.rls) {
    results.push(fail({ message: `${USAGE_TABLE} does not have row level security enabled`, file: table.rlsFile ?? table.file, line: table.rlsLine ?? table.line }))
  } else if (tablePolicies.length) {
    for (const policy of tablePolicies) {
      results.push(fail({ message: `${USAGE_TABLE} must stay policyless but has policy "${policy.name}"`, file: policy.file, line: policy.line }))
    }
  } else {
    results.push(pass({ message: `${USAGE_TABLE} has RLS enabled and no policies`, file: table.rlsFile, line: table.rlsLine }))
  }
  return results
}

// The limit, the day and the caller must all be out of the client's hands.
function checkCallerSurface(fn) {
  const at = { file: fn.file, line: fn.line }
  const results = []
  if (fn.params.trim()) {
    results.push(fail({ message: `${fn.name}(${fn.params}) takes arguments from the caller; the limit and the day must be fixed inside the function`, ...at }))
  }
  for (const params of fn.otherSignatures) {
    results.push(fail({ message: `${fn.name}(${params}) is still defined; drop the old signature before creating the new one`, ...at }))
  }
  const exposed = CLIENT_ROLES.filter((role) => fn.executeGrantees.has(role))
  if (exposed.length) {
    results.push(fail({ message: `${fn.name} is executable by ${exposed.join(', ')}; revoke execute so only service_role can call it`, ...at }))
  }
  return passIfEmpty(results, `${fn.name} takes no arguments and only service_role can execute it`, at)
}

function checkEdgeFunction(ctx) {
  if (!existsSync(join(ctx.root, AI_CHAT))) {
    return [fail({ message: `${AI_CHAT} not found; cannot verify the quota guard` })]
  }
  const src = blankJsComments(ctx.readFile(AI_CHAT))
  const at = (index) => ({ file: AI_CHAT, line: lineOf(src, index) })

  const rpc = new RegExp(String.raw`\.rpc\s*\(\s*(['"\`])${QUOTA_FUNCTION}\1`).exec(src)
  if (!rpc) {
    return [fail({ message: `no rpc('${QUOTA_FUNCTION}', ...) call`, file: AI_CHAT })]
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
      results.push(fail({ message: `quota is consumed after the first ${call} call (line ${lineOf(src, match.index)})`, ...at(rpc.index) }))
    }
  }

  // The guard branches must sit between the quota call and the first write/fetch.
  const guard = src.slice(rpc.index, guardEnd)
  if (!/\bif\s*\(\s*quotaError\s*\)\s*\{?\s*throw\b/.test(guard)) {
    results.push(fail({ message: 'no `if (quotaError) throw` right after the quota call', ...at(rpc.index) }))
  }
  if (!/\bif\s*\(\s*!\s*quotaOk\s*\)\s*\{?\s*return\b/.test(guard)) {
    results.push(fail({ message: 'no early `return` when `!quotaOk` right after the quota call', ...at(rpc.index) }))
  }

  return [
    ...passIfEmpty(results, 'quota is consumed and enforced before any insert or Gemini fetch', at(rpc.index)),
    ...checkFailedGeminiCall(src, at, firstInsert, firstFetch),
  ]
}

// A Gemini call that produced no reply must give the quota back and leave
// nothing saved, so nothing may be written before the Gemini fetch.
function checkFailedGeminiCall(src, at, firstInsert, firstFetch) {
  if (!firstFetch) return [fail({ message: 'no Gemini fetch( call', file: AI_CHAT })]
  const results = []
  const refund = new RegExp(String.raw`\.rpc\s*\(\s*(['"\`])${REFUND_FUNCTION}\1`).exec(src)
  if (!refund) {
    results.push(fail({ message: `no rpc('${REFUND_FUNCTION}') call to give the quota back when Gemini fails`, file: AI_CHAT }))
  } else if (refund.index < firstFetch.index) {
    results.push(fail({ message: `${REFUND_FUNCTION} is called before the Gemini fetch( (line ${lineOf(src, firstFetch.index)})`, ...at(refund.index) }))
  }
  if (firstInsert && firstInsert.index < firstFetch.index) {
    results.push(fail({ message: `writes with .insert( before the Gemini fetch( (line ${lineOf(src, firstFetch.index)}); saving must wait for Gemini's reply`, ...at(firstInsert.index) }))
  }
  return passIfEmpty(results, 'quota is refunded after a failed Gemini call and nothing is saved before Gemini replies', at(refund?.index ?? firstFetch.index))
}

export const quotaGuard = {
  id: 'quota-guard',
  title: 'Gemini quota guard',
  run: (ctx) => [...checkMigrations(ctx), ...checkEdgeFunction(ctx)],
}
