# 05: Tabloda yazar hücresi en fazla iki satır

**What to build:** Tablodaki yazar hücresi en fazla 2 satır gösterir (line-clamp) ve makul bir en büyük genişlik alır. Tam yazar metni `title` niteliğinde kalır. Yazar verisi, filtre ve arama değişmez. "İlk yazar +N" bu ticket'ta yapılmaz (bkz. 07).

**Priority:** zaman daralırsa ertelenebilir

**Blocked by:** None

**Status:** ready-for-human (uygulandı)

- [x] 360 px'te 4+ yazarlı bir satır en fazla 2 satır yüksekliğinde, sonunda üç nokta
- [x] Tek yazarlı kısa satırlar değişmemiş
- [x] Hücrenin `title` niteliğinde tam yazar metni (RTL testi: hücre tam metni `title` olarak taşır)
- [x] Masaüstünde tablo düzeni bozulmamış

## Uygulama notları (2026-10-10)

- **Ölçüm** (gerçek App, sahte veri, Supabase istekleri tarayıcıda yanıtlandı): 4 yazarlı kayıt 360/390/430 px'te 120 px genişlikte hücrede 2 satır + üç nokta, satır 76 px. Önce 111 px hücrede 7 satır, satır 133 px. Masaüstü 1280 px: 2 satıra sığıyor, kesilmiyor.
- **Yan etki:** mobilde iki yazarlı "Fyodor Dostoyevski, Lev Tolstoy" da (önce 3 satırdı) artık 2 satırda üç noktayla biter. "Yazar Adı" gibi kısa adlar değişmedi.
- **En büyük genişlik** (240 px) metni saran span'de; `td` üzerindeki `max-width` otomatik tablo düzeninde yok sayıldığı için. Hücre en az 120 px.
