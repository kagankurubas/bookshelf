# 01: `supabase-rest-cache` oturum kapatma ve hesap silmede temizlensin; kullanıcıya göre ayrıştığı doğrulansın

**Status:** needs-triage

## Gözlem

PR 2'nin güvenlik incelemesinde (2026-10-03) build edilmiş `dist/sw.js` incelendi. Supabase REST okumaları (`/rest/v1/*` GET) `supabase-rest-cache`'e giriyor: NetworkFirst, 5 sn ağ zaman aşımı, `statuses: [0, 200]`, 50 kayıt, 24 saat. Bu davranış `main`'de de var, takvim PR'ı dokunmadı. Auth (`/auth/v1`) ve Edge Function (`/functions/v1`) istekleri hiçbir cache'e girmiyor.

`useAuth().signOut` ve `useDeleteAccount` yalnızca `supabase.auth.signOut()` çağırıyor; `src/` altında `caches.*` kullanan bir yer yok. Yani oturum kapatıldıktan ya da hesap silindikten sonra kitap/kütüphane/not/AI sohbet satırları, paylaşılan bir cihazda 24 saate kadar Cache Storage'da kalıyor.

## Doğrulanması gereken: cache kullanıcıya göre ayrışıyor mu?

Workbox anahtarı istek URL'si (+ yanıtın `Vary` başlıkları). Mevcut okumaların çoğu URL'de kullanıcıya özgü bir değer taşıyor (`libraries`/`books`/`ai_conversations` → `user_id=eq.<uuid>`; istatistik RPC'leri → `p_library_id`). Ama `Authorization` başlığı anahtara girmiyor. Soru: paylaşılan bir cihazda, çevrimdışıyken (ya da ağ 5 sn'yi aşınca) kullanıcı B, kullanıcı A'nın yanıtını alabilir mi?

- [ ] SW'ye giden tüm REST GET'lerinin (`.select`, `.rpc(..., { get: true })`) URL'lerinde kullanıcıya/kütüphaneye özgü bir değer olup olmadığı listelendi
- [ ] İki test kullanıcısıyla aynı tarayıcı profilinde: A ile gir, veriyi yükle, çık, çevrimdışı ol, B ile gir (ya da B'nin oturumu açıkken) — A'nın verisinin görünmediği doğrulandı
- [ ] URL'si kullanıcıdan bağımsız bir GET varsa (ya da ileride eklenirse) cache'e girmesinin engellendiği/anahtarın ayrıştırıldığı belirlendi

## Yapılacak (karar değil, yön)

- [ ] `signOut` ve hesap silme akışında `caches.delete('supabase-rest-cache')` (ve gerekiyorsa diğer kullanıcıya özgü cache'ler) çağrılıyor
- [ ] Davranış birim testiyle ve `vite build` + `vite preview` ile elle doğrulandı
- [ ] RLS veri ayrımını sunucuda koruyor; bu ticket istemci tarafındaki önbelleği kapsıyor
