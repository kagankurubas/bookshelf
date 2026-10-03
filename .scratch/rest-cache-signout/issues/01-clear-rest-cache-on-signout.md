# 01: `supabase-rest-cache` oturum kapatma ve hesap silmede temizlensin; kullanıcıya göre ayrıştığı doğrulansın

**Status:** ready-for-human (düzeltme `clear-user-data-cache` branch'inde; elle doğrulama ve PR bekliyor)

## Bulgular (2026-10-03, inceleme + `vite build` / `vite preview` ile elle)

Önem sırasıyla:

1. **Çıkış ve hesap silmeden sonra kullanıcı verisi cihazda kalıyordu.** Oturum açıkken görünümler ve AI geçmişi gezildikten sonra `supabase-rest-cache`'te 5 kayıt vardı: `libraries`, `books` (notlar dahil), `rpc/get_reading_stats`, `ai_conversations`, `ai_messages`. Çıkıştan sonra 5'i de duruyordu (24 saat / 50 kayıt). `src/` altında `caches.*` kullanan bir yer yoktu; `useAuth.signOut` ve `useDeleteAccount` yalnızca `supabase.auth.signOut()` çağırıyordu.
2. **AI sohbet geçmişi de cache'e giriyordu.** `GET /rest/v1/ai_conversations?user_id=eq.…` ve `GET /rest/v1/ai_messages?conversation_id=eq.…` NetworkFirst kuralına takılıyordu; mesaj metni (`content`) Cache Storage'da kalıyordu. Yeni mesajlar Edge Function (POST `/functions/v1/ai-chat`) üzerinden gidiyor, o cache'lenmiyor.
3. **Uygulama üzerinden kullanıcılar arası sızıntı yolu yok.** Tüm GET okumaları URL'de kullanıcıya özgü bir değer taşıyor:

   | Okuma | Süzgeç | Cache'e giriyor mu (düzeltme öncesi) |
   |---|---|---|
   | `libraries.select` | `user_id=eq.<uid>` | evet |
   | `books.select` (+ `book_libraries`, `notes`) | `user_id=eq.<uid>` | evet |
   | `ai_conversations.select` | `user_id=eq.<uid>` | evet |
   | `ai_messages.select` | `conversation_id=eq.<uuid>` | evet |
   | `rpc('get_reading_stats', …, { get: true })` | `p_library_id=<uuid>` | evet |
   | diğer istatistik RPC'leri | gövdede `p_library_id` | hayır (POST; Workbox yalnızca GET yakalar) |

   Supabase REST yanıtlarında `Vary` yok, yani anahtar yalnızca URL; `Authorization` anahtara girmiyor. Süzgeçsiz (yalnızca RLS'e dayanan) bir GET okuması yok. Bu güvence URL'lere bağlı: ileride süzgeçsiz bir GET eklenirse paylaşılan cihazda çevrimdışıyken başkasının yanıtı dönebilir.
4. **`networkTimeoutSeconds: 5`**: çevrimiçi ama 5 sn'den yavaş ağda aynı kullanıcının son cache yanıtı dönüyor (bayat veri; sızıntı değil).

`supabase-js`'in `signOut`'u ağ hatasında da oturumu yerelde silip `SIGNED_OUT` olayını tetikliyor (`GoTrueClient._signOut` → `_removeSession`); bu yüzden olaya bağlı temizlik çevrimdışı çıkışta da çalışıyor.

## Düzeltme

- `src/lib/userDataCache.js`:
  - `SUPABASE_REST_CACHE`: cache adının tek kaynağı; `vite.config.js` de bunu kullanıyor.
  - `clearUserDataCache()`: `caches.delete(SUPABASE_REST_CACHE)`. Cache Storage yoksa ya da silme başarısız olursa sessizce çıkıyor.
  - `syncUserDataCacheOwner(userId)`: localStorage'daki son sahip kimliğinden (`bookshelf:rest-cache-owner`) farklıysa ya da kimlik kayıtlı değilse (güncellemeden sonraki ilk çalıştırma) cache'i temizleyip kimliği kaydediyor.
  - `supabaseRestCachePattern(url)`: SW kuralının regex'i; `/rest/v1/ai_conversations` ve `/rest/v1/ai_messages`'ı hariç tutuyor.
- `useAuth`: `SIGNED_OUT`'ta temizlik; `SIGNED_IN` / `INITIAL_SESSION`'da sahip senkronizasyonu.
- `useDeleteAccount`: Edge Function başarılı olunca, `signOut`'tan önce `await clearUserDataCache()`.
- `vite.config.js`: Supabase kuralı `supabaseRestCachePattern` ile; AI sohbet istekleri hiç cache'lenmiyor. Kitaplar, kütüphaneler ve `get_reading_stats` çevrimdışı çalışmaya devam ediyor.

## Test planı

- [x] Birim: `clearUserDataCache` siliyor; Cache Storage yokken ve silme hata verirken hata fırlatmıyor.
- [x] Birim: `SIGNED_OUT` → temizlik; farklı kullanıcıyla `SIGNED_IN` → temizlik + yeni sahip kaydı; farklı kullanıcıyla `INITIAL_SESSION` → temizlik; kayıtlı sahip yokken bir kez temizlik, aynı kullanıcıyla tekrar yok; aynı kullanıcı / `TOKEN_REFRESHED` → temizlik yok.
- [x] Birim: hesap silme başarılıysa temizlik `signOut`'tan önce; silme başarısızsa temizlik yok.
- [x] Birim: SW kuralı kitap/kütüphane/istatistik URL'leriyle eşleşiyor; `ai_conversations`, `ai_messages`, `/auth/v1`, `/functions/v1` ve başka host'larla eşleşmiyor; URL kaçışlanıyor.
- [x] Her yeni test, düzeltme geçici olarak geri alındığında kırıldı (PR'da kayıtlı).
- [x] Build edilmiş `dist/sw.js` kuralı örnek URL'lerle doğrulandı.
- [ ] Elle (`vite build` + `vite preview`, SW aktif): giriş → görünümler ve AI geçmişi → `supabase-rest-cache`'te `ai_*` kaydı yok → çıkış → cache yok; çevrimdışı çıkış; ikinci bir test hesabıyla A → B geçişi; çevrimdışıyken kitaplar/kütüphaneler/istatistikler hâlâ görünüyor.
- [ ] Hesap silme yalnızca bir test hesabıyla ve kullanıcı onayıyla.

## Kapsam dışı / bilinen boşluk

- Çıkış anında yolda olan bir REST isteği, temizlikten sonra tamamlanırsa Workbox cache'i yeniden oluşturup eski kullanıcının yanıtını yazabilir. Pencere küçük (çıkıştan sonra uygulama veri istemiyor). Kapatmak için Workbox kuralına "yalnızca oturum varken cache'le" eklentisi gerekir; bu düzeltmenin kapsamında değil.
- `networkTimeoutSeconds: 5` ile yavaş ağda bayat veri dönmesi davranışı değişmedi.
