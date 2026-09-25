import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { blankJsComments } from '../jsComments.js'
import { fail, pass, passIfEmpty } from '../results.js'

const AI_CHAT = 'supabase/functions/ai-chat/index.ts'
const QUOTA_FUNCTION = 'try_consume_ai_quota'
const USAGE_TABLE = 'ai_daily_usage'
const CLIENT_ROLES = ['public', 'anon', 'authenticated']

const lineOf = (src, index) => src.slice(0, index).split('\n').length

function checkMigrations(ctx) {
  const { functions, tables, policies } = ctx.migrations
  const results = []

  const fn = functions.get(QUOTA_FUNCTION)
  if (!fn) {
    results.push(fail({ message: `${QUOTA_FUNCTION} is not defined by the migrations` }))
  } else {
    const missing = [
      !fn.securityDefiner && 'security definer',
      !fn.searchPath && 'set search_path',
    ].filter(Boolean)
    results.push(
      missing.length
        ? fail({ message: `last definition of ${QUOTA_FUNCTION} lacks ${missing.join(' and ')}`, file: fn.file, line: fn.line })
        : pass({ message: `${QUOTA_FUNCTION} is security definer with a pinned search_path`, file: fn.file, line: fn.line }),
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

// The limit and the caller must both be out of the client's hands.
function checkCallerSurface(fn) {
  const at = { file: fn.file, line: fn.line }
  const results = []
  if (/\bp_max_requests\b/i.test(fn.params)) {
    results.push(fail({ message: `${QUOTA_FUNCTION} takes p_max_requests from the caller; the limit must be fixed inside the function`, ...at }))
  }
  for (const params of fn.otherSignatures) {
    results.push(fail({ message: `${QUOTA_FUNCTION}(${params}) is still defined; drop the old signature before creating the new one`, ...at }))
  }
  const exposed = CLIENT_ROLES.filter((role) => fn.executeGrantees.has(role))
  if (exposed.length) {
    results.push(fail({ message: `${QUOTA_FUNCTION} is executable by ${exposed.join(', ')}; revoke execute so only service_role can call it`, ...at }))
  }
  return passIfEmpty(results, `${QUOTA_FUNCTION} takes no limit from the caller and only service_role can execute it`, at)
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

  return passIfEmpty(results, 'quota is consumed and enforced before any insert or Gemini fetch', at(rpc.index))
}

export const quotaGuard = {
  id: 'quota-guard',
  title: 'Gemini quota guard',
  run: (ctx) => [...checkMigrations(ctx), ...checkEdgeFunction(ctx)],
}
