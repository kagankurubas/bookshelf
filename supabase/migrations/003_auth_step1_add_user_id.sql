-- STEP 1/3: migrating to user accounts - first step.
--
-- First add nullable user_id columns (without breaking existing data).
-- RLS policies do NOT change yet (the app still runs wide open) - so the
-- app doesn't break until you've created your first account.
--
-- Run this file in the Supabase SQL Editor now. After creating your
-- account, run files 004 and 005 in order.

alter table libraries add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table books add column if not exists user_id uuid references auth.users(id) on delete cascade;
