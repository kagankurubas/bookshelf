# 05: Tabloda yazar hücresi en fazla iki satır

**What to build:** Tablodaki yazar hücresi en fazla 2 satır gösterir (line-clamp) ve makul bir en büyük genişlik alır. Tam yazar metni `title` niteliğinde kalır. Yazar verisi, filtre ve arama değişmez. "İlk yazar +N" bu ticket'ta yapılmaz (bkz. 07).

**Priority:** zaman daralırsa ertelenebilir

**Blocked by:** None

**Status:** ready-for-agent

- [ ] 360 px'te 4+ yazarlı bir satır en fazla 2 satır yüksekliğinde, sonunda üç nokta
- [ ] Tek yazarlı kısa satırlar değişmemiş
- [ ] Hücrenin `title` niteliğinde tam yazar metni (RTL testi: hücre tam metni `title` olarak taşır)
- [ ] Masaüstünde tablo düzeni bozulmamış
