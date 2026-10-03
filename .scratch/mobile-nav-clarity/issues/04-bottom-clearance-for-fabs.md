# 04: Sabit düğmeler sayfanın son içeriğini kapatmasın

**What to build:** Sabit düğmelerin boyutu ve alt mesafesi tek bir CSS değişkeninde tanımlanır. Ana kapsayıcının alt boşluğu, en yüksek düğmenin kapladığı alan + 16 px + `env(safe-area-inset-bottom, 0px)` olur: mobilde 82 px + güvenli alan, masaüstünde 108 px. Düğmelerin alt konumu da güvenli alanı ekler. `viewport-fit=cover` eklenmez.

**Priority:** mutlaka

**Blocked by:** None

**Status:** ready-for-agent

- [ ] 360 px'te İstatistikler en alta kaydırıldığında son grafiğin çubukları ve eksen etiketleri düğmelerin üstünde
- [ ] 360 px'te Kartlar en alta kaydırıldığında son kartın alt kısmı düğmelerin üstünde
- [ ] Masaüstünde AI düğmesi son içeriği kapatmıyor
- [ ] iPhone PWA'da (standalone) düğmeler ana ekran çubuğunun üstünde, alt boşluk yeterli
- [ ] AI sohbet çekmecesi ve modallar etkilenmemiş
