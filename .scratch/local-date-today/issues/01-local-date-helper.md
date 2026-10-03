# 01: "Bugün" tarihini yerel saatle üreten helper; BookModal'ın UTC günü yazmasını düzelt

**What to build:** Kullanıcının yerel saatine göre bugünün tarihini `YYYY-MM-DD` olarak üreten küçük, saf bir helper, ve "bugün"ü `toISOString()` (UTC) ile üreten yerlerin bu helper'a taşınması.

**Blocked by:** —

**Status:** ready-for-agent

## Bug

BookModal'da durum Okunuyor veya Tamamlandı yapıldığında boş başlangıç/bitiş tarihi `new Date().toISOString().split('T')[0]` ile dolduruluyor. `toISOString()` UTC'ye çevirdiği için, UTC'nin önündeki saat dilimlerinde (Türkiye UTC+3) gece 00:00–03:00 arasında işaretlenen kitap **bir önceki güne** kaydediliyor. `date_started`/`date_finished` Postgres'te `date` tipinde (saat dilimi yok), yani yanlış gün kalıcı olarak saklanıyor; aylık istatistiklerde, Okuma Özeti'nde ve takvim stilinde (`.scratch/monthly-reading-calendar-share/`) o gün yanlış görünür.

## Tarama sonucu (2026-10-02, `monthly-reading-calendar-share` branch'i)

- `toISOString` `src/` ve `supabase/functions/` altında yalnızca BookModal'daki iki çağrıda geçiyor (Okunuyor → `dateStarted`, Tamamlandı → `dateFinished`).
- Zaten yerel saat kullanan, helper'ı yeniden kullanabilecek yer: CSV/JSON export dosya adı (`getExportFilename`, kendi `pad2` + `getFullYear/getMonth/getDate` mantığı var). Davranışı doğru; helper'a taşınması isteğe bağlı tekilleştirme.
- İlgili ama ayrı gözlem: ReadingRecap "geçerli yıl/ay"ı modül yüklenirken bir kez hesaplıyor; uygulama ay sınırını geçecek kadar açık kalırsa eski ay seçili gelir. Bu ticket'ın kapsamında değil, sadece not.

## Kabul kriterleri

- [ ] `src/lib/` altında yerel tarih helper'ı: verilen (varsayılan: şimdiki) `Date`'ten kullanıcının yerel saatine göre `YYYY-MM-DD` döner; `toISOString` kullanmaz
- [ ] BookModal'daki iki çağrı helper'ı kullanıyor
- [ ] Uygulama genelinde "bugün"ü `toISOString` ile üreten başka yer kalmadığı yeniden tarandı (`grep toISOString`)
- [ ] Helper'ın birim testi UTC'nin önündeki bir saat diliminde (örn. `TZ=Europe/Istanbul`, yerel 00:30) önceki günü değil yerel günü döndüğünü doğruluyor
- [ ] Mevcut kayıtlı yanlış tarihler düzeltilmez (veride hangi kaydın etkilendiği bilinemez); bu kapsam dışı
