// Result builders shared by every wall. `file` and `line` are only set when given.
function result(status, { message, file, line }) {
  const built = { status, message }
  if (file !== undefined) built.file = file
  if (line !== undefined) built.line = line
  return built
}

export const pass = (fields) => result('pass', fields)
export const fail = (fields) => result('fail', fields)
export const skip = (fields) => result('skip', fields)

// The wall's findings, or one PASS with `message` when there are none.
export const passIfEmpty = (findings, message, location = {}) =>
  findings.length ? findings : [pass({ message, ...location })]
