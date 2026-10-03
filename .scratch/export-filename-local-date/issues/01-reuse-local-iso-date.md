# 01: CSV/JSON export dosya adı tarihini `toLocalIsoDate` ile üret

**Status:** needs-triage

**Blocked by:** `local-date-helper` PR'ının (`toLocalIsoDate`) `main`'e girmesi

## Gözlem

`local-date-helper` code-review'unda (2026-10-03) "Duplicated Code" olarak işaretlendi: yeni `src/lib/localDate.js`'teki `pad2` ve `getFullYear()-pad2(getMonth() + 1)-pad2(getDate())` kalıbı, `src/lib/bookExport.js`'teki `pad2` + `getExportFilename` ile satır satır aynı. Davranış ikisinde de doğru (ikisi de yerel saati kullanıyor); sorun yalnızca aynı biçimlendirmenin iki kopyası olması. `local-date-today` ticket'ı bu tekilleştirmeyi "isteğe bağlı" bırakmıştı, PR'a dahil edilmedi.

## Yapılacak

- `getExportFilename`, tarih kısmını `toLocalIsoDate(date)` ile üretir; `bookExport.js`'teki özel `pad2` kaldırılır.
- Dosya adı konvansiyonu (`bookshelf-export-YYYY-MM-DD.<ext>`, indirme anındaki yerel tarih) değişmez.

## Kabul kriterleri

- [ ] `bookExport.js`'te kendi tarih biçimlendirmesi ve `pad2` kalmadı; `toLocalIsoDate` kullanılıyor
- [ ] Mevcut `getExportFilename` testleri değişmeden geçiyor
- [ ] `git grep -n "padStart(2" -- src` ile başka bir yinelenen yerel tarih biçimlendirmesi kalmadığı kontrol edildi (ay/gün dışındaki kullanımlar hariç)
