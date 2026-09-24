import * as espree from 'espree'
import { blankComments } from '../migrations.js'
import { fail, passIfEmpty } from '../results.js'

const SCANNED_DIRS = ['src/', 'supabase/functions/']
const CODE_FILE = /\.(?:[cm]?js|jsx|[cm]?ts|tsx)$/
const TEST_FILE = /\.test\.[^/]+$/
const RAW_SQL_PACKAGES = new Set(['pg', 'postgres', 'postgresjs'])
const FILTER_STRING_METHODS = new Set(['or', 'not', 'textSearch'])
const RPC_ARGS_TYPES = new Set(['ObjectExpression', 'Identifier'])

function isScannedFile(path) {
  return SCANNED_DIRS.some((dir) => path.startsWith(dir)) && CODE_FILE.test(path) && !TEST_FILE.test(path)
}

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
    return [fail({ file, line: error.lineNumber, message: `could not be parsed: ${error.message}` })]
  }

  const findings = []
  walk(ast, (node) => {
    if (isRawSqlModule(moduleSource(node))) {
      findings.push(fail({ file, line: node.loc.start.line, message: `imports raw SQL client '${moduleSource(node)}'` }))
    }
    if (node.type === 'TaggedTemplateExpression' && node.tag.type === 'Identifier' && node.tag.name === 'sql') {
      findings.push(fail({ file, line: node.loc.start.line, message: 'sql`...` tagged template builds raw SQL' }))
    }
    if (node.type !== 'CallExpression') return
    const name = methodName(node.callee)
    const args = node.arguments
    if (name === 'query') {
      findings.push(fail({ file, line: node.loc.start.line, message: '.query() call runs raw SQL' }))
    } else if (name === 'rpc' && args.length > 1 && !RPC_ARGS_TYPES.has(args[1].type)) {
      findings.push(fail({ file, line: node.loc.start.line, message: `.rpc() arguments must be an object literal or a variable, not ${args[1].type}` }))
    } else if (FILTER_STRING_METHODS.has(name) || (name === 'filter' && args.length === 3)) {
      if (args.some(isDynamicString)) {
        findings.push(fail({ file, line: node.loc.start.line, message: `.${name}() gets a dynamically built PostgREST filter string` }))
      }
    }
  })
  return findings
}

// Finds dynamic SQL in plpgsql `execute` statements. `grant execute on`,
// `execute function/procedure` (triggers) are not dynamic SQL.
function scanStatement({ text, line, file }) {
  const masked = blankComments(text, { maskLiterals: true })
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
      findings.push(fail({ file, line: at, message: 'execute builds SQL with || concatenation; use format() with %I / %L' }))
    } else if (/\bformat\s*\(/i.test(code) && /%s/.test(original)) {
      findings.push(fail({ file, line: at, message: 'execute uses format() with %s; use %I / %L' }))
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
    return passIfEmpty(
      findings,
      `no raw SQL or dynamic filter strings in ${files.length} code files; no dynamic execute in ${statements.length} migration statements`,
    )
  },
}
