# 01: Aynı gün biten iki puanlı kitapta yalnızca birinin yıldızları görünüyor

**Status:** needs-triage

## Gözlem (PR 2 code-review, 2026-10-03)

Takvim hücresindeki yıldız bandı `cell.books.find((entry) => entry.rating)` ile ilk puanlı biten kitabın puanını gösteriyor. Aynı gün iki kitap biter ve ikisi de puanlıysa ikincinin puanı görselde yok; hücrenin `aria-label`'ında ikisi de var (örn. "21 Eylül: A (4 yıldız), B (5 yıldız)").

Spec: "Biten kitabın kapağı üzerinde 1–5 yıldız". Yıldızlar bölünmüş hücrede kırpıldığı için tüm hücre genişliğine taşınmıştı; bu yüzden şu an tek bant var.

## Yapılacak (yön, karar gerekli)

- [ ] Seçenekler: iki bant üst üste; her yarıda küçük yıldız sayısı ("★4"); ya da en yüksek puan + "+1" işareti
- [ ] Seçilen biçim export edilen PNG'de okunur kalıyor
