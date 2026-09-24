// Deliberate exceptions and expectations the walls check against. Every entry
// must carry a non-empty `reason`; runChecks fails otherwise. Adding an
// exception is a change here, not in a check's code.
export const exceptions = {
  // Tables with RLS enabled but intentionally no policies: { table, reason }
  policylessTables: [
    { table: 'ai_daily_usage', reason: 'Quota counter; only try_consume_ai_quota (security definer) touches it, never the client' },
  ],
  // Functions allowed to be `security definer`: { name, reason }
  securityDefinerFunctions: [
    { name: 'try_consume_ai_quota', reason: 'Must write ai_daily_usage, which has no client policies' },
  ],
  // Expected parent tables for indirectly owned tables: { table, parents: [], reason }
  ownershipChains: [
    { table: 'notes', parents: ['books'], reason: 'A note is owned through its book' },
    { table: 'ai_messages', parents: ['ai_conversations'], reason: 'A message is owned through its conversation' },
    { table: 'book_libraries', parents: ['books', 'libraries'], reason: 'Both linked rows must belong to the user (migration 011)' },
  ],
  // JWT `iss` values of Supabase CLI local demo keys, not leaks: { iss, reason }
  localDemoJwtIssuers: [],
}
