# 02: Duvar 1 — RLS ve security definer

**What to build:** `check:security`, migration'lar sırayla uygulandıktan sonraki son duruma bakarak her tabloda RLS'in açık olduğunu, kullanıcı verisi policy'lerinin `auth.uid()`'e dayandığını, dolaylı sahiplikli tabloların doğru üst tabloya bağlandığını ve her `security definer` fonksiyonun `set search_path` içerip izinli listede olduğunu doğrular.

**Blocked by:** 01

**Status:** ready-for-agent

**Not:** Spec'teki "Duvar 1 — RLS" kararı. Kaynak migration dosyalarıdır, `schema.sql` değil. Beklenen sahiplik zinciri (`notes` → `books`, `ai_messages` → `ai_conversations`, `book_libraries` → `books` + `libraries`), policy'siz izinli tablo (`ai_daily_usage`) ve izinli `security definer` fonksiyon (`try_consume_ai_quota`) istisnalar config'inde gerekçeleriyle durur. Bu ticket'ın ürettiği "beklenen policy kümesi" 07'de production ile karşılaştırılacak; `ctx`'ten ya da dışa açık bir yardımcıdan erişilebilir olsun.

- [x] Migration'larda oluşturulan her tabloda RLS açık değilse FAIL (tablo adı + ilgili migration dosyası)
- [x] İstisna listesinde olmayan, RLS'i açık ama hiç policy'si olmayan tablo FAIL
- [x] Policy'lerinin hiçbirinin `using`/`with check` ifadesinde `auth.uid()` geçmeyen tablo FAIL
- [x] Config'teki sahiplik beklentisine göre policy ifadesinde beklenen üst tablo(lar) referans verilmiyorsa FAIL; `book_libraries` için `libraries` referansının eksik olduğu durum (migration 011 regresyonu) ayrıca test edildi
- [x] `set search_path` içermeyen ya da istisna listesinde olmayan `security definer` fonksiyon FAIL
- [x] Her kural için küçük bir kötü örnek fixture'la FAIL veren test var
- [x] Gerçek repoda bu duvar PASS veriyor
- [x] Migration'larda `alter policy` / `alter function` (ve `alter routine`) ifadesi varsa sessizce yok sayılmıyor, dosya:satırla FAIL; fixture testi var
