# 01: `Tamamlandı` sabitini tekilleştir, Okuma Özeti'ndeki stil dallanmasını topla

**Status:** needs-triage

## Gözlem (PR 2 code-review, 2026-10-03)

- `Tamamlandı` durum dizesi üç ayrı yerde sabit olarak tanımlı: `readingRecap.js` (`RECAP_COMPLETED_STATUS`), `readingCalendar.js` (`COMPLETED`), `csvImportShared.js` (`COMPLETED_STATUS`). `Okunuyor` için de benzer tekrarlar var.
- `ReadingRecap.jsx`'te `isCalendar ? … : …` altı yerde karar veriyor: yıl seçenekleri, dönem etiketi (Raf için `monthsLong`, Takvim için `Intl.DateTimeFormat` — iki farklı ay biçimlendirmesi), boşluk, paylaşım metni, dosya adı, `cacheBust`. Bileşen birden çok nedenle değişmeye başlıyor.
- `readingCalendar.js`'te `countBooksSkippedForDates`, `readingSpan`'deki tarih geçerliliği kurallarını tekrarlıyor; biri değişince diğeri de değişmeli.

## Yapılacak (yön)

- [ ] Kitap durumları (CONTEXT.md'deki dört durum) tek bir modülden export ediliyor; üç dosya onu kullanıyor
- [ ] Okuma Özeti stillerinin farkları (yıl seçenekleri, etiket, boşluk, paylaşım metni, dosya adı, export seçenekleri) stil başına tek bir tanımda toplanıyor
- [ ] Atlanan kitap sayımı ve takvime dahil etme aynı geçerlilik kuralını paylaşıyor
- [ ] Davranış değişmiyor: mevcut testler aynen geçiyor
