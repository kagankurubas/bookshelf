-- ADIM 2/3: Kullanici hesaplarina gecis - mevcut veriyi hesabina baglama.
--
-- Once uygulamada (giris ekranindan) KAYIT OL ile kendi hesabini olustur.
-- Sonra asagidaki sorguyla kendi user id'ni bul:
--
--   select id, email from auth.users;
--
-- Bulduğun id'yi 'BURAYA_USER_ID' yerine yapistirip bu dosyayi calistir.
-- Bu, su an sahipsiz (user_id = null) duran tum kitaplik ve kitaplari
-- senin hesabina atar - hicbir sey kaybolmaz.

update libraries set user_id = 'BURAYA_USER_ID' where user_id is null;
update books set user_id = 'BURAYA_USER_ID' where user_id is null;
