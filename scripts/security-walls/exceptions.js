// Deliberate exceptions and expectations the walls check against. Every entry
// must carry a non-empty `reason`; runChecks fails otherwise. Adding an
// exception is a change here, not in a check's code.
export const exceptions = {
  // Tables with RLS enabled but intentionally no policies: { table, reason }
  policylessTables: [],
  // Functions allowed to be `security definer`: { name, reason }
  securityDefinerFunctions: [],
  // Expected parent tables for indirectly owned tables: { table, parents: [], reason }
  ownershipChains: [],
  // JWT `iss` values of Supabase CLI local demo keys, not leaks: { iss, reason }
  localDemoJwtIssuers: [
    {
      iss: 'supabase-demo',
      reason: 'Supabase CLI local stack keys: public, identical on every install, only valid against a local instance',
    },
  ],
}
