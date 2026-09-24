import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { runChecks } from '../index.js'
import { leakage } from './leakage.js'
import { createFixtureRepo } from '../test/fixtureRepo.js'

const repoRoot = fileURLToPath(new URL('../../..', import.meta.url))

// Fake secrets are assembled at runtime so this file never trips the wall itself.
const fakeRef = 'q'.repeat(20)
const fakeJwt = (payload) =>
  [{ alg: 'HS256', typ: 'JWT' }, payload]
    .map((part) => Buffer.from(JSON.stringify(part)).toString('base64url'))
    .concat('signature')
    .join('.')

const cleanRepo = {
  '.gitignore': '.env\n*.local\nsupabase/.temp/\ndist\n',
  '.env.example': '# Fill in locally\nVITE_SUPABASE_URL=\nVITE_SUPABASE_ANON_KEY=\n',
  'README.md': 'Create a project at https://<ref>.supabase.co and see https://supabase.com\n',
}

async function run(files = {}, untracked = {}) {
  const root = createFixtureRepo({ ...cleanRepo, ...files }, { untracked })
  return runChecks({ root, checks: [leakage] })
}

const failures = (results) => results.filter((r) => r.status === 'fail')

describe('leakage wall', () => {
  it('passes a clean repo and skips sub-checks without inputs', async () => {
    const results = await run()
    expect(failures(results)).toEqual([])
    expect(results.filter((r) => r.status === 'skip').map((r) => r.message)).toEqual([
      expect.stringContaining('project-ref'),
      expect.stringContaining('build output'),
    ])
  })

  it.each([
    ['a Supabase project URL', `const url = 'https://${fakeRef}.supabase` + `.co'`, 'Supabase project URL'],
    ['a Supabase secret key', `KEY=${'sb_' + 'secret_'}${'k'.repeat(24)}`, 'sb_secret_'],
    ['a Gemini key', `KEY=${'AI' + 'za'}${'g'.repeat(35)}`, 'Gemini'],
    ['an Anthropic key', `KEY=${'sk-' + 'ant-'}${'a'.repeat(40)}`, 'Anthropic'],
    ['a service_role JWT', `KEY=${fakeJwt({ iss: 'supabase', role: 'service_role' })}`, 'service_role JWT'],
    ['an anon JWT', `KEY=${fakeJwt({ iss: 'supabase', role: 'anon' })}`, 'anon JWT'],
  ])('fails on %s in a tracked file with file:line', async (_, line, kind) => {
    const results = await run({ 'src/config.js': `// config\n${line}\n` })
    expect(failures(results)).toEqual([
      expect.objectContaining({ file: 'src/config.js', line: 2, message: expect.stringContaining(kind) }),
    ])
    expect(failures(results)[0].message).not.toContain(line.split('=').pop())
  })

  it('allows local demo JWTs', async () => {
    const results = await run({
      'supabase/seed.env': `ANON=${fakeJwt({ iss: 'supabase-demo', role: 'anon' })}\nSERVICE=${fakeJwt({ iss: 'supabase-demo', role: 'service_role' })}\n`,
    })
    expect(failures(results)).toEqual([])
  })

  it('fails on a service_role JWT in build output but allows an anon one there', async () => {
    const results = await run({}, {
      'dist/assets/index.js': `const a="${fakeJwt({ iss: 'supabase', role: 'anon' })}";\nconst s="${fakeJwt({ iss: 'supabase', role: 'service_role' })}";`,
    })
    expect(failures(results)).toEqual([
      expect.objectContaining({ file: 'dist/assets/index.js', line: 2, message: expect.stringContaining('service_role') }),
    ])
  })

  it('searches tracked files for the production ref from the Supabase CLI link data', async () => {
    const results = await run(
      { 'docs/notes.md': `Dashboard: project ${fakeRef}\n` },
      { 'supabase/.temp/project-ref': `${fakeRef}\n` },
    )
    expect(failures(results)).toEqual([
      expect.objectContaining({ file: 'docs/notes.md', line: 1, message: expect.stringContaining('project ref') }),
    ])
  })

  it('passes the production ref search when the ref is only in ignored files', async () => {
    const results = await run({}, { 'supabase/.temp/project-ref': fakeRef, '.env': `REF=${fakeRef}` })
    expect(failures(results)).toEqual([])
    expect(results).toContainEqual(expect.objectContaining({ status: 'pass', message: expect.stringContaining('project ref') }))
  })

  it.each([
    ['.env', { '.gitignore': '*.local\nsupabase/.temp/\n' }],
    ['.env.test.local', { '.gitignore': '.env\nsupabase/.temp/\n' }],
    ['supabase/.temp/', { '.gitignore': '.env\n*.local\n' }],
  ])('fails when %s is not git-ignored', async (path, files) => {
    const results = await run(files)
    expect(failures(results)).toEqual([expect.objectContaining({ message: expect.stringContaining(`${path} is not ignored`) })])
  })

  it('fails when a sensitive file is tracked despite .gitignore', async () => {
    const root = createFixtureRepo(cleanRepo, { untracked: { '.env.test.local': 'X=\n' } })
    execFileSync('git', ['-c', 'core.autocrlf=false', 'add', '--force', '.env.test.local'], { cwd: root })
    const results = await runChecks({ root, checks: [leakage] })
    expect(failures(results)).toEqual([
      expect.objectContaining({ file: '.env.test.local', message: expect.stringContaining('must not be tracked') }),
    ])
  })

  it('fails on a non-empty value in .env.example', async () => {
    const results = await run({ '.env.example': 'VITE_SUPABASE_URL=\nVITE_SUPABASE_ANON_KEY="filled-in"\n' })
    expect(failures(results)).toEqual([
      expect.objectContaining({ file: '.env.example', line: 2, message: expect.stringContaining('VITE_SUPABASE_ANON_KEY') }),
    ])
  })

  it('passes on the real repository', async () => {
    const results = await runChecks({ root: repoRoot, checks: [leakage] })
    expect(failures(results)).toEqual([])
  })
})
