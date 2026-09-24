import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

export const MIGRATIONS_DIR = 'supabase/migrations'

// Replaces SQL comments with spaces (keeping newlines) so offsets and line
// numbers still match the original file.
function blankComments(sql) {
  let out = ''
  let i = 0
  while (i < sql.length) {
    const ch = sql[i]
    const next = sql[i + 1]
    if (ch === '-' && next === '-') {
      while (i < sql.length && sql[i] !== '\n') {
        out += ' '
        i++
      }
    } else if (ch === '/' && next === '*') {
      let depth = 0
      do {
        if (sql[i] === '/' && sql[i + 1] === '*') {
          depth++
          out += '  '
          i += 2
        } else if (sql[i] === '*' && sql[i + 1] === '/') {
          depth--
          out += '  '
          i += 2
        } else {
          out += sql[i] === '\n' ? '\n' : ' '
          i++
        }
      } while (depth > 0 && i < sql.length)
    } else if (ch === "'" || ch === '"') {
      const end = skipQuoted(sql, i)
      out += sql.slice(i, end)
      i = end
    } else if (ch === '$') {
      const end = skipDollarQuoted(sql, i)
      out += sql.slice(i, end)
      i = end
    } else {
      out += ch
      i++
    }
  }
  return out
}

function skipQuoted(sql, start) {
  const quote = sql[start]
  let i = start + 1
  while (i < sql.length) {
    if (sql[i] === quote) {
      if (sql[i + 1] === quote) {
        i += 2
        continue
      }
      return i + 1
    }
    i++
  }
  return i
}

// Returns the index after a $tag$...$tag$ block, or start + 1 if `$` does
// not open one (e.g. a positional parameter like $1).
function skipDollarQuoted(sql, start) {
  const match = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(start))
  if (!match) return start + 1
  const tag = match[0]
  const close = sql.indexOf(tag, start + tag.length)
  return close === -1 ? sql.length : close + tag.length
}

// Splits comment-free SQL into top-level statements with 1-based start lines.
function splitStatements(sql) {
  const statements = []
  let start = 0
  let i = 0
  const push = (end) => {
    const raw = sql.slice(start, end)
    const text = raw.trim()
    if (text) {
      const lead = raw.length - raw.trimStart().length
      const line = sql.slice(0, start + lead).split('\n').length
      statements.push({ text, line })
    }
  }
  while (i < sql.length) {
    const ch = sql[i]
    if (ch === "'" || ch === '"') i = skipQuoted(sql, i)
    else if (ch === '$') i = skipDollarQuoted(sql, i)
    else if (ch === ';') {
      push(i)
      i++
      start = i
    } else i++
  }
  push(sql.length)
  return statements
}

// Given the index of an opening paren, returns the text inside it and the
// index after its matching close paren.
function balancedParens(text, open) {
  let depth = 0
  let i = open
  while (i < text.length) {
    const ch = text[i]
    if (ch === "'" || ch === '"') {
      i = skipQuoted(text, i)
      continue
    }
    if (ch === '$') {
      i = skipDollarQuoted(text, i)
      continue
    }
    if (ch === '(') depth++
    else if (ch === ')') {
      depth--
      if (depth === 0) return { inner: text.slice(open + 1, i).trim(), end: i + 1 }
    }
    i++
  }
  return { inner: text.slice(open + 1).trim(), end: text.length }
}

// Strips quotes, lowercases unquoted names and drops a `public.` prefix.
function normalizeName(raw) {
  const parts = raw.match(/"(?:[^"]|"")*"|[^.]+/g) ?? [raw]
  const names = parts.map((part) =>
    part.startsWith('"') ? part.slice(1, -1).replace(/""/g, '"') : part.toLowerCase(),
  )
  if (names.length > 1 && names[0] === 'public') names.shift()
  return names.join('.')
}

// Removes dollar-quoted bodies, leaving the function's header/options.
function stripDollarBodies(text) {
  let out = ''
  let i = 0
  while (i < text.length) {
    if (text[i] === '$') {
      const end = skipDollarQuoted(text, i)
      if (end > i + 1) {
        out += ' '
        i = end
        continue
      }
    } else if (text[i] === "'") {
      const end = skipQuoted(text, i)
      out += text.slice(i, end)
      i = end
      continue
    }
    out += text[i]
    i++
  }
  return out
}

const NAME = String.raw`((?:"(?:[^"]|"")*"|[A-Za-z_][\w$]*)(?:\.(?:"(?:[^"]|"")*"|[A-Za-z_][\w$]*))?)`

