import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { checks as registeredChecks } from './registry.js'
import { exceptions as configuredExceptions } from './exceptions.js'
import { readMigrations } from './migrations.js'

const STATUSES = new Set(['pass', 'fail', 'skip'])

function lazy(compute) {
  let cached
  let done = false
  return () => {
    if (!done) {
      cached = compute()
      done = true
    }
    return cached
  }
}

// Shared, lazily computed inputs for every check. A failure computing one of
// them surfaces as a FAIL of the checks that use it.
export function createContext({ root, linked = false, exceptions = configuredExceptions }) {
  const absoluteRoot = resolve(root)
  const trackedFiles = lazy(() =>
    execFileSync('git', ['ls-files', '-z'], { cwd: absoluteRoot, encoding: 'utf8' })
      .split('\0')
      .filter(Boolean),
  )
  const migrations = lazy(() => readMigrations(absoluteRoot))
  return {
    root: absoluteRoot,
    linked,
    exceptions,
    get trackedFiles() {
      return trackedFiles()
    },
    get migrations() {
      return migrations()
    },
    readFile(relativePath) {
      return readFileSync(join(absoluteRoot, relativePath), 'utf8')
    },
  }
}

function exceptionProblems(exceptions) {
  const problems = []
  for (const [list, entries] of Object.entries(exceptions)) {
    entries.forEach((entry, index) => {
      if (typeof entry?.reason !== 'string' || !entry.reason.trim()) {
        problems.push(`exceptions.${list}[${index}] has no reason`)
      }
    })
  }
  return problems
}

function normalizeResult(result) {
  if (!result || !STATUSES.has(result.status) || typeof result.message !== 'string') {
    return { status: 'fail', message: `check returned a malformed result: ${JSON.stringify(result)}` }
  }
  const normalized = { status: result.status, message: result.message }
  if (result.file) normalized.file = result.file
  if (result.line) normalized.line = result.line
  return normalized
}

// Runs every registered check against `root` and returns one flat result list;
// each result carries its check's id and title.
export async function runChecks({ root, linked = false, checks = registeredChecks, exceptions = configuredExceptions }) {
  const ctx = createContext({ root, linked, exceptions })
  const results = exceptionProblems(exceptions).map((message) => ({
    check: 'exceptions',
    title: 'Exceptions config',
    status: 'fail',
    message,
    file: 'scripts/security-walls/exceptions.js',
  }))

  for (const check of checks) {
    let checkResults
    try {
      checkResults = await check.run(ctx)
    } catch (error) {
      checkResults = [{ status: 'fail', message: `check threw: ${error?.message ?? error}` }]
    }
    if (!Array.isArray(checkResults) || checkResults.length === 0) {
      checkResults = [{ status: 'fail', message: 'check returned no results' }]
    }
    for (const result of checkResults) {
      results.push({ check: check.id, title: check.title, ...normalizeResult(result) })
    }
  }
  return results
}
