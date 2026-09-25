// Deliberate exceptions and expectations the walls check against. Every entry
// must carry a non-empty `reason`; runChecks fails otherwise. Adding an
// exception is a change here, not in a check's code.
export const exceptions = {
  // Tables with RLS enabled but intentionally no policies: { table, reason }
  policylessTables: [
    { table: 'ai_daily_usage', reason: 'Quota counter; only try_consume_ai_quota and refund_ai_quota (security definer, service_role only, called by ai-chat) touch it, never the client' },
  ],
  // Functions allowed to be `security definer`: { name, reason }
  securityDefinerFunctions: [
    { name: 'try_consume_ai_quota', reason: 'Must write ai_daily_usage, which has no client policies' },
    { name: 'refund_ai_quota', reason: 'Gives a quota slot back in ai_daily_usage when Gemini fails; same reason as try_consume_ai_quota' },
  ],
  // Expected parent tables for indirectly owned tables: { table, parents: [], reason }
  // Stricter than "one expression matches": every using and with check
  // expression of every policy must reference auth.uid() and each listed parent.
  ownershipChains: [
    { table: 'notes', parents: ['books'], reason: 'A note is owned through its book' },
    { table: 'ai_messages', parents: ['ai_conversations'], reason: 'A message is owned through its conversation' },
    { table: 'book_libraries', parents: ['books', 'libraries'], reason: 'Both linked rows must belong to the user (migration 011)' },
  ],
  // JWT `iss` values whose anon keys are Supabase CLI local demo keys, not
  // leaks. A service_role JWT is never exempt: { iss, reason }
  localDemoJwtIssuers: [
    {
      iss: 'supabase-demo',
      reason: 'Supabase CLI local stack anon key: public, identical on every install, only valid against a local instance',
    },
  ],
}
