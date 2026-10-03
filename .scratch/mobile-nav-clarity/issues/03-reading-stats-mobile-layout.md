# 03: İstatistik kartı mobilde boşluksuz düzen

**What to build:** 640 px altında istatistik kartında üç metrik tek satırda durur. Her biri dikey dizilir: simge üstte, değer ortada, etiket altta en fazla 2 satır, ortalı. Bileşen yapısı değişmez, yalnızca 640 px altı CSS. 640 px üstünde bugünkü yatay düzen korunur.

**Priority:** zaman daralırsa ertelenebilir

**Blocked by:** None

**Status:** ready-for-agent

- [ ] 360, 390 ve 430 px'te üç metrik boşluk bırakmadan, eşit genişlikte; etiketler en fazla 2 satır
- [ ] Çok haneli değerde ("123.456" sayfa, "1.234" kitap) taşma ya da kırılma yok; gerekirse değer yazısı dar ekranda küçülür
- [ ] "—" (puan yok) durumu da hizalı
- [ ] 640 px üstü düzen değişmemiş (ekran görüntüsü)
