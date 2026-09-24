# 06: Duvar 6 — SQL / PostgREST filtre injection (statik)

**What to build:** `check:security`, uygulama ve Edge Function kodunda ham SQL yolu olmadığını, `.rpc()` parametrelerinin obje olarak geçtiğini, PostgREST filtre dizesi alan metotlara dinamik dize gömülmediğini ve migration'larda dinamik `execute` ile SQL kurulmadığını statik olarak doğrular.

**Blocked by:** 01

**Status:** ready-for-agent

**Not:** Spec'teki "Duvar 6 — SQL injection (statik)" kararı. Kod kontrolleri metin aramasıyla değil espree AST'siyle yapılır (`Array.prototype.filter` yanlış alarm üretmemeli). espree `devDependencies`'e açıkça eklenir. Test dosyaları taranmaz. Ayrıştırılamayan dosya FAIL'dir ("ayrıştırılamadı"), SKIP değil. Bugünkü kod tabanı bu açıdan temiz; gerçek repoda PASS beklenir.

- [x] `src/` ve `supabase/functions/` altındaki JS/JSX/TS dosyaları (test dosyaları hariç) ayrıştırılıyor; ayrıştırılamayan dosya FAIL
- [x] `.query(` çağrısı, `sql` tag'li template literal, `pg` / `postgres` import'u FAIL
- [x] `.rpc(name, args)`'ta `args` template literal ya da `+` birleştirmesiyse FAIL; obje ifadesi ve identifier izinli
- [x] `.or`, `.not`, `.textSearch` ve 3 argümanlı `.filter` çağrılarına template literal ya da birleştirme geçilmişse FAIL; tek argümanlı callback alan `.filter` yok sayılıyor
- [x] Migration'lardaki plpgsql `execute` ifadesinde `||` birleştirmesi ya da `format(` içinde `%s` varsa FAIL; `%I` / `%L` izinli
- [x] `.or()`'a template literal geçen bir hook fixture'ı, string birleştirmeli `.rpc` fixture'ı ve `execute 'select ' || x` içeren migration fixture'ıyla FAIL veren testler var; ayrıca `Array.filter` içeren bir dosyanın yanlış alarm üretmediği test ediliyor
- [x] Gerçek repoda bu duvar PASS veriyor
