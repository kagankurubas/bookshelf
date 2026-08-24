-- ADIM 1/3: Kullanici hesaplarina gecis - ilk adim.
--
-- Once nullable birer user_id kolonu ekliyoruz (mevcut veriyi bozmadan).
-- RLS politikalari HENUZ degismiyor (uygulama hala herkese acik calisir) -
-- boylece sen ilk hesabini olusturana kadar uygulama kirilmaz.
--
-- Bu dosyayi Supabase SQL Editor'da simdi calistir. Hesabini
-- olusturduktan sonra 004 ve 005 dosyalarini sirayla calistiracaksin.

alter table libraries add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table books add column if not exists user_id uuid references auth.users(id) on delete cascade;
