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

**Status:** ready-for-agent

- [ ] Kısa ad anahtarları TR ve EN'de; locale eşlik testi yeşil
- [ ] Mevcut testler sekmeleri tam adla bulmaya devam ediyor (erişilebilir ad değişmedi); `title` tam adı taşıyor
- [ ] 360 px'te beş etiket kesilmeden sığıyor; gerçek uygulamada DevTools ile ölçülmüş, en dar etiket payı PR açıklamasında
- [ ] Yeni Raf ve İstatistikler simgeleri 15, 20 ve 24 px'te net; yan yana karışmıyor
- [ ] 480–960 px ve masaüstü sekme düzeni önceki gibi (ekran görüntüsü)
