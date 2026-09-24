# 05: Duvar 5 — Gemini kota guard'ı

**What to build:** `check:security`, Kitap Asistanı'nın paylaşılan Gemini kotasını koruyan guard'ın yerinde olduğunu doğrular: `try_consume_ai_quota` doğru tanımlı, `ai_daily_usage` policy'siz kilitli ve `ai-chat` Edge Function'ı kotayı Gemini'yi çağırmadan ve veritabanına yazmadan önce tüketiyor.

**Blocked by:** 01

**Status:** ready-for-agent

**Not:** Spec'teki "Duvar 5 — Kota guard'ı" kararı. Fonksiyonun `p_max_requests`'i client'tan alması ayrı bir açık ve bu ticket'ın kapsamında değil; bu duvar yalnızca guard'ın varlığını ve sırasını doğrular. `ai-chat` TypeScript olduğu için 06'daki ayrıştırma yaklaşımıyla uyumlu olmalı; espree ayrıştıramazsa kaynak üzerinde sıra karşılaştırması (ilk eşleşme indeksleri) kabul edilebilir, ama sonuç sessiz SKIP olmamalı.

- [ ] Migration'lardaki `try_consume_ai_quota` son tanımı `security definer` ve `set search_path` içermiyorsa FAIL
- [ ] `ai_daily_usage`'da RLS kapalıysa ya da policy varsa FAIL
- [ ] `ai-chat`'te `rpc('try_consume_ai_quota', …)` çağrısı yoksa FAIL
- [ ] Kota çağrısı ilk `.insert(` çağrısından veya Gemini'ye giden `fetch(`'ten sonra geliyorsa FAIL
- [ ] `quotaError` durumunda `throw`, `!quotaOk` durumunda erken `return` yoksa FAIL
- [ ] Kota çağrısının Gemini `fetch`'inden sonraya taşındığı ve `!quotaOk` kontrolünün silindiği fixture'larla FAIL veren testler var
- [ ] Gerçek repoda bu duvar PASS veriyor
