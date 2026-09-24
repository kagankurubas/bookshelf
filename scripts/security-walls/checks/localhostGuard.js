import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { blankJsComments } from '../jsComments.js'
import { fail, pass } from '../results.js'

export const GUARD_FILE = 'tests/integration/globalSetup.js'
export const CONFIG_FILE = 'vitest.integration.config.js'

const RUNNER = fileURLToPath(new URL('./localhostGuardRunner.js', import.meta.url))
const REMOTE_URL = 'https://example.supabase.co'
const LOCAL_URL = 'http://127.0.0.1:54321'

// Runs the guard in a separate process whose cwd is an empty temp dir, so a
// developer's .env.test.local can't override the SUPABASE_URL under test.
function runGuard(guardPath, supabaseUrl) {
  const cwd = mkdtempSync(join(tmpdir(), 'security-walls-guard-'))
  try {
    const child = spawnSync(process.execPath, [RUNNER, guardPath], {
      cwd,
      env: { ...process.env, SUPABASE_URL: supabaseUrl },
      encoding: 'utf8',
      timeout: 30000,
    })
    const output = `${child.stderr ?? ''}${child.error?.message ?? ''}`.trim().split('\n').pop()
    return { code: child.status, output }
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
}

function referencesGuard(configSource) {
  const match = /\bglobalSetup\s*:\s*(\[[^\]]*\]|(['"`])[^'"`]*\2)/.exec(blankJsComments(configSource))
  if (!match) return false
  const paths = match[1].match(/(['"`])[^'"`]*\1/g) ?? []
  return paths.some((quoted) => quoted.slice(1, -1).replace(/^\.\//, '') === GUARD_FILE)
}

export const localhostGuard = {
  id: 'localhost-guard',
  title: 'Integration test localhost guard',
  run(ctx) {
    const results = []
    const guardPath = join(ctx.root, GUARD_FILE)

    if (!existsSync(guardPath)) {
      results.push(fail({ message: 'guard file is missing', file: GUARD_FILE }))
    } else {
      const remote = runGuard(guardPath, REMOTE_URL)
      results.push(
        remote.code === 1
          ? pass({ message: `stops with exit 1 for ${REMOTE_URL}`, file: GUARD_FILE })
          : fail({
              message: `expected exit 1 for ${REMOTE_URL}, got ${remote.code}${remote.output ? `: ${remote.output}` : ''}`,
              file: GUARD_FILE,
            }),
      )
      const local = runGuard(guardPath, LOCAL_URL)
      results.push(
        local.code === 0
          ? pass({ message: `lets ${LOCAL_URL} through`, file: GUARD_FILE })
          : fail({
              message: `expected exit 0 for ${LOCAL_URL}, got ${local.code}${local.output ? `: ${local.output}` : ''}`,
              file: GUARD_FILE,
            }),
      )
    }

    if (!existsSync(join(ctx.root, CONFIG_FILE))) {
      results.push(fail({ message: 'integration Vitest config is missing', file: CONFIG_FILE }))
    } else if (referencesGuard(ctx.readFile(CONFIG_FILE))) {
      results.push(pass({ message: `uses ${GUARD_FILE} as globalSetup`, file: CONFIG_FILE }))
    } else {
      results.push(fail({ message: `does not reference ${GUARD_FILE} as globalSetup`, file: CONFIG_FILE }))
    }
    return results
  },
}
