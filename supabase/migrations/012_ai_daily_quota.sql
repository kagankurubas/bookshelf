-- Daily usage quota for the Book Assistant (Gemini).
--
-- On Google's free tier, the model we use has a 20 requests/day (RPD)
-- limit, and that limit is a single counter SHARED across ALL users, not
-- per-user. Instead of hitting that real limit and getting unexpected
-- errors from Gemini, we keep our own internal quota lower (see
-- DAILY_QUOTA_LIMIT in the ai-chat Edge Function) and return a polite
-- message to the user once the quota is used up, without calling Gemini
-- at all. This table tracks how many requests were made per day.
create table if not exists ai_daily_usage (
  usage_date date primary key,
  request_count integer not null default 0
);

alter table ai_daily_usage enable row level security;
-- Intentionally no policies - this table is only accessed through the
-- security definer function below, never directly from the client.

-- Atomically increments the counter for the given day; returns false
-- without incrementing once the limit is reached. Because it's a single
-- UPDATE statement, Postgres row locking makes it race-free even under
-- concurrent calls - the counter can't be exceeded even if two requests
-- arrive at the same time.
create or replace function try_consume_ai_quota(p_usage_date date, p_max_requests integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
begin
  insert into ai_daily_usage (usage_date, request_count)
  values (p_usage_date, 0)
  on conflict (usage_date) do nothing;

  update ai_daily_usage
  set request_count = request_count + 1
  where usage_date = p_usage_date
    and request_count < p_max_requests
  returning request_count into new_count;

  return new_count is not null;
end;
$$;

grant execute on function try_consume_ai_quota(date, integer) to authenticated;
