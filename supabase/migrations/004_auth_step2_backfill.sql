-- STEP 2/3: migrating to user accounts - linking existing data to your account.
--
-- This migration was originally a one-off, manually run production script
-- (the BURAYA_USER_ID placeholder was hand-edited in before running). On a
-- fresh/local database there will never be any unowned (user_id = null)
-- rows, so this block normally does nothing. If unowned data genuinely
-- exists (e.g. an old prod dump was restored), it raises an explicit error
-- and stops - it does not silently write a wrong/placeholder UUID.

do $$
begin
  if exists (select 1 from libraries where user_id is null) then
    raise exception 'Sahipsiz kayit bulundu: bu migration icin gercek user_id ile elle calistirilmasi gerekiyor (placeholder otomatik replay edilemez).';
  end if;
end $$;