const patterns = {
  createTable: new RegExp(String.raw`^create\s+(?:(?:global\s+|local\s+)?(?:temporary|temp|unlogged)\s+)?table\s+(?:if\s+not\s+exists\s+)?${NAME}`, 'i'),
  dropTable: /^drop\s+table\s+(?:if\s+exists\s+)?(.+?)(?:\s+(?:cascade|restrict))?$/is,
  alterRls: new RegExp(String.raw`^alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?${NAME}\s+(enable|disable)\s+row\s+level\s+security`, 'i'),
  createPolicy: new RegExp(String.raw`^create\s+policy\s+${NAME}\s+on\s+${NAME}`, 'i'),
  dropPolicy: new RegExp(String.raw`^drop\s+policy\s+(?:if\s+exists\s+)?${NAME}\s+on\s+${NAME}`, 'i'),
  createFunction: new RegExp(String.raw`^create\s+(?:or\s+replace\s+)?function\s+${NAME}\s*\(`, 'i'),
  dropFunction: /^drop\s+function\s+(?:if\s+exists\s+)?(.+?)(?:\s+(?:cascade|restrict))?$/is,
}

function parsePolicy(statement, match, file) {
  const rest = statement.text.slice(match[0].length)
  const command = /\bfor\s+(all|select|insert|update|delete)\b/i.exec(rest)?.[1].toLowerCase() ?? 'all'
  let using = null
  let withCheck = null
  let searchFrom = 0
  const usingMatch = /\busing\s*\(/i.exec(rest)
  if (usingMatch) {
    const parsed = balancedParens(rest, usingMatch.index + usingMatch[0].length - 1)
    using = parsed.inner
    searchFrom = parsed.end
  }
  const checkMatch = /\bwith\s+check\s*\(/i.exec(rest.slice(searchFrom))
  if (checkMatch) {
    withCheck = balancedParens(rest, searchFrom + checkMatch.index + checkMatch[0].length - 1).inner
  }
  return {
    name: normalizeName(match[1]),
    table: normalizeName(match[2]),
    command,
    using,
    withCheck,
    file,
    line: statement.line,
  }
}

function parseFunction(statement, match, file) {
  const header = stripDollarBodies(statement.text)
  return {
    name: normalizeName(match[1]),
    securityDefiner: /\bsecurity\s+definer\b/i.test(header),
    searchPath: /\bset\s+search_path\b/i.test(header),
    definition: statement.text,
    file,
    line: statement.line,
  }
}

function splitNameList(list) {
  const names = []
  let depth = 0
  let current = ''
  for (const ch of list) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ',' && depth === 0) {
      names.push(current)
      current = ''
    } else current += ch
  }
  names.push(current)
  return names.map((n) => n.replace(/\(.*$/s, '').trim()).filter(Boolean).map(normalizeName)
}

export function listMigrationFiles(root) {
  const dir = join(root, MIGRATIONS_DIR)
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((name) => name.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))
    .map((name) => `${MIGRATIONS_DIR}/${name}`)
}

// Applies every migration in order and returns the final state of tables,
// policies and functions. Functions are keyed by name only (overloads are
// not distinguished). Each entry records the file/line that last defined it.
export function readMigrations(root) {
  const files = listMigrationFiles(root)
  const tables = new Map()
  const policies = new Map()
  const functions = new Map()
  const statements = []

  for (const file of files) {
    const sql = blankComments(readFileSync(join(root, file), 'utf8'))
    for (const statement of splitStatements(sql)) {
      statements.push({ ...statement, file })
      const { text } = statement
      let m
      if ((m = patterns.createTable.exec(text))) {
        const name = normalizeName(m[1])
        if (!tables.has(name)) {
          tables.set(name, { name, file, line: statement.line, rls: false, rlsFile: null, rlsLine: null })
        }
      } else if ((m = patterns.dropTable.exec(text))) {
        for (const name of splitNameList(m[1])) {
          tables.delete(name)
          for (const [key, policy] of policies) if (policy.table === name) policies.delete(key)
        }
      } else if ((m = patterns.alterRls.exec(text))) {
        const table = tables.get(normalizeName(m[1]))
        if (table) {
          table.rls = m[2].toLowerCase() === 'enable'
          table.rlsFile = file
          table.rlsLine = statement.line
        }
      } else if ((m = patterns.createPolicy.exec(text))) {
        const policy = parsePolicy(statement, m, file)
        policies.set(`${policy.table}:${policy.name}`, policy)
      } else if ((m = patterns.dropPolicy.exec(text))) {
        policies.delete(`${normalizeName(m[2])}:${normalizeName(m[1])}`)
      } else if ((m = patterns.createFunction.exec(text))) {
        const fn = parseFunction(statement, m, file)
        functions.set(fn.name, fn)
      } else if ((m = patterns.dropFunction.exec(text))) {
        for (const name of splitNameList(m[1])) functions.delete(name)
      }
    }
  }

  return { files, tables, policies, functions, statements }
}
