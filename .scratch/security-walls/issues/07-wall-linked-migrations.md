# 07: Duvar 4 — Production migration geçmişi (`--linked`, salt-okunur)

**What to build:** Geliştirici `npm run check:security -- --linked` çalıştırdığında, production'ın `schema_migrations` kayıtlarının local migration dosyalarıyla ve production `pg_policies` içeriğinin Duvar 1'in beklediği policy kümesiyle tutarlı olduğunu salt-okunur olarak görür. `--linked` verilmediğinde bu duvar SKIP olur.

**Blocked by:** 02 (beklenen policy kümesi)

**Status:** ready-for-agent

**Not:** Spec'teki "Duvar 4 — Migration geçmişi" kararı ve `docs/agents/supabase-migrations.md`. Sadece `supabase migration list --linked` ve `supabase db query --linked` ile **SELECT** sorguları kullanılır. Script hiçbir koşulda `migration repair`, `db push` ya da yazma sorgusu çalıştırmaz; bu kural kodda tek bir izinli-komut listesiyle zorlanmalı. Otomatik testler production'a karşı çalışmaz: CLI çıktısını ayrıştıran kısım sabit örnek çıktılarla test edilir, CLI çağrısı enjekte edilebilir bir çalıştırıcı üzerinden yapılır. CI'da çalıştırılmaz.

- [x] `--linked` verilmediğinde tek bir SKIP sonucu ("production kontrolü için --linked kullan") dönüyor
- [x] CLI login/link yoksa ya da komut başarısız olursa SKIP ve nasıl bağlanılacağına dair kısa mesaj; FAIL değil
- [x] Local'de olup production `schema_migrations`'ta olmayan versiyon FAIL; production'da olup local'de olmayan versiyon FAIL
- [x] Production `pg_policies`'te Duvar 1'in beklediği bir policy eksikse ya da ifadesinde `auth.uid()` / beklenen üst tablo yoksa FAIL
- [x] Çalıştırılan her Supabase CLI komutu izinli salt-okunur listeden geçiyor; listede olmayan bir komut denemesi exception'la reddediliyor
- [x] Sabit örnek CLI çıktılarıyla (eşleşen, eksik versiyon, eksik policy) testler var
- [x] `--linked` olmadan gerçek repoda bu duvar SKIP veriyor
