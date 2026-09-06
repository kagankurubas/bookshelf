-- Kitap Asistani (Gemini) icin gunluk kullanim kotasi.
--
-- Google'in ucretsiz katmaninda kullandigimiz model 20 istek/gun (RPD)
-- sinirina sahip ve bu sinir TUM kullanicilar arasinda PAYLASILAN tek bir
-- sayac - kullanici basina degil. O gercek sinira carpip Gemini'den
-- beklenmedik hatalar almak yerine, kendi ic kotamizi daha dusuk tutup
-- (bkz. ai-chat Edge Function'daki DAILY_QUOTA_LIMIT) kota dolunca
-- Gemini'yi hic cagirmadan kullaniciya nazik bir mesaj donuyoruz. Bu tablo
-- gun basina kac istek yapildigini tutar.
create table if not exists ai_daily_usage (
  usage_date date primary key,
  request_count integer not null default 0
);

alter table ai_daily_usage enable row level security;
-- Kasitli olarak hicbir policy yok - bu tabloya sadece asagidaki
-- security definer fonksiyon uzerinden erisilir, istemciden dogrudan degil.

-- Ilgili gunun sayacini atomik olarak arttirir; sinira ulasilmissa
-- arttirmadan false doner. Tek bir UPDATE ifadesi oldugu icin Postgres'in
-- satir kilitlemesi sayesinde es zamanli cagrilarda bile yarissiz
-- (race-free) calisir - iki istek ayni anda gelse bile sayac asilmaz.
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
