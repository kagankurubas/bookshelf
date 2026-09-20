# 06: CI'a entegrasyon test job'ı ekleme

**What to build:** Geliştirici, RLS entegrasyon testlerinin CI'da da (mevcut `build` job'ından ayrı, opsiyonel bir job olarak) local Supabase'e karşı çalıştığını görür; mevcut lint/test/build akışı etkilenmez.

**Blocked by:** 02 (libraries+books), 03 (book_libraries), 04 (notes), 05 (ai_conversations+ai_messages)

**Status:** ready-for-agent

- [ ] `.github/workflows/ci.yml`'e, local Supabase CLI'ı ayağa kaldırıp (`supabase start`) `npm run test:integration` çalıştıran ayrı bir job eklendi
- [ ] Bu job, `supabase start`'ın kendi ürettiği sabit local anahtarları (CLI çıktısı) kullanıyor; hiçbir gerçek/hosted Supabase projesine bağlanmıyor, hiçbir GitHub Actions secret'ı gerekmiyor
- [ ] Mevcut `build` job'ı (checkout → setup-node → npm ci → lint → test → build) değişmeden, bu yeni job'dan bağımsız olarak çalışmaya devam ediyor
