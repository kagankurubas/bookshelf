// Returns the index after a quoted string or template literal starting at
// `start`, recursing into `${...}` substitutions.
function skipString(src, start) {
  const quote = src[start]
  let i = start + 1
  while (i < src.length) {
    const ch = src[i]
    if (ch === '\\') i += 2
    else if (ch === quote) return i + 1
    else if (quote === '`' && ch === '$' && src[i + 1] === '{') i = skipCode(src, i + 2, '}')
    else if (quote !== '`' && ch === '\n') return i
    else i++
  }
  return i
}

// Scans code until an unbalanced `close` (or end of input) and returns the
// index after it.
function skipCode(src, start, close) {
  let depth = 0
  let i = start
  while (i < src.length) {
    const ch = src[i]
    if (ch === "'" || ch === '"' || ch === '`') i = skipString(src, i)
    else if (ch === '{') {
      depth++
      i++
    } else if (ch === '}') {
      if (depth === 0 && close === '}') return i + 1
      depth--
      i++
    } else i++
  }
  return i
}

// Replaces `//` and `/* */` comments with spaces (keeping newlines) so that
// offsets and line numbers still match the original source.
export function blankJsComments(src) {
  let out = ''
  let i = 0
  while (i < src.length) {
    const ch = src[i]
    const next = src[i + 1]
    if (ch === '/' && next === '/') {
      while (i < src.length && src[i] !== '\n') {
        out += ' '
        i++
      }
    } else if (ch === '/' && next === '*') {
      const end = src.indexOf('*/', i + 2)
      const stop = end === -1 ? src.length : end + 2
      out += src.slice(i, stop).replace(/[^\n]/g, ' ')
      i = stop
    } else if (ch === "'" || ch === '"' || ch === '`') {
      const end = skipString(src, i)
      out += src.slice(i, end)
      i = end
    } else {
      out += ch
      i++
    }
  }
  return out
}
