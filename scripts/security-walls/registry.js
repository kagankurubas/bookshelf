import { rlsCheck } from './checks/rls.js'
import { leakage } from './checks/leakage.js'
import { localhostGuard } from './checks/localhostGuard.js'
import { linkedMigrations } from './checks/linkedMigrations.js'
import { quotaGuard } from './checks/quotaGuard.js'
import { sqlInjection } from './checks/sqlInjection.js'

// Walls run in this order. A new wall is a module in ./checks/ exporting
// { id, title, run(ctx) } plus one line here.
export const checks = [
  rlsCheck,
  leakage,
  localhostGuard,
  linkedMigrations,
  quotaGuard,
  sqlInjection,
]
