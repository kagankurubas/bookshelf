# 04: Duvar 3 — RLS entegrasyon testlerinin localhost guard'ı

**What to build:** `check:security`, RLS entegrasyon testlerinin localhost guard'ının gerçekten çalıştığını davranışsal olarak doğrular: remote bir `SUPABASE_URL` ile guard process'i durduruyor, `127.0.0.1` ile geçiriyor; ve integration config'i guard'ı hâlâ `globalSetup` olarak kullanıyor.

**Blocked by:** 01

**Status:** ready-for-agent

**Not:** Spec'teki "Duvar 3 — localhost guard" kararı. Guard `.env.test.local`'i `loadEnv` ile cwd'den okuduğu ve bu dosyadaki değer `process.env`'den önce geldiği için, guard ayrı bir Node process'inde **boş bir geçici dizin cwd olacak şekilde** çalıştırılmalı; aksi halde geliştiricinin local dosyası sonucu bozar.

- [ ] Guard, `SUPABASE_URL=https://example.supabase.co` ile ayrı bir process'te çalıştırıldığında `exit 1` ile duruyor; durmazsa FAIL
- [ ] Guard, `SUPABASE_URL=http://127.0.0.1:54321` ile başarılı dönüyor; dönmezse FAIL
- [ ] Integration Vitest config'i guard modülünü `globalSetup` olarak referans vermiyorsa FAIL
- [ ] Guard dosyası yoksa FAIL (SKIP değil)
- [ ] Localhost kontrolü kaldırılmış bir guard fixture'ıyla ve `globalSetup` referansı silinmiş bir config fixture'ıyla FAIL veren testler var
- [ ] Gerçek repoda bu duvar PASS veriyor
