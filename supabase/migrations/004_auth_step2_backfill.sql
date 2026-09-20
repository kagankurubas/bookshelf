-- ADIM 2/3: Kullanici hesaplarina gecis - mevcut veriyi hesabina baglama.
--
-- Bu migration orijinalde tek seferlik, elle calistirilan bir production
-- script'iydi (BURAYA_USER_ID placeholder'i elle degistirilip calistirilirdi).
-- Fresh/local bir veritabaninda sahipsiz (user_id = null) satir hic olmayacagi
-- icin bu blok normalde hicbir sey yapmiyor. Eger gercekten sahipsiz veri
-- varsa (ör. eski bir prod dump'i restore edildiyse), acik bir hata verip
-- durur - sessizce yanlis/placeholder bir UUID yazmaz.

do $$
begin
  if exists (select 1 from libraries where user_id is null) then
    raise exception 'Sahipsiz kayit bulundu: bu migration icin gercek user_id ile elle calistirilmasi gerekiyor (placeholder otomatik replay edilemez).';
  end if;
end $$;