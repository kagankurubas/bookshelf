import { register } from 'node:module'
import { pathToFileURL } from 'node:url'

// Runs the guard module at argv[2] in this process. Exit code: whatever the
// guard passes to process.exit, 0 if it returns, GUARD_CRASHED if it cannot
// be loaded or throws.
const GUARD_CRASHED = 3

// Bare imports the guard's own location can't resolve (e.g. `vite` in a
// fixture repo without node_modules) fall back to this repo's node_modules.
const hooks = `
let fallbackParent
export function initialize(data) { fallbackParent = data.fallbackParent }
export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context)
  } catch (error) {
    const bare = !/^(?:[./]|[A-Za-z][A-Za-z0-9+.-]*:)/.test(specifier)
    if (error?.code !== 'ERR_MODULE_NOT_FOUND' || !bare) throw error
    return next(specifier, { ...context, parentURL: fallbackParent })
  }
}
`
register(`data:text/javascript,${encodeURIComponent(hooks)}`, {
  data: { fallbackParent: import.meta.url },
})

try {
  const guard = await import(pathToFileURL(process.argv[2]).href)
  await guard.default()
} catch (error) {
  console.error(error)
  process.exit(GUARD_CRASHED)
}
