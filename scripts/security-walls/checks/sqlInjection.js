import * as espree from 'espree'

const SCANNED_DIRS = ['src/', 'supabase/functions/']
const CODE_FILE = /\.(?:[cm]?js|jsx|[cm]?ts|tsx)$/
const TEST_FILE = /\.test\.[^/]+$/
const RAW_SQL_PACKAGES = new Set(['pg', 'postgres', 'postgresjs'])
const FILTER_STRING_METHODS = new Set(['or', 'not', 'textSearch'])

function isScannedFile(path) {
  return SCANNED_DIRS.some((dir) => path.startsWith(dir)) && CODE_FILE.test(path) && !TEST_FILE.test(path)
}

// Visits every AST node depth-first.
function walk(node, visit) {
  visit(node)
  for (const key of espree.VisitorKeys[node.type] ?? []) {
    const child = node[key]
    if (Array.isArray(child)) child.forEach((c) => c && walk(c, visit))
    else if (child) walk(child, visit)
  }
}

function methodName(callee) {
  if (callee?.type !== 'MemberExpression') return null
  if (!callee.computed && callee.property.type === 'Identifier') return callee.property.name
  if (callee.property.type === 'Literal' && typeof callee.property.value === 'string') return callee.property.value
  return null
}

function isDynamicString(node) {
  if (!node) return false
  if (node.type === 'TemplateLiteral') return node.expressions.length > 0
  return node.type === 'BinaryExpression' && node.operator === '+'
}

// Matches bare names ('pg', 'npm:postgres@3') and URL imports
// ('https://deno.land/x/postgres@v0.17.0/mod.ts').
function isRawSqlModule(source) {
  if (typeof source !== 'string') return false
  return source
    .replace(/^(?:npm|jsr|node):/, '')
    .split('/')
    .some((segment) => RAW_SQL_PACKAGES.has(segment.replace(/@.*$/, '')))
}

function moduleSource(node) {
  switch (node.type) {
    case 'ImportDeclaration':
    case 'ExportAllDeclaration':
    case 'ExportNamedDeclaration':
    case 'ImportExpression':
      return node.source?.value
    case 'CallExpression':
      return node.callee.type === 'Identifier' && node.callee.name === 'require' ? node.arguments[0]?.value : undefined
    default:
      return undefined
  }
}

function scanCode(file, code) {
  let ast
  try {
    ast = espree.parse(code, {
      ecmaVersion: 'latest',
      sourceType: 'module',
      loc: true,
      ecmaFeatures: { jsx: true },
    })
  } catch (error) {
    return [{ status: 'fail', file, line: error.lineNumber, message: `could not be parsed (ayrıştırılamadı): ${error.message}` }]
  }

  const findings = []
  const fail = (node, message) => findings.push({ status: 'fail', file, line: node.loc.start.line, message })
  walk(ast, (node) => {
    if (isRawSqlModule(moduleSource(node))) {
      fail(node, `imports raw SQL client '${moduleSource(node)}'`)
    }
    if (node.type === 'TaggedTemplateExpression' && node.tag.type === 'Identifier' && node.tag.name === 'sql') {
      fail(node, 'sql`...` tagged template builds raw SQL')
    }
    if (node.type !== 'CallExpression') return
    const name = methodName(node.callee)
    const args = node.arguments
    if (name === 'query') {
      fail(node, '.query() call runs raw SQL')
    } else if (name === 'rpc' && isDynamicString(args[1])) {
      fail(node, '.rpc() arguments are built by string concatenation; pass an object')
    } else if (FILTER_STRING_METHODS.has(name) || (name === 'filter' && args.length === 3)) {
      if (args.some(isDynamicString)) {
        fail(node, `.${name}() gets a dynamically built PostgREST filter string`)
      }
    }
  })
  return findings
}

// Blanks comments and the contents of single-quoted literals (keeping length
// and newlines) so keywords and operators are only matched in SQL code.
function maskSql(sql) {
  let out = ''
  let i = 0
  const blank = (text) => text.replace(/[^\n]/g, ' ')
  while (i < sql.length) {
    if (sql.startsWith('--', i)) {
      const end = sql.indexOf('\n', i)
      const stop = end === -1 ? sql.length : end
      out += blank(sql.slice(i, stop))
      i = stop
    } else if (sql.startsWith('/*', i)) {
      const end = sql.indexOf('*/', i + 2)
      const stop = end === -1 ? sql.length : end + 2
      out += blank(sql.slice(i, stop))
      i = stop
    } else if (sql[i] === "'") {
      let j = i + 1
      while (j < sql.length && !(sql[j] === "'" && sql[j + 1] !== "'")) j += sql[j] === "'" ? 2 : 1
      out += `'${blank(sql.slice(i + 1, j))}'`
      i = j + 1
    } else {
      out += sql[i]
      i++
    }
  }
  return out.slice(0, sql.length)
}

// Finds dynamic SQL in plpgsql `execute` statements. `grant execute on`,
// `execute function/procedure` (triggers) are not dynamic SQL.
function scanStatement({ text, line, file }) {
  const masked = maskSql(text)
  const findings = []
  const executeKeyword = /\bexecute\b(?!\s+(?:on|function|procedure)\b)/gi
  let match
  while ((match = executeKeyword.exec(masked))) {
    const semicolon = masked.indexOf(';', match.index)
    const end = semicolon === -1 ? masked.length : semicolon
    const code = masked.slice(match.index, end)
    const original = text.slice(match.index, end)
    const at = line + text.slice(0, match.index).split('\n').length - 1
    if (code.includes('||')) {
      findings.push({ status: 'fail', file, line: at, message: 'execute builds SQL with || concatenation; use format() with %I / %L' })
    } else if (/\bformat\s*\(/i.test(code) && /%s/.test(original)) {
      findings.push({ status: 'fail', file, line: at, message: 'execute uses format() with %s; use %I / %L' })
    }
  }
  return findings
}

export const sqlInjection = {
  id: 'sql-injection',
  title: 'SQL injection',
  run(ctx) {
    const files = ctx.trackedFiles.filter(isScannedFile)
    const findings = files.flatMap((file) => scanCode(file, ctx.readFile(file)))
    const { statements } = ctx.migrations
    findings.push(...statements.flatMap(scanStatement))
    if (findings.length) return findings
    return [{
      status: 'pass',
      message: `no raw SQL or dynamic filter strings in ${files.length} code files; no dynamic execute in ${statements.length} migration statements`,
    }]
  },
}
