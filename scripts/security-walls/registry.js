import { quotaGuard } from './checks/quotaGuard.js'

// Walls run in this order. A new wall is a module in ./checks/ exporting
// { id, title, run(ctx) } plus one line here.
export const checks = [
  quotaGuard,
]
