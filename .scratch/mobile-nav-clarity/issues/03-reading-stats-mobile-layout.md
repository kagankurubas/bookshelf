# 03: İstatistik kartı mobilde boşluksuz düzen

**What to build:** 640 px altında istatistik kartında üç metrik tek satırda durur. Her biri dikey dizilir: simge üstte, değer ortada, etiket altta en fazla 2 satır, ortalı. Bileşen yapısı değişmez, yalnızca 640 px altı CSS. 640 px üstünde bugünkü yatay düzen korunur.

**Priority:** zaman daralırsa ertelenebilir

**Blocked by:** None

**Status:** ready-for-human (uygulandı; "—" durumu ve 640 px üstü elle, ticket 08)

- [x] 360, 390 ve 430 px'te üç metrik boşluk bırakmadan, eşit genişlikte; etiketler en fazla 2 satır
- [x] Çok haneli değerde ("123.456" sayfa, "1.234" kitap) taşma ya da kırılma yok; gerekirse değer yazısı dar ekranda küçülür
- [ ] "—" (puan yok) durumu da hizalı
- [ ] 640 px üstü düzen değişmemiş (ekran görüntüsü)

## Uygulama notları (2026-10-10)

- **Ölçüm** (gerçek yazı tipiyle, metin genişliği `Range` ile): üç metrik 360/390/430 px'te TR ve EN'de, "123.456" sayfaya kadar tek satırda, taşma yok. 320 px'te en uzun etiketler 2 satıra iniyor, taşmıyor.
- Değer yazısı 640 px altında 20 px (spec önerisi 21 px; ticket küçültmeye izin veriyor). Etiketin `max-width: 100%` alması "books completed"daki 1 px taşmayı giderdi.
- Değişiklik yalnızca `@media (max-width: 640px)` içinde; 640 px üstü ekran görüntüsü ve "—" (puan yok) durumu ticket 08'de elle bakılacak, o yüzden iki madde açık.
