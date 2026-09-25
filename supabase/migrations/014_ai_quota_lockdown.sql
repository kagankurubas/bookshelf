-- Locks the Book Assistant quota down to the ai-chat Edge Function.
--
-- The old try_consume_ai_quota(date, integer) was executable by any
-- signed-in user and took both the day and the limit from the caller, so
-- anyone could call it directly through PostgREST with a huge limit and
-- use up the shared daily quota for everyone. The new version takes no
-- arguments: the limit is fixed here and the day is computed here, and
-- only service_role (used by ai-chat for this one call) may execute it.
--
-- The old signature must be dropped first: a create with a different
-- argument list adds an overload instead of replacing it.
drop function if exists try_consume_ai_quota(date, integer);

-- Stays below the Gemini free tier's ~20 requests/day for this project,
-- which is shared across all users. Changing it needs a new migration.
create or replace function try_consume_ai_quota()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  daily_limit constant integer := 15;
  -- Google resets the daily quota at midnight Pacific time.
  today date := (now() at time zone 'America/Los_Angeles')::date;
  new_count integer;
begin
  insert into ai_daily_usage (usage_date, request_count)
  values (today, 0)
  on conflict (usage_date) do nothing;

  update ai_daily_usage
  set request_count = request_count + 1
  where usage_date = today
    and request_count < daily_limit
  returning request_count into new_count;

  return new_count is not null;
end;
$$;

-- Postgres grants execute to public on every new function, and Supabase's
-- default privileges add anon and authenticated.
revoke execute on function try_consume_ai_quota() from public, anon, authenticated;
grant execute on function try_consume_ai_quota() to service_role;
