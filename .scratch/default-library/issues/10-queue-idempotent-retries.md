# 10: (v1.1.1) Kimlik tabanlı tekrar gönderim: yeniden denemeler çift kitap üretmesin

04'ün (4). adımı; kullanıcı kararıyla v1.1.1'e ertelendi (PR A'da yok). Karar D1-b ve şartları:

**What to build:**
- **Yeni kitap kimliği:** kitap penceresi yeni kitap için her açılışta yeni bir `clientBookId` üretir. Aynı pencerede yapılan tekrar kaydetmeler aynı kimliği kullanır. Doğrudan kaydetme ve kuyruk aynı kimliği taşır; notlar da istemci kimliği alır.
- **Ekleme:** `insertBookWithLinks` kitabı bu kimlikle ekler. `books_pkey` üzerinde `23505` gelirse kitap kimliğe göre okunur:
  - RLS ile okunabiliyorsa (kullanıcının kendi kitabı: önceki deneme yazmış ya da yetim kalmış) kitaplık bağlantıları ve notlar `ignoreDuplicates` ile tamamlanır, sonuç başarılı sayılır. Bu, yetim kitabı da onarır.
  - Okunamıyorsa `rejected` olur.
  - 04'teki geçici `books_pkey` → `skip` kuralı bununla değişir.
- **Yedek UUID üretici:** `crypto.randomUUID` yalnızca güvenli bağlamda (HTTPS, localhost) var; LAN'da `http://` ile açılınca yok. Yedek olarak `crypto.getRandomValues` ile RFC 4122 v4 UUID üretilir.
- **İki sekme:** iki sekme aynı anda senkron yaparsa aynı kayıt iki kez gönderilebilir; kimlik bunu tek kitaba indirir. Mümkünse ek olarak `navigator.locks` ile sekmeler arası senkron kilidi.

**Blocked by:** 04 (PR A merge edildikten sonra)

**Status:** ready-for-agent (v1.1.1)

- [ ] Pencere: yeni kitap için açılışta kimlik üretiliyor; aynı pencerede ikinci Kaydet aynı kimliği gönderiyor; yeni pencere yeni kimlik (RTL)
- [ ] `bookWrites`: kimlikle ekleme; `23505 books_pkey` + okunabilir → bağlantılar/notlar tamamlanıyor, başarı; okunamaz → `rejected` (mock)
- [ ] Yedek UUID: `crypto.randomUUID` yokken `getRandomValues` ile geçerli v4 UUID (biçim regex'i, sürüm/varyant bitleri, 1000 üretimde çakışma yok)
- [ ] İki sekme: aynı kaydı iki eşzamanlı senkron gönderiyor → tek kitap, bağlantılar ve notlar tek kopya (gerçek IndexedDB + mock'lu ekleme; entegrasyonda gerçek RLS ile)
- [ ] Entegrasyon (gerçek RLS): aynı kimlikle iki kez ekleme tek kitap; başka kullanıcının kitabıyla çakışan kimlik `rejected`
- [ ] Mutasyon: kimlik gönderilmezse ve `23505` tamamlama kaldırılırsa ilgili testler düşer
