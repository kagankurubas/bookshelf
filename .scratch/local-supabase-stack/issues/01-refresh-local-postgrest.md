# 01: Yerel Supabase stack'ini CI ile aynı PostgREST sürümüne getir

**What to build:**
- **Sorun:** yerel stack, 2026-09-20'de oluşturulmuş konteynerlerle çalışıyor (`postgrest:v16.2`). `supabase start` bu konteynerleri yeniden kullanıyor.
- **Bilinen hata:** 16.2'de, PostgREST'in önbelleğe aldığı saatin eskimesinden kaynaklanan bir hata var. RLS entegrasyon testleri boşta beklemeden sonraki ilk koşuda ara sıra `PGRST303 "JWT issued at future"` ile düşüyor.
  - 2026-10-03'te 20 koşuda 1 kez yakalandı (`book-writes.test.js` `beforeAll`).
  - PostgREST CHANGELOG'una göre düzeltme 16.3'te (2026-09-11) ve 14.18'de (#5196).
- **CI etkilenmiyor:** temiz kurulum `postgrest:v16.4` çekiyor.
- **Dikkat:**
  - `supabase/.temp/rest-version`, 2026-09-22'de `supabase link` ile yazılmış ve `v14.5` sabitliyor (gitignore'da). Stack yeniden kurulursa CLI bu sabitlenmiş sürümü kullanabilir; 14.5 de düzeltmeyi (14.18) içermiyor.
  - Bu yüzden yeniden kurmadan önce bu sabitlemenin ne yapacağına karar verilmeli. Seçenekler: kaldırmak, CI ile aynı sürüme çekmek ya da canlı sürümü yansıtmasına bırakmak.
- **Canlı:** canlı PostgREST sürümü bu dosyaya göre 14.5 olabilir; doğrulanmadı. Canlıda aynı hata kullanıcıya ara sıra görünebilir. İstemci tarafı ilk önlem: kaydetme hatalarında `PGRST303` artık `transient` sınıfında.

**Blocked by:** None

**Status:** ready-for-human (yerel makinede yeniden kurulum ve sürüm sabitlemesi kararı)

- [ ] `supabase/.temp/rest-version` için karar verildi ve uygulandı
- [ ] Yerel stack, düzeltmeyi içeren bir PostgREST sürümüyle yeniden oluşturuldu; `docker inspect` ile sürüm doğrulandı
- [ ] RLS entegrasyon paketi boşta beklemeden sonra art arda 20 kez koşuldu; `PGRST303` görülmedi
- [ ] `docs/agents/supabase-migrations.md`'deki yerel PGRST303 notu kaldırıldı ya da güncellendi
