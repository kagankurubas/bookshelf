import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach } from 'vitest'

const created = []

afterEach(() => {
  while (created.length) rmSync(created.pop(), { recursive: true, force: true })
})

// Builds a throwaway git repo from { 'relative/path': content } and returns its
// root. Files listed in `untracked` are written but not `git add`ed. The repo
// is removed after the current test.
export function createFixtureRepo(files = {}, { untracked = {} } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'security-walls-'))
  created.push(root)
  const write = (entries) => {
    for (const [relativePath, content] of Object.entries(entries)) {
      const target = join(root, relativePath)
      mkdirSync(dirname(target), { recursive: true })
      writeFileSync(target, content)
    }
  }
  write(files)
  execFileSync('git', ['init', '--quiet'], { cwd: root })
  if (Object.keys(files).length) {
    execFileSync('git', ['-c', 'core.autocrlf=false', 'add', '--all'], { cwd: root })
  }
  write(untracked)
  return root
}
