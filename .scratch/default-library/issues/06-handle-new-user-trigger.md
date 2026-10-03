# 06: Yeni kullanıcı kayıt anında Ana Kitaplıkla başlasın (PR B, migration 017)

**What to build:** `auth.users` üzerinde `after insert` trigger'ı ve `public.handle_new_user()` fonksiyonu:
- `security definer`, `set search_path = ''`, şemayla nitelenmiş tablo adları
- Ana Kitaplığı `on conflict (user_id) where is_default do nothing` ile ekler
- **Ad:** `raw_user_meta_data->>'locale'` yalnızca `= 'en'` karşılaştırmasında kullanılır: eşitse "My Library", aksi her durumda (eksik, `tr`, geçersiz) "Kitaplığım". Metadata değeri ada asla yazılmaz.
- tüm gövde `exception when others` ile sarılı: hata `raise warning` ile loglanır, kayıt düşmez
- `revoke execute` from `public, anon, authenticated`

Kayıt ekranı ve `useAuth.signUp`, arayüz dilini `options.data.locale` olarak gönderir. `handle_new_user` security walls exceptions'ına gerekçesiyle eklenir. `schema.sql` fonksiyon ve trigger ile güncellenir.

**Blocked by:** 05 (trigger'ın `on conflict` hedefi 016'daki index; doğrudan Postgres seam'i 05'te kuruluyor)

**Status:** ready-for-agent

- [ ] Entegrasyon: `admin.createUser` sonrası kullanıcı tam olarak bir Ana Kitaplığa sahip
- [ ] Entegrasyon (ad eşleşmesi): metadata `tr` / `en` / geçersiz için trigger'ın açtığı adlar, locale dosyalarındaki `bookModal.defaultLibraryName` TR / EN / TR değerleriyle birebir aynı; geçersiz değer adda görünmüyor
- [ ] Entegrasyon (doğrudan Postgres): `libraries` eklemesi zorla reddedilirken `admin.createUser` başarılı olur ve kullanıcı kitaplıksız oluşur; geçici nesne test sonunda kaldırılır
- [ ] Kayıt ekranı testi: `signUp` arayüz dilini metadata'da gönderir
- [ ] `npm run check:security` geçer (definer + search_path + exceptions girdisi)
- [ ] Mevcut `tests/integration/rls` paketinin tamamı yeşil; sonuç PR açıklamasına yazılır
