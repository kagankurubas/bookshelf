-- Gives back one Book Assistant quota slot when Gemini produced no reply
-- (transient 503/429 after retries, or any other Gemini failure), so a
-- failed attempt doesn't use up the shared daily quota. Like
-- try_consume_ai_quota, it takes no arguments and only service_role (the
-- ai-chat Edge Function) may execute it.
create or replace function refund_ai_quota()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update ai_daily_usage
  set request_count = greatest(request_count - 1, 0)
  where usage_date = (now() at time zone 'America/Los_Angeles')::date;
end;
$$;

-- Postgres grants execute to public on every new function, and Supabase's
-- default privileges add anon and authenticated.
revoke execute on function refund_ai_quota() from public, anon, authenticated;
grant execute on function refund_ai_quota() to service_role;
