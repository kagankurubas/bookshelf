# 05: Tekil Ana Kitaplık index'i ve kitaplıksız hesaplara backfill (PR B, migration 016)

**What to build:**
- **Backfill:** kitaplığı olmayan her mevcut hesaba bir kez Ana Kitaplık açılır. Ad: metadata `locale` tam olarak `en` ise "My Library", aksi halde "Kitaplığım"; 2 kat, `is_default`.
- **Index:** veritabanı kullanıcı başına ikinci bir Ana Kitaplığı reddeder: `libraries (user_id) where is_default` kısmi unique index.
- **İdempotentlik:** index'ten önce olası çoklu Ana Kitaplıklar en eskisine indirilir (007 deseni); backfill `not exists` ile yazılır.
- Yetim kitaplar kitaplığa bağlanmaz.
- `supabase/schema.sql` index ile güncellenir (backfill hariç).
- **Doğrudan Postgres seam'i bu ticket'ta kurulur:**
  - `pg@8.23.1` yalnızca `devDependencies`'te, sabit sürüm
  - `SUPABASE_DB_URL` CI'daki env üretme adımına ve README'deki yerel kuruluma eklenir
  - globalSetup'taki localhost koruması bu adresi de kontrol eder
  - security-walls localhost duvarı uzak bir DB adresini ve `pg`'nin bağımlılık yerini doğrular; her kural için bozuk bir örnekle (bad-example) test yazılır
  - `npm audit` çıktısı kullanıcıya gösterilir ve PR'a yazılır

**Blocked by:** None (PR A merge edildikten sonra açılır; v1.1 etiketinden bağımsız)

**Status:** ready-for-agent

- [ ] `pg` yalnızca `devDependencies`'te, `8.23.1` sabit; `npm audit` çıktısı gösterildi
- [ ] globalSetup uzak bir `SUPABASE_DB_URL` ile exit 1 veriyor; `npm run check:security` bunu ve bağımlılık kuralını doğruluyor, bad-example testleri yeşil
- [ ] Entegrasyon: ikinci `is_default = true` kitaplık eklemesi unique ihlaliyle reddedilir; `is_default = false` ek kitaplıklar serbest
- [ ] Entegrasyon (doğrudan Postgres): kitaplıksız kullanıcı için backfill ilk çalıştırmada tam olarak bir Ana Kitaplık açar, ikinci çalıştırmada hiçbir satır değiştirmez
- [ ] Mevcut `tests/integration/rls` paketinin tamamı yerelde ve CI'da yeşil
- [ ] `supabase start` temiz bir DB'de 001–016'yı hatasız uygular
