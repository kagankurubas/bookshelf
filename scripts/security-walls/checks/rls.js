// Wall 1: RLS and security definer, judged on the final state of the
// migrations (not schema.sql).

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
// expressions must reference. Wall 4 compares production pg_policies to this.
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
    return [{ status: 'fail', message: 'no migration files found; the RLS wall cannot see the schema' }]
  }
  const results = []
  const fail = (message, file, line) => results.push({ status: 'fail', message, file, line })

  for (const statement of migrations.statements) {
    const match = ALTER_BLIND_SPOT.exec(statement.text)
    if (match) {
      fail(`alter ${match[1].toLowerCase()} is not understood by this wall; use drop + create instead`, statement.file, statement.line)
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
      fail(`table ${table.name} does not have row level security enabled`, table.rlsFile ?? table.file, table.rlsLine ?? table.line)
      continue
    }
    const policies = policiesByTable.get(table.name) ?? []
    if (policies.length === 0 && !policyless.has(table.name)) {
      fail(`table ${table.name} has RLS enabled but no policies and is not in exceptions.policylessTables`, table.file, table.line)
    }
    if (policies.length > 0 && policyless.has(table.name)) {
      fail(`table ${table.name} is in exceptions.policylessTables but has policies`, policies[0].file, policies[0].line)
    }
    for (const policy of policies) {
      for (const problem of policyProblems(policy)) {
        fail(`policy "${policy.name}" on ${policy.table}: ${problem}`, policy.file, policy.line)
      }
    }
  }

  for (const table of policiesByTable.keys()) {
    if (!migrations.tables.has(table)) {
      const policy = policiesByTable.get(table)[0]
      fail(`policy "${policy.name}" is on ${table}, which no migration creates`, policy.file, policy.line)
    }
  }
  for (const { table } of [...exceptions.ownershipChains, ...exceptions.policylessTables]) {
    if (!migrations.tables.has(table)) {
      fail(`exceptions refer to table ${table}, which no migration creates`, 'scripts/security-walls/exceptions.js')
    }
  }

  const allowedDefiners = new Set(exceptions.securityDefinerFunctions.map((entry) => entry.name))
  for (const fn of migrations.functions.values()) {
    if (!fn.securityDefiner) continue
    if (!fn.searchPath) fail(`security definer function ${fn.name} does not set search_path`, fn.file, fn.line)
    if (!allowedDefiners.has(fn.name)) {
      fail(`security definer function ${fn.name} is not in exceptions.securityDefinerFunctions`, fn.file, fn.line)
    }
  }
  for (const name of allowedDefiners) {
    if (!migrations.functions.get(name)?.securityDefiner) {
      fail(`exceptions allow security definer function ${name}, which no migration defines as security definer`, 'scripts/security-walls/exceptions.js')
    }
  }

  if (results.length === 0) {
    const definers = [...migrations.functions.values()].filter((fn) => fn.securityDefiner).length
    results.push({
      status: 'pass',
      message: `${migrations.tables.size} tables, ${migrations.policies.size} policies, ${definers} security definer functions checked`,
    })
  }
  return results
}

export const rlsCheck = {
  id: 'rls',
  title: 'Wall 1: RLS and security definer',
  run,
}
