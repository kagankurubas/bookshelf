# 04: Sabit düğmeler sayfanın son içeriğini kapatmasın

**What to build:** Sabit düğmelerin boyutu ve alt mesafesi tek bir CSS değişkeninde tanımlanır. Ana kapsayıcının alt boşluğu, en yüksek düğmenin kapladığı alan + 16 px + `env(safe-area-inset-bottom, 0px)` olur: mobilde 82 px + güvenli alan, masaüstünde 108 px. Düğmelerin alt konumu da güvenli alanı ekler. `viewport-fit=cover` eklenmez.

**Priority:** mutlaka

**Blocked by:** None

**Status:** ready-for-human (uygulandı; iPhone ve modal kontrolü elle)

- [x] 360 px'te İstatistikler en alta kaydırıldığında son grafik kartı (çubuklar ve eksen dahil) düğmelerin üstünde
- [x] 360 px'te Kartlar en alta kaydırıldığında son kartın alt kısmı (Kitabı Sil bağlantısı) düğmelerin üstünde
- [x] Masaüstünde (1280 px) AI düğmesi son içeriği kapatmıyor
- [ ] iPhone PWA'da (standalone) düğmeler ana ekran çubuğunun üstünde, alt boşluk yeterli (elle; aşağıdaki nota bak)
- [ ] AI sohbet çekmecesi ve modallar etkilenmemiş (elle)

## Uygulama notları (2026-10-04)

- **Ölçüm** (gerçek App, sahte oturum ve veri, Supabase istekleri tarayıcıda yanıtlandı, dışarı istek çıkmadı): sayfanın en altında son öğenin alt kenarı ile sabit düğmelerin üst kenarı karşılaştırıldı. 360/390/430 px'te dört görünümde de açık: Kartlar 35,9 px, Tablo 17,4 px, Raf 15,9 px, İstatistikler 47,9 px pay. Önceki 60 px boşlukla Tablo (−4,6 px) ve Raf (−6,1 px) düğmelerin altında kalıyordu. Masaüstü 1280 px: hepsi açık (en dar 16 px).
- **Tek değişken (2026-10-10):** ölçüler `:root` üzerinde `--fab-size`, `--fab-offset`, `--fab-margin`; `--fab-bottom` ve `--fab-clearance` bunlardan hesaplanır. Düğmeler `--fab-bottom`/`--fab-size`, sayfa altı boşluğu `--fab-clearance` kullanır; 480 px altında yalnızca boyut (50 px) ve alt mesafe (16 px) yeniden tanımlanır. Kanıt: `--fab-size` geçici olarak 80 px yapılınca 360 px'te boşluk 82'den 112 px'e çıktı, dört görünümde aralıklar aynı kaldı (35,9 / 17,4 / 15,9 / 47,9 px).
- **`viewport-fit=cover` kapsam dışı** ve eklenmedi. iOS güvenli alan değerlerini yalnızca `viewport-fit=cover` ile verdiği için `env(safe-area-inset-bottom)` bugün her yerde 0 döner; boşluk ve düğme konumları şu an `env()` olmadan da aynı. `env()` ileride `viewport-fit=cover` eklendiğinde (üst güvenli alan düzenlemesiyle birlikte, ayrı iş) kendiliğinden devreye girer. Bu yüzden "iPhone PWA'da ana ekran çubuğunun üstünde" maddesi bugünkü haliyle tarayıcının kendi iç boşluğuna dayanıyor; elle bakılmalı.
