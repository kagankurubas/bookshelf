# 02: Mobilde okunur sekmeler ve anlamlı Raf/İstatistikler simgeleri

**What to build:**
- **Düzen:** 480 px altında her sekme dikey düzene geçer: 20 px simge üstte, 11 px kısa ad altta.
- **Kısa adlar** yeni bir anahtar grubundan gelir: TR Kitaplar / Tablo / Raf / İstatistik / Keşfet, EN Books / Table / Shelf / Stats / Explore.
- **Tam adlar** sekme düğmelerinin `aria-label` ve `title`'ında kalır.
- **Keşfet** mobilde gizlenmez; rozeti mobilde gizli olduğu için erişilebilir adına "yakında" bilgisi eklenir.
- **Taşma yedeği:** "İstatistik" 360 px'te taşarsa önce yazı 10 px'e iner ve dolgu azaltılır. Ölçüm: 11 px'te 47 px / 56 px, sığıyor.
- **Simgeler:** ortak simge modülünde Raf simgesi S1 (raf çizgisi, iki sırt, yaslanan kitap) ve İstatistikler simgesi C3 (eksen ve çubuklar) ile değişir; SVG'ler spec'te. Yeni dependency yok.
- 480 px üstü düzen değişmez; yeni simgeler orada da kullanılır.

**Priority:** mutlaka

**Blocked by:** 01 (aynı `nav.*` anahtarlarına ve aynı App testlerine dokunuyor)

**Status:** ready-for-human (uygulandı; 480–960 px ve masaüstü sekme düzeni elle, ticket 08)

- [x] Kısa ad anahtarları TR ve EN'de; locale eşlik testi yeşil
- [x] Mevcut testler sekmeleri tam adla bulmaya devam ediyor (erişilebilir ad değişmedi); `title` tam adı taşıyor
- [x] 360 px'te beş etiket kesilmeden sığıyor; gerçek uygulamada DevTools ile ölçülmüş, en dar etiket payı PR açıklamasında
- [x] Yeni Raf ve İstatistikler simgeleri 15, 20 ve 24 px'te net; yan yana karışmıyor
- [ ] 480–960 px ve masaüstü sekme düzeni önceki gibi (ekran görüntüsü)

## Uygulama notları (2026-10-10)

- **Ölçüm** (gerçek App, 360 px): beş kısa ad kesilmeden sığıyor, sayfa taşması yok. En dar etiket "İstatistik": 46,5 px / 56 px. Taşma yedeği (10 px) gerekmedi.
- **Simgeler:** 15, 20 ve 24 px önizlemeleri kullanıcıya gösterildi, S1 ve C3 onaylandı.
- **Sapma (kullanıcı kararı, a9163e3):** Raf simgesi S1 spec'teki stroke 2 yerine 1.6 ile çiziliyor; sırtların dolgu gibi görünmemesi ve İstatistik simgesiyle görsel ağırlığın yakınlaşması için. C3'ün çubuk kalınlığı (2.4) kullanıcı telefonda baktıktan sonra karara bağlanacak.
- **Keşfet `title`'ı:** mevcut ipucu metni ("Çok yakında: kitap arkadaşların ve topluluk") olarak kalır; tam ad ve "yakında" `aria-label`'da. Kullanıcı kararı (2026-10-10), spec güncellendi.
- Son madde (480–960 px ve masaüstü ekran görüntüsü) ticket 08'de.
