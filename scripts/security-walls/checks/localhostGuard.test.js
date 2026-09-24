import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { runChecks } from '../index.js'
import { createFixtureRepo } from '../test/fixtureRepo.js'
import { CONFIG_FILE, GUARD_FILE, localhostGuard } from './localhostGuard.js'

const repoRoot = new URL('../../../', import.meta.url)
const realGuard = readFileSync(new URL(GUARD_FILE, repoRoot), 'utf8')
const realConfig = readFileSync(new URL(CONFIG_FILE, repoRoot), 'utf8')

const run = async (files) => runChecks({ root: createFixtureRepo(files), checks: [localhostGuard] })
const failures = (results) => results.filter((r) => r.status === 'fail')

describe('localhost guard wall', () => {
  it('passes on a copy of the real guard and config', async () => {
    const results = await run({ [GUARD_FILE]: realGuard, [CONFIG_FILE]: realConfig })
    expect(failures(results)).toEqual([])
    expect(results).toHaveLength(3)
  })

  it('ignores a .env.test.local pointing at a remote project', async () => {
    // The guard reads .env.test.local from cwd; if the check ran it from the
    // fixture root, this file would make the 127.0.0.1 run exit 1.
    const results = await run({
      [GUARD_FILE]: realGuard,
      [CONFIG_FILE]: realConfig,
      '.env.test.local': 'SUPABASE_URL=https://example.supabase.co\n',
    })
    expect(failures(results)).toEqual([])
  })

  it('fails when the localhost check is removed from the guard', async () => {
    const hostCheck = /\r?\n {2}const allowedHosts[\s\S]*?\r?\n {2}}\r?\n/
    expect(realGuard).toMatch(hostCheck)
    const results = await run({ [GUARD_FILE]: realGuard.replace(hostCheck, '\n'), [CONFIG_FILE]: realConfig })
    expect(failures(results)).toEqual([
      expect.objectContaining({ file: GUARD_FILE, message: expect.stringContaining('expected exit 1') }),
    ])
  })

  it('fails when the guard rejects 127.0.0.1', async () => {
    const results = await run({
      [GUARD_FILE]: realGuard.replace("new Set(['localhost', '127.0.0.1'])", "new Set(['localhost'])"),
      [CONFIG_FILE]: realConfig,
    })
    expect(failures(results)).toEqual([
      expect.objectContaining({ file: GUARD_FILE, message: expect.stringContaining('expected exit 0') }),
    ])
  })

  it('fails when the guard crashes instead of exiting 1', async () => {
    const results = await run({
      [GUARD_FILE]: "export default function globalSetup() { throw new Error('boom') }\n",
      [CONFIG_FILE]: realConfig,
    })
    expect(failures(results).map((r) => r.message)).toEqual([
      expect.stringContaining('got 3'),
      expect.stringContaining('got 3'),
    ])
  })

  it('fails, not skips, when the guard file is missing', async () => {
    const results = await run({ [CONFIG_FILE]: realConfig })
    expect(failures(results)).toEqual([expect.objectContaining({ file: GUARD_FILE, message: 'guard file is missing' })])
  })

  it('fails when the config no longer references the guard as globalSetup', async () => {
    const withoutGlobalSetup = realConfig.replace(/^\s*globalSetup:.*\r?\n/m, '')
    expect(withoutGlobalSetup).not.toContain('globalSetup:')
    const commentedOut = realConfig.replace(/^(\s*)(globalSetup:.*)$/m, '$1// $2')

    for (const config of [withoutGlobalSetup, commentedOut]) {
      const results = await run({ [GUARD_FILE]: realGuard, [CONFIG_FILE]: config })
      expect(failures(results)).toEqual([expect.objectContaining({ file: CONFIG_FILE })])
    }
  })
})
