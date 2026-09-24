import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { runChecks } from './index.js'

const USAGE = 'Usage: npm run check:security [-- [--linked] [--root <path>]]'

export function parseArgs(argv) {
  const options = { root: process.cwd(), linked: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--linked') options.linked = true
    else if (arg === '--root' && argv[i + 1]) options.root = resolve(argv[++i])
    else throw new Error(`Unknown argument: ${arg}\n${USAGE}`)
  }
  return options
}

function groupStatus(results) {
  if (results.some((r) => r.status === 'fail')) return 'FAIL'
  if (results.some((r) => r.status === 'pass')) return 'PASS'
  return 'SKIP'
}

export function formatResults(results) {
  const groups = new Map()
  for (const result of results) {
    if (!groups.has(result.check)) groups.set(result.check, { title: result.title, results: [] })
    groups.get(result.check).results.push(result)
  }

  const lines = []
  if (groups.size === 0) lines.push('No security walls registered.')
  for (const { title, results: groupResults } of groups.values()) {
    lines.push(`[${groupStatus(groupResults)}] ${title}`)
    for (const r of groupResults) {
      const location = r.file ? ` ${r.file}${r.line ? `:${r.line}` : ''} -` : ''
      lines.push(`  ${r.status.toUpperCase().padEnd(4)}${location} ${r.message}`)
    }
  }
  const count = (status) => results.filter((r) => r.status === status).length
  lines.push('', `${count('pass')} passed, ${count('fail')} failed, ${count('skip')} skipped`)
  return lines.join('\n')
}

// Returns the process exit code: 1 if any result failed, 2 on bad arguments.
export async function main(argv, { write = (text) => process.stdout.write(text), checks } = {}) {
  let options
  try {
    options = parseArgs(argv)
  } catch (error) {
    write(`${error.message}\n`)
    return 2
  }
  const results = await runChecks({ ...options, ...(checks ? { checks } : {}) })
  write(`${formatResults(results)}\n`)
  return results.some((r) => r.status === 'fail') ? 1 : 0
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2))
}
