# 01: Okuma Özeti'nde `today` modal açılırken sabitleniyor

**Status:** needs-triage

## Gözlem (PR 2 code-review, 2026-10-03)

`ReadingRecap` bugünün tarihini `useState(() => toLocalIsoDate())` ile modal açılırken bir kez hesaplıyor. Modal gece yarısını geçecek kadar açık kalırsa:

- Takvimde dünden sonraki gün hâlâ "gelecek" (kesikli gri) görünür, Okunuyor kitap bugüne uzamaz.
- Geçerli ay/yıl (ay seçicideki üst sınır) ay sınırını geçince eski ayda kalır.

Etki küçük (modalı kapatıp açmak düzeltiyor), ama paylaşılan görselde bir gün eksik görünebilir.

## Yapılacak (yön)

- [ ] `today` modal açıkken gün değişince yeniden hesaplanıyor (örn. sonraki gece yarısına zamanlayıcı, ya da export anında yeniden okuma)
- [ ] Test: sahte saatle gece yarısı geçilince hücre durumları güncelleniyor
