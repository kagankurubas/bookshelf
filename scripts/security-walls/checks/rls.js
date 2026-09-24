// RLS and security definer wall, judged on the final state of the
// migrations (not schema.sql).

import { fail, passIfEmpty } from '../results.js'

const AUTH_UID = /\bauth\s*\.\s*uid\s*\(\s*\)/i
const ALTER_BLIND_SPOT = /^alter\s+(policy|function|routine)\b/i

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export function referencesAuthUid(expression) {
  return typeof expression === 'string' && AUTH_UID.test(expression)
}

// True if `expression` reads from `table` (e.g. `from books b`, `join public.books`).
export function referencesTable(expression, table) {
  if (typeof expression !== 'string') return false
  const name = escapeRegExp(table)
  return new RegExp(String.raw`\b(?:from|join)\s+(?:"?public"?\s*\.\s*)?"?${name}"?(?![\w$])`, 'i').test(expression)
}

// The policy set the migrations leave behind, each with the parent tables its
// expressions must reference. The production migration history wall compares
// production pg_policies to this.
// Shape: [{ table, name, command, using, withCheck, parents, file, line }]
export function expectedPolicies({ migrations, exceptions }) {
  const parentsByTable = new Map(exceptions.ownershipChains.map((chain) => [chain.table, chain.parents]))
  return [...migrations.policies.values()].map((policy) => ({
    table: policy.table,
    name: policy.name,
    command: policy.command,
    using: policy.using,
    withCheck: policy.withCheck,
    parents: parentsByTable.get(policy.table) ?? [],
    file: policy.file,
    line: policy.line,
  }))
}

// Problems with one policy's expressions: missing auth.uid() or a missing
// expected parent table, checked in every expression the policy has.
export function policyProblems(policy) {
  const expressions = [
    ['using', policy.using],
    ['with check', policy.withCheck],
  ].filter(([, expression]) => expression != null)
  if (expressions.length === 0) return ['has neither a using nor a with check expression']
  const problems = []
  for (const [label, expression] of expressions) {
    if (!referencesAuthUid(expression)) problems.push(`${label} expression does not reference auth.uid()`)
    for (const parent of policy.parents) {
      if (!referencesTable(expression, parent)) problems.push(`${label} expression does not reference parent table ${parent}`)
    }
  }
  return problems
}

function run(ctx) {
  const { migrations, exceptions } = ctx
  if (migrations.files.length === 0) {
    return [fail({ message: 'no migration files found; the RLS wall cannot see the schema' })]
  }
  const results = []

  for (const statement of migrations.statements) {
    const match = ALTER_BLIND_SPOT.exec(statement.text)
    if (match) {
      results.push(fail({ message: `alter ${match[1].toLowerCase()} is not understood by this wall; use drop + create instead`, file: statement.file, line: statement.line }))
    }
  }

  const policyless = new Set(exceptions.policylessTables.map((entry) => entry.table))
  const policiesByTable = new Map()
  for (const policy of expectedPolicies(ctx)) {
    if (!policiesByTable.has(policy.table)) policiesByTable.set(policy.table, [])
    policiesByTable.get(policy.table).push(policy)
  }

  for (const table of migrations.tables.values()) {
    if (!table.rls) {
      results.push(fail({ message: `table ${table.name} does not have row level security enabled`, file: table.rlsFile ?? table.file, line: table.rlsLine ?? table.line }))
      continue
    }
    const policies = policiesByTable.get(table.name) ?? []
    if (policies.length === 0 && !policyless.has(table.name)) {
      results.push(fail({ message: `table ${table.name} has RLS enabled but no policies and is not in exceptions.policylessTables`, file: table.file, line: table.line }))
    }
    if (policies.length > 0 && policyless.has(table.name)) {
      results.push(fail({ message: `table ${table.name} is in exceptions.policylessTables but has policies`, file: policies[0].file, line: policies[0].line }))
    }
    for (const policy of policies) {
      for (const problem of policyProblems(policy)) {
        results.push(fail({ message: `policy "${policy.name}" on ${policy.table}: ${problem}`, file: policy.file, line: policy.line }))
      }
    }
  }

  for (const table of policiesByTable.keys()) {
    if (!migrations.tables.has(table)) {
      const policy = policiesByTable.get(table)[0]
      results.push(fail({ message: `policy "${policy.name}" is on ${table}, which no migration creates`, file: policy.file, line: policy.line }))
    }
  }
  for (const { table } of [...exceptions.ownershipChains, ...exceptions.policylessTables]) {
    if (!migrations.tables.has(table)) {
      results.push(fail({ message: `exceptions refer to table ${table}, which no migration creates`, file: 'scripts/security-walls/exceptions.js' }))
    }
  }

  const allowedDefiners = new Set(exceptions.securityDefinerFunctions.map((entry) => entry.name))
  for (const fn of migrations.functions.values()) {
    if (!fn.securityDefiner) continue
    if (!fn.searchPath) results.push(fail({ message: `security definer function ${fn.name} does not set search_path`, file: fn.file, line: fn.line }))
    if (!allowedDefiners.has(fn.name)) {
      results.push(fail({ message: `security definer function ${fn.name} is not in exceptions.securityDefinerFunctions`, file: fn.file, line: fn.line }))
    }
  }
  for (const name of allowedDefiners) {
    if (!migrations.functions.get(name)?.securityDefiner) {
      results.push(fail({ message: `exceptions allow security definer function ${name}, which no migration defines as security definer`, file: 'scripts/security-walls/exceptions.js' }))
    }
  }

  const definers = [...migrations.functions.values()].filter((fn) => fn.securityDefiner).length
  return passIfEmpty(results, `${migrations.tables.size} tables, ${migrations.policies.size} policies, ${definers} security definer functions checked`)
}

export const rlsCheck = {
  id: 'rls',
  title: 'RLS and security definer',
  run,
}
