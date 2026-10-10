# Mobil düzen ve gezinme netliği

Status: ready-for-agent

Tek branch (`mobile-nav-clarity`), tek PR. Varsayılan Kitaplık işinden bağımsız; uygulama sırası: önce Varsayılan Kitaplık PR A (`default-library-guard`), sonra bu iş. Yeni özellik, karanlık mod, taşıma aracı ya da satır içi durum değişikliği yok. Kapsam: sayfa başlığı, sekme etiketleri, istatistik kartı düzeni, alt boşluk, tablo yazar hücresi ve kat terimi.

## Kararlar (2026-10-03, kullanıcı onayı)

1. **Sekmeler:** A. 480 px altında simge üstte, kısa ad altta, her sekmede.
   - Kısa adlar: TR Kitaplar / Tablo / Raf / İstatistik / Keşfet, EN Books / Table / Shelf / Stats / Explore.
   - Keşfet mobilde gizlenmez.
   - Tam adlar sekme düğmesinin `aria-label`'ında ve `title`'ında kalır. İstisna: Keşfet'in `title`'ı mevcut ipucu metni ("Çok yakında: kitap arkadaşların ve topluluk") olarak kalır; tam adı ve "yakında" bilgisi `aria-label`'da (kullanıcı kararı, 2026-10-10).
   - "İstatistik" 360 px'te taşarsa önce yazı 10 px'e iner ve dolgu azaltılır. Ölçüm: Manrope 600, 11 px'te "İstatistik" 46–47 px; 360 px'te sekme başına 56 px var. Sığıyor, düşürmek gerekmiyor; 10 px yedek olarak kalır.
   - Simgeler, 20 ve 24 px'te render edilip incelendi:
     - Raf: **S1** (raf çizgisi üzerinde iki kitap sırtı ve yaslanan bir kitap).
     - İstatistikler: **C3** (eksen ve çubuklar).
     - Dikdörtgen çubuklu C2, S1 ile neredeyse aynı göründüğü için elendi.
     - Mobil sekmede simge boyutu 20 px.
2. **İstatistik kartı:** üç metrik tek satırda, her biri dikey (simge, değer, etiket). Elle doğrulamaya çok haneli değer senaryosu ("123.456" sayfa) eklendi.
3. **Kat terimi:** EN "rows", TR "Kat". "Raf" yalnızca görünümün adı. Sayılı metin i18n çoğuluyla (`_one` / `_other`). CONTEXT.md metni kesinleşmeden önce son söz kullanıcıda; taslak aşağıda.
4. **Kat sayısı:** seçicide gösterilmez. Raf görünümünde Kat Ekle / Kat Sil düğmelerinin yanında "N kat" yazar.
5. **Ek (01, isteğe bağlı, küçük):** sekme değişince `document.title` da sayfa başlığını yansıtır ("İstatistikler · BookShelf" biçiminde).

**Öncelik:**
- **Mutlaka:** 01, 02, 04.
- **Zaman daralırsa ertelenebilir:** 03, 05, 06. Ama 06'daki "1 shelves" çoğul hatası (i18n çoğulu) her durumda bu PR'a girer.

Aşağıdaki "Open decisions" bölümü karşılaştırma kaydı olarak duruyor; seçilen seçenekler yukarıda.

**Seçilen simgeler** (prototipten, viewBox 24, stroke 2, `fill="none"`; Raf simgesi S1 uygulamada stroke 1.6, bkz. ticket 02):

```html
<!-- ShelfTabIcon (S1) -->
<path d="M3 20.5h18" /><rect x="5" y="6" width="3.6" height="14.5" rx="0.8" /><rect x="10.6" y="9" width="3.6" height="11.5" rx="0.8" /><path d="M16.4 20.5l2-10.8 3.3.7-1.8 10.1" />
<!-- DashboardTabIcon (C3); bars stroke 2.4 -->
<path d="M4 4v16h16" /><path d="M8.5 16v-4M12.5 16V8M16.5 16v-6" stroke-width="2.4" />
```

## Problem Statement

Telefonda (Android Chrome, 1080 px fiziksel genişlik, yaklaşık 360–412 CSS px) kullanıcı hangi ekranda olduğunu anlamıyor:

- **Başlık yeri tutarsız.** İstatistikler'de başlık (`İstatistikler`, altında kitaplık adı) ve Tablo'da başlık (`Kitap Listesi & Filtreleme`) araç çubuğunun (Yeni Kitaplık + kitaplık seçici) altında, görünümün kendi içinde duruyor. Kartlar ve Raf görünümlerinde başlık hiç yok.
- **Sekmeler etiketsiz.** 480 px altında sekme etiketleri CSS ile gizleniyor (`.tab-label { display: none }`); geriye yalnızca simgeler kalıyor ve simgeler kendini anlatmıyor:
  - Kartlar: ızgara
  - Tablo: tablo
  - Raf: iki dikey ve bir yatay çizgi; "H" gibi okunuyor
  - İstatistikler: satırlı bir belge; grafik ya da istatistik çağrıştırmıyor
  - Keşfet: pusula; devre dışı ve "Yakında" rozeti mobilde gizli
- **İstatistik kartı 2x2.** 640 px altında kart `flex-wrap` ile 2x2'ye dönüyor. Üçüncü metrik ("ortalama puan") sol altta tek başına kalıyor, sağı boş.
- **Sabit düğmeler içeriği kapatıyor.** `+` (sol alt, 44 px) ve AI asistanı (sağ alt, 50 px) düğmeleri 16 px alttan sabit duruyor. Sayfanın alt boşluğu 60 px; düğmeler 66 px'e kadar çıkıyor. Grafik çubuklarının ve son kartın alt kısmı düğmelerin altında kalıyor.
- **Uzun yazar listesi tabloda taşıyor.** Çok yazarlı kitaplarda yazar hücresi 4 satıra kırılıyor. Yazar alanı tek bir metin: içe aktarma ve Open Library yazarları `", "` ile birleştiriyor.
- **"(1 Kat)" / "(2 shelves)" kafa karıştırıyor.** Kitaplık seçicide her kitaplığın adının yanında kat sayısı görünüyor. Varsayılan değer 2 olduğu için neredeyse her kitaplık "(2 Kat)" diye görünüyor. Kullanıcı bunu kitaplık sayısı sanıyor. Ek sorunlar:
  - EN anahtarı çoğul eki almıyor; tek katlı kitaplık için "1 shelves" yazıyor.
  - TR arayüz aynı kavrama iki ad veriyor: seçicide "Kat", Raf görünümünde "Raf Ekle / Raf Sil".
  - Kitaplık, Ana Kitaplık ve Kat terimleri CONTEXT.md'de tanımlı değil.

## Solution

- **Ortak sayfa başlığı.** Her görünümün sayfa başlığı tek bir yerde, üst çubukla araç çubuğu arasında, ortalanmış bir `h1` olarak gösterilir. Başlık, aktif sekmenin etiketiyle aynı kavramı (aynı i18n kaynağını) kullanır. Görünümlerin kendi içindeki eski başlıklar kaldırılır.
- **Okunur sekmeler.** Mobilde de sekmeler okunur hale gelir (biçim Open decisions 1'de). Raf ve İstatistikler simgeleri anlamlarına uygun simgelerle değiştirilir.
- **İstatistik kartı.** Mobilde boşluk bırakmayan bir düzene geçer (Open decisions 2).
- **Alt boşluk.** Sayfa altına sabit düğmelerin yüksekliği, aralığı ve cihazın güvenli alanı kadar boşluk eklenir. Son içerik her zaman düğmelerin üstüne kaydırılabilir.
- **Yazar hücresi.** Tablodaki yazar hücresi en fazla iki satır gösterir; tam metin `title` niteliğinde kalır. "İlk yazar +N" kısaltması takip ticket'ına bırakılır.
- **Terimler.** Kitaplık, Ana Kitaplık ve Kat CONTEXT.md'ye eklenir. Kat sayısının seçicide nasıl ve ne zaman gösterileceği, EN karşılığı ve TR adlandırma birliği Open decisions 3 ve 4'e göre uygulanır. Çoğul eki hatası her durumda düzeltilir.

## User Stories

1. Telefon kullanıcısı olarak, her ekranın üstünde o ekranın adını görmek istiyorum, ki nerede olduğumu bileyim.
2. Telefon kullanıcısı olarak, sayfa başlığının araç çubuğunun üstünde ve ortada olmasını istiyorum, ki önce başlığı okuyayım.
3. Kartlar görünümündeki bir kullanıcı olarak, bu ekranın da bir başlığı olmasını istiyorum.
4. Raf görünümündeki bir kullanıcı olarak, bu ekranın da bir başlığı olmasını istiyorum.
5. Kullanıcı olarak, sayfa başlığıyla seçili sekmenin aynı adı taşımasını istiyorum, ki sekmeyle ekranı eşleştirebileyim.
6. Telefon kullanıcısı olarak, sekme çubuğunda simgelerin yanında ya da altında kısa bir ad görmek istiyorum, ki simgeyi tahmin etmek zorunda kalmayayım.
7. Telefon kullanıcısı olarak, 360 px genişlikte bile sekme adlarının kesilmeden okunmasını istiyorum.
8. Kullanıcı olarak, Raf sekmesinin simgesinin bir kitap rafına benzemesini istiyorum.
9. Kullanıcı olarak, İstatistikler sekmesinin simgesinin bir grafiğe benzemesini istiyorum.
10. Kullanıcı olarak, devre dışı Keşfet sekmesinin "yakında" olduğunu telefonda da anlayabilmek istiyorum.
11. Ekran okuyucu kullanıcısı olarak, hangi sekmenin aktif olduğunun duyurulmasını istiyorum.
12. Telefon kullanıcısı olarak, istatistik kartında üç metriği boşluksuz ve dengeli bir düzende görmek istiyorum.
13. Telefon kullanıcısı olarak, sayfanın en altındaki grafik çubuklarını ve son kartı sabit düğmelerin arkasında kalmadan görebilmek istiyorum.
14. Çentikli ya da hareket çubuklu bir telefonun kullanıcısı olarak, alt boşluğun cihazın güvenli alanını da hesaba katmasını istiyorum.
15. Masaüstü kullanıcısı olarak, AI düğmesinin sayfanın son içeriğini kapatmamasını istiyorum.
16. Telefon kullanıcısı olarak, tabloda çok yazarlı bir kitabın satırının dört satıra uzamamasını istiyorum.
17. Kullanıcı olarak, kısaltılmış yazar hücresinde tam yazar listesine erişebilmek istiyorum.
18. Kullanıcı olarak, kitaplık seçicide kitaplık adının yanındaki ekin ne anlama geldiğini anlamak ya da gereksizse hiç görmemek istiyorum.
19. İngilizce kullanıcı olarak, "1 shelves" gibi dil bilgisi hatası görmek istemiyorum.
20. Türkçe kullanıcı olarak, aynı kavramın arayüzün bir yerinde "Kat", başka yerinde "Raf" diye geçmemesini istiyorum.
21. Geliştirici olarak, Kitaplık, Ana Kitaplık ve Kat terimlerinin CONTEXT.md'de tanımlı olmasını istiyorum, ki kod, çeviri ve spec aynı dili konuşsun.
22. Türkçe ve İngilizce kullanıcı olarak, yeni başlıkları ve sekme adlarını kendi dilimde görmek istiyorum.
23. Masaüstü kullanıcısı olarak, üst çubuğun ve sekmelerin bugünkü görünümünün bozulmamasını istiyorum.

## Mevcut durum (inceleme özeti)

**Sekmeler** (üst çubuk bileşeni; görünüm adı, simge, i18n anahtarı, TR / EN):

| Görünüm | Simge | Anahtar | TR | EN | Simgenin okunuşu |
|---|---|---|---|---|---|
| `cards` | `GridTabIcon` (2x2 ızgara) | `nav.cards` | Kitaplar | Books | anlaşılır ama "kitap" demiyor |
| `table` | `TableTabIcon` | `nav.table` | Tablo | Table | anlaşılır |
| `shelf` | `ShelfTabIcon` (`M4 4v16 M20 4v16 M4 12h16`) | `nav.shelf` | Kitaplık Rafı | Bookshelf | "H" harfi |
| `dashboard` | `DashboardTabIcon` (satırlı belge) | `nav.dashboard` | İstatistikler | Stats | belge, istatistik değil |
| (Keşfet) | `CompassIcon` | `nav.explore` | Keşfet | Explore | anlaşılır; devre dışı, görünümü yok |

Beşinci sekme Keşfet; tıklanamaz, bir görünümü yok, rozeti (`nav.comingSoon`) 960 px altında gizleniyor. Bu yüzden sayfa başlığı dört görünüm için gerekiyor.

**Başlıklar:**
- İstatistikler: kendi içinde `h1` `dashboard.title` (TR "İstatistikler", EN "Statistics"). Altında kitaplık adı alt başlık olarak, yanında yıl seçici ve "Paylaş" düğmesi.
- Tablo: kendi içinde `h2` `table.heading` (TR "Kitap Listesi & Filtreleme", EN "Book List & Filters"), yanında filtreler.
- Kartlar ve Raf: başlık yok.
- EN'de sekme "Stats", başlık "Statistics": iki ayrı ad.

**Simge kütüphanesi:** Proje ikon paketi kullanmıyor. Simgeler, ortak simge modülünde elle yazılmış SVG bileşenleri (20 adet) ve bazı bileşenlerin içinde yerel SVG'ler. Yeni dependency gerekmiyor.

**Genişlik hesabı** (480 px altı kurallarla):
- Sekme çubuğunun iç genişliği: ekran − 32 (üst çubuk kenar boşluğu) − 2 (çerçeve) − 8 (iç boşluk) − 16 (4 aralık) = ekran − 58.
- Sekme başına kullanılabilir içerik: 5 sekmede (ekran − 58) / 5 − 4 (sekme iç boşluğu).
- Metin genişliği tahmini: Manrope 600 için ortalama 0,58 em; 11 px'te harf başına ≈ 6,4 px, 12,5 px'te ≈ 7,3 px.

| Genişlik | 5 sekmede sekme başına | 4 sekmede (Keşfet gizli) |
|---|---|---|
| 360 px | ≈ 56 px | ≈ 71 px |
| 390 px | ≈ 62 px | ≈ 79 px |
| 430 px | ≈ 70 px | ≈ 89 px |

| Etiket | Karakter | 11 px'te (≈) | 12,5 px'te, yan yana simge+metin (15 + 7 + metin) |
|---|---|---|---|
| Kitaplar / Books | 8 / 5 | 51 / 32 px | 80 / 59 px |
| Tablo / Table | 5 / 5 | 32 / 32 px | 59 / 59 px |
| Kitaplık Rafı / Bookshelf | 13 / 9 | 83 / 58 px | 117 / 88 px |
| İstatistikler / Stats | 13 / 5 | 83 / 32 px | 117 / 59 px |
| Keşfet / Explore | 6 / 7 | 38 / 45 px | 66 / 73 px |

Sonuç:
- Simge ve metin yan yana hiçbir dar genişliğe sığmıyor.
- Simge üstte, metin altta düzeninde 360 px'te bugünkü uzun TR adları ("Kitaplık Rafı", "İstatistikler") sığmıyor; kısa adlar gerekiyor.
- Bu değerler tahmindir; 360 px'te gerçek ölçüm elle doğrulama planında.

**İstatistik kartı (360 px):** iç genişlik 360 − 32 (kenar boşluğu) − 32 (iç boşluk) − 2 (çerçeve) = 294 px. Üç sütunda 14 px aralıkla sütun başına ≈ 88 px.
- Simge (40 px) ve metin yan yana sığmıyor.
- Simge üstte (32 px), değer ortada (21 px yazı, "1.234" ≈ 55 px), etiket altta 2 satır sığıyor: "kitap / tamamlandı" en uzun satır 10 karakter, 12 px'te ≈ 70 px.

**Alt boşluk:**
- Ana kapsayıcının alt boşluğu 60 px (`!important`).
- Mobilde düğmeler 16 px alttan, en yükseği 50 px: kaplama 66 px.
- Masaüstünde AI düğmesi 36 px alttan, 56 px: kaplama 92 px. `+` masaüstünde sabit değil.
- `viewport-fit=cover` yok. Bu yüzden `env(safe-area-inset-bottom)` 0 döner: iOS güvenli alan değerlerini yalnızca `viewport-fit=cover` ile verir, tarayıcıda da kurulu uygulamada (standalone) da. (İlk taslakta "PWA'da dolu olabilir" yazıyordu; 04 sırasında düzeltildi.)

**Tablo:** Tablo yatay kaydırılabilir bir kapsayıcıda ve `width: 100%`. Bu yüzden dar ekranda sütunlar sıkışıyor ve yazar hücresi kırılıyor. Yazar tek bir metin:
- Goodreads içe aktarma `Author` ile `Additional Authors`'ı `", "` ile birleştiriyor.
- StoryGraph `Authors` sütununu olduğu gibi alıyor.
- Open Library yazarları `", "` ile birleştiriyor.
- Elle girişte serbest metin; örneğin "Dostoyevski, Fyodor".

**Kat:**
- `libraries.shelf_count` (varsayılan 2): Raf görünümündeki yatay sıra sayısı. `books.shelf_row`: kitabın sırası.
- Seçici etiketi `toolbar.shelfCountSuffix`: TR "{{count}} Kat", EN "{{count}} shelves". Çoğul eki yok.
- Raf görünümü aynı kavrama TR'de "Raf Ekle / Raf Sil" (`shelf.addRow` / `shelf.removeRow`), EN'de "Add Shelf / Remove Shelf" diyor. `shelf.addRowTitle` ise "Altına yeni bir raf katı ekle" diyor.
- Sekme adı "Kitaplık Rafı / Bookshelf".

## Open decisions

### 1. Sekme etiket biçimi

| Seçenek | Nasıl | 360 px'te sığar mı | Artı | Eksi |
|---|---|---|---|---|
| **A. Her sekmede simge üstte, kısa etiket altta (önerilen)** | 480 px altında sekme dikey düzene geçer: simge ve altında 11 px etiket. Etiketler yeni kısa anahtarlardan: TR Kitaplar / Tablo / Raf / İstatistik / Keşfet, EN Books / Table / Shelf / Stats / Explore. | Evet. En uzun "İstatistik" ≈ 64 px; 56 px'e sığmazsa bu sekmede 10,5 px ya da "Grafik" kullanılır. Gerçek ölçüm elle doğrulamada. | Her sekme her zaman okunur; asıl şikâyeti doğrudan çözer; düzen sekme değişince kaymaz | Kısa adlar ikinci bir anahtar seti demek; sekme çubuğu ≈ 14 px uzar |
| **B. Yalnızca aktif sekmede etiket** | Aktif sekme genişler ve simge+etiket yan yana gösterir; diğerleri yalnız simge | Evet: 4 × 40 px simge sekmesi + aktif sekmeye ≈ 140 px; "Kitaplık Rafı" (117 px) sığar | Bugünkü uzun adlar kalır; sekme çubuğu yükselmez | Asıl şikâyet sürer: kullanıcı aktif olmayan simgeleri yine tahmin etmek zorunda. Sekme değiştikçe düzen kayar. |
| **C. A + Keşfet mobilde gizli** | A gibi; devre dışı Keşfet 480 px altında gizlenir | Rahat: 4 sekmede ≈ 71 px, uzun TR adları ("Kitaplık Rafı" hariç) sığar | En okunaklı; işlevsiz bir yuvayı kaldırır | Ürün kararı: "yakında" duyurusu mobilde kaybolur |

Öneri A. 360 px'te ölçüm "İstatistik" için taşma gösterirse yalnızca o sekmenin kısa adı değişir. C, Keşfet'in mobilde görünmesi önemli değilse daha rahat bir alternatif.

**Simgeler.** Mevcut set içinde Raf ve grafik için uygun bir karşılık yok. Öneri, ortak simge modülüne iki el yazımı SVG eklemek; bu dependency değil.

| Sekme | Bugün | Öneri | Gerekçe |
|---|---|---|---|
| Kartlar | `GridTabIcon` | **değişmez** | Kart ızgarası olarak okunuyor; etiket eklenince yeterli. Alternatif `LibraryChipIcon` (kitap) "Kitaplar" adına daha yakın, ama araç çubuğundaki kitaplık seçicide de kullanılıyor, çakışır. |
| Tablo | `TableTabIcon` | **değişmez** | Anlaşılır |
| Raf | `ShelfTabIcon` ("H") | **yeni `ShelfTabIcon` çizimi**: bir yatay raf çizgisi ve üzerinde farklı boylarda 3–4 dikey kitap sırtı | Uygulamadaki Raf görünümünün kendisine benziyor. Mevcut setteki `BarcodeChoiceIcon` (dikey çizgiler) benzer ama "barkodla ekle" seçeneğinde kullanılıyor, çakışır. |
| İstatistikler | `DashboardTabIcon` (belge) | **yeni `DashboardTabIcon` çizimi**: taban çizgisi üzerinde 3 dikey çubuk (çubuk grafik) | Görünümdeki aylık ve yıllık çubuk grafiklerle aynı dil |
| Keşfet | `CompassIcon` | **değişmez** | Anlaşılır |

### 2. İstatistik kartı mobil düzeni

| Seçenek | 360 px'te | Artı | Eksi |
|---|---|---|---|
| **A. Üç metrik tek satırda, dikey dizilmiş (önerilen)** | Sütun başına ≈ 88 px: simge 32 px üstte, değer 21 px, etiket 12 px en fazla 2 satır, ortalı | Boşluk yok; kart daha kısa (2x2'den ≈ 30 px az); üç metrik eşit ağırlıkta | Etiketler 2 satıra kırılabilir; simge küçülür |
| B. 2 + 1, üçüncü ortada | Bugünkü 2x2 ama üçüncü öğe ortalanmış | En az değişiklik | Kart yine iki satır yüksekliğinde, alt satır yine yarı boş görünür |
| C. 2 + 1, üçüncü tam genişlikte | Ortalama puan alt satırda tek başına, yatay | Boşluk yok | Üç metrikten biri farklı görünür; kart iki satır yüksekliğinde |

Öneri A, 640 px altında. 640 px üstünde bugünkü yatay düzen değişmez.

### 3. Kat teriminin EN karşılığı ve TR birliği

| Seçenek (EN) | Seçicide | Raf görünümü düğmeleri | Artı | Eksi |
|---|---|---|---|---|
| "shelves" (bugünkü) | 2 shelves | Add Shelf / Remove Shelf | Değişiklik yok | "Bookshelf" sekmesi ve "library" ile karışıyor; asıl şikâyet |
| **"rows" (önerilen)** | 2 rows | Add row / Remove row | Kısa, net; "sıra" kavramını doğrudan söylüyor | Bağlamsız "rows" tablo satırı gibi okunabilir (seçicide bağlam zayıf; bkz. karar 4) |
| "shelf rows" | 2 shelf rows | Add shelf row / Remove shelf row | En açık | Uzun; dar seçicide kesilir |
| "tiers" / "levels" | 2 tiers | Add tier | Mobilya terimine yakın | Az bilinir; "level" oyun ya da seviye çağrıştırır |

TR için:
- **Öneri: her yerde "Kat".** Raf görünümünde "Kat Ekle / Kat Sil", ipucu "Altına yeni bir kat ekle". "Raf" kelimesi yalnızca Raf görünümünün ve Raf stilinin adı olarak kalır.
- Alternatif: her yerde "Raf". O zaman seçici "2 raf" der ve sekme adı "Raf" ile çakışır.

### 4. Kat sayısı seçicide ne zaman gösterilsin

| Seçenek | Artı | Eksi |
|---|---|---|
| Her zaman (bugünkü, çoğul düzeltilmiş) | Bilgi kaybı yok | Varsayılan 2 olduğu için neredeyse her kitaplıkta görünüyor; şikâyetin kaynağı |
| Yalnızca 1'den fazla kat varken | "(1 Kat)" kalkar | Varsayılan zaten 2. Pratikte neredeyse hiçbir şey değişmez; kullanıcının ekran görüntüsündeki "(2 shelves)" kalır. |
| **Seçicide hiç gösterme; kat sayısını Raf görünümünde göster (önerilen)** | Seçici yalnızca kitaplık adlarını gösterir, karışıklık biter. Kat sayısı anlamlı olduğu tek yerde, "Kat Ekle / Kat Sil" düğmelerinin yanında "N kat" olarak görünür. | Kitaplık seçerken kat sayısı görünmez (o anda gerekli bir bilgi değil) |

Seçilen seçenekte sayılı metin i18next çoğul anahtarlarıyla yazılır (`_one` / `_other`, TR ve EN'de aynı anahtar seti).

## Implementation Decisions

- **Sayfa başlığı bileşeni.** Uygulama kabuğunda, üst çubukla araç çubuğu arasında, yalnızca bir görünüm aktifken render edilen küçük bir sayfa başlığı bileşeni.
  - Girdisi aktif görünüm; çıktısı ortalanmış bir `h1`.
  - İsteğe bağlı: aynı bileşen `document.title`'ı "<tam ad> · BookShelf" yapar. Oturum kapanınca uygulamanın varsayılan başlığına döner.
  - Başlık metni sekme etiketiyle aynı kaynaktan gelir: görünüm başına tek bir "tam ad" anahtarı. Bugünkü `nav.*` anahtarları tam ad olarak kalır.
  - EN'de İstatistikler sekmesi ve başlığı "Statistics" olarak birleşir.
  - Sekme kısa adları ayrı bir anahtar grubundan gelir (karar 1-A ya da C).
  - Keşfet'in görünümü olmadığı için başlığı yok.
- **Eski başlıkların kaldırılması.**
  - İstatistikler: kendi `h1`'i ve kitaplık adı alt başlığı kaldırılır; kitaplık adı zaten araç çubuğundaki seçicide görünüyor. Yıl seçici ve "Paylaş" düğmesi yerinde kalır. (Uygulamada başlık bloğu kalkınca kullanıcı kararıyla yıl seçici sola, Paylaş sağa alındı; bkz. ticket 01.)
  - Tablo: kendi `h2`'si kaldırılır, filtreler yerinde kalır.
  - `dashboard.title` ve `table.heading` anahtarları başka yerde kullanılmıyorsa iki dilden birlikte silinir.
  - Sayfada tek `h1` olur.
- **Sekmeler.**
  - Aktif sekme `aria-current="page"` taşır. Bugün aktiflik yalnızca CSS sınıfıyla belirtiliyor.
  - Devre dışı Keşfet'in rozeti mobilde gizli kaldığı için `aria-label`'ına "yakında" bilgisi eklenir (karar 1-C seçilirse gerekmez).
  - Mobil düzen yalnızca 480 px altı kurallarında değişir. 480–960 px ve masaüstü bugünkü gibi kalır, ama yeni simgeler her genişlikte kullanılır.
- **İstatistik kartı.** Yalnızca 640 px altı kurallar değişir (karar 2). Bileşenin JSX'i değişmez, iş CSS'te.
- **Alt boşluk.**
  - Sabit düğme yüksekliği ve alt mesafesi tek bir CSS değişkeninde tanımlanır.
  - Ana kapsayıcının alt boşluğu, en yüksek düğmenin kapladığı alan + 16 px aralık + `env(safe-area-inset-bottom, 0px)` olarak hesaplanır:
    - mobil: 66 + 16 = 82 px + güvenli alan
    - masaüstü: 92 + 16 = 108 px
  - Düğmelerin alt konumu da güvenli alanı ekler: `calc(16px + env(safe-area-inset-bottom, 0px))`.
  - `viewport-fit=cover` **eklenmez**. Eklemek iOS'ta içeriği çentiğin altına taşır ve üst kısmı da yeniden düzenlemeyi gerektirir; kapsam dışı. `env()` bugün 0 döner ve etkisizdir; ileride `viewport-fit=cover` eklendiğinde kendiliğinden devreye girer.
  - Ana kapsayıcıdaki `!important` korunur; hesap aynı kurala yazılır.
- **Yazar hücresi.** Tablodaki yazar hücresi en fazla 2 satır gösterir (`-webkit-line-clamp: 2`) ve makul bir en büyük genişlik alır. Tam metin `title` niteliğinde kalır. Veri, filtre ve arama değişmez.
  - "İlk yazar +N" bu PR'da yapılmaz. Yazar alanı tek metin ve `", "` hem yazar ayırıcı hem "Soyad, Ad" biçimi olabiliyor; "Dostoyevski, Fyodor" yanlışlıkla "Dostoyevski +1" olur. Doğru çözüm, ayırıcı kuralına ya da yazarları dizi olarak saklamaya karar vermeyi gerektiriyor. Takip ticket'ı yazılır.
- **Kat terimi.** Karar 3 ve 4'e göre:
  - seçici etiketi
  - Raf görünümü düğme ve ipucu metinleri
  - çoğul anahtarlar
  - CONTEXT.md

  CONTEXT.md'ye eklenecek terimler (taslak; kesin metin karar 3'e göre):

  ```md
  ### Kitaplık

  **Kitaplık**: Kullanıcının adını verdiği kitap koleksiyonu. Bir kitap birden fazla Kitaplıkta bulunabilir.
  _Avoid_: Raf (kitaplık anlamında), koleksiyon, liste

  **Ana Kitaplık**: Her kullanıcının tam olarak bir tane olan, silinemeyen Kitaplığı; her kitap ayrıca burada bulunur. Kullanıcının ilk Kitaplığı Ana Kitaplık olur.
  _Avoid_: varsayılan kitaplık (arayüzde), main library

  **Kat**: Bir Kitaplığın Raf görünümündeki yatay kitap sırası; her Kitaplığın en az bir Katı vardır. Yalnızca Raf görünümündeki yerleşimi belirler. İngilizce arayüzde "row".
  _Avoid_: raf (sıra anlamında), shelf (EN'de sıra anlamında)
  ```

  CONTEXT.md'nin giriş cümlesindeki "kitaplarını raflara ekler" ifadesi "kitaplarını kitaplıklara ekler" olarak düzeltilir.
- **i18n.**
  - Bütün yeni ve değişen anahtarlar TR ve EN'de birlikte değişir; mevcut eşlik testi anahtar setinin aynı kaldığını doğrular.
  - Yeni anahtarlar: kısa sekme adları (karar 1-A/C) ve kat sayısının çoğul anahtarları (`_one` / `_other`).
  - Değişenler: `nav.dashboard` (EN), `shelf.addRow`, `shelf.removeRow`, `shelf.addRowTitle`, `shelf.removeRowTitle`, `toolbar.shelfCountSuffix` (karar 4'e göre taşınır ya da silinir).

## Testing Decisions

- **İyi test:** kullanıcının gördüğünü (rol ve erişilebilir ad) doğrular, CSS sınıfını ya da iç yapıyı doğrulamaz. jsdom medya sorgularını uygulamadığı için düzen (sığma, 2x2, boşluk, satır sayısı) RTL ile test edilmez; elle doğrulamaya bırakılır. Yalnızca kritik akışlar test edilir.
- **Uygulama kabuğu testleri** (mevcut App testi; seam bu):
  - Kartlar, Tablo, Raf ve İstatistikler'e geçildiğinde sayfada tam olarak bir `h1` var ve adı aktif görünümün adı (TR: "Kitaplar", "Tablo", "Kitaplık Rafı", "İstatistikler").
  - Aktif sekme `aria-current="page"` taşıyor, diğerleri taşımıyor.
  - Mevcut "İstatistikler başlığı açılır" testi tek-`h1` kuralıyla uyumlu kalır: İstatistikler'in eski `h1`'i kaldırıldığı için çift eşleşme olmaz. Test, başlığın lazy yüklenen sayfa beklenmeden de görünmesine göre güncellenir.
  - Bir dil değiştirme testi: EN'e geçince başlık "Statistics" olur.
- **Sekme kısa adları:** sekme düğmelerinin erişilebilir adı tam ad olarak kalır. Testler bugünkü gibi düğmeyi tam adla bulur; kısa ad yalnızca görsel. Bu, mevcut testlerin kırılmamasını sağlar.
- **Raf görünümü:** karar 4'ün önerilen seçeneğinde "N kat" metni Raf görünümünde görünür; seçici seçeneklerinde kat eki yok. Tek RTL testi: `shelfCount` 1 ve 3 için "1 kat" / "3 kat".
- **Locale eşlik testi:** değişmez, yeni anahtarlarla geçmeli.
- **Güncellenecek testler:**
  - İstatistikler başlık testi.
  - Seçici etiketi metnini doğrulayan bir test varsa o (bugün yok).
  - Tablo başlığını doğrulayan bir test yok.
- **Prior art:** App testindeki lazy İstatistikler/Ayarlar açılış testi, CardsView RTL testi, locale eşlik testi.

## Elle doğrulama planı

**Ortamlar:**
- Chrome DevTools cihaz öykünmesi: 360×800, 390×844, 430×932. TR ve EN.
- Kullanıcının Android Chrome telefonu.
- iPhone Safari (tarayıcıda ve ana ekrana eklenmiş PWA olarak; güvenli alan için).
- 1280 px masaüstü (gerileme kontrolü).

**Her genişlikte ve her iki dilde kontrol edilecekler:**
1. Dört görünümün her birinde başlık araç çubuğunun üstünde ve ortada, sekme etiketiyle aynı ad.
2. Sekme etiketleri kesilmeden ve taşmadan okunuyor (en uzun: TR "İstatistik", EN "Explore"). Aktif sekme belirgin.
3. Kartlar, Tablo ve Raf'ta istatistik kartı karar 2'deki düzende, boşluksuz. Çok haneli değer senaryosu: "123.456" sayfa ve "1.234" kitap (test verisi ya da DevTools'ta değer değiştirerek). Değerler sütuna sığıyor, taşmıyor, kırılmıyor.
4. İstatistikler'de sayfanın en altına kaydırınca son grafiğin çubukları ve eksen etiketleri iki düğmenin üstünde kalıyor. Kartlar'da son kartın alt kısmı da öyle.
5. Tablo'da çok yazarlı bir kitap (en az 4 yazar) en fazla 2 satır; uzun basınca ya da imleçle tam liste görünüyor.
6. Kitaplık seçici kapalıyken ve açıkken kat eki karar 4'e uygun. Raf görünümünde "N kat" ile Kat Ekle / Kat Sil düğmeleri doğru.
7. Masaüstünde (1280 px) üst çubuk, sekmeler ve İstatistikler üst satırı bugünkü gibi; yalnızca yeni simgeler ve ortalı başlık farklı.

**Alınacak ekran görüntüleri** (PR açıklamasına; 360 px TR temel, ayrıca belirtilenler):

| # | Ekran | Genişlik | Dil |
|---|---|---|---|
| 1 | Kartlar, sayfa üstü (başlık, sekmeler, araç çubuğu, istatistik kartı) | 360, 390, 430 | TR |
| 1b | İstatistik kartı, "123.456" sayfa | 360 | TR, EN |
| 2 | Tablo, sayfa üstü | 360 | TR, EN |
| 3 | Raf, sayfa üstü ve kat düğmeleri | 360 | TR, EN |
| 4 | İstatistikler, sayfa üstü | 360 | TR, EN |
| 5 | İstatistikler, en alta kaydırılmış (düğmeler ve son grafik) | 360 | TR |
| 6 | Kartlar, en alta kaydırılmış (son kart ve düğmeler) | 360 | TR |
| 7 | Tablo, çok yazarlı satır | 360 | TR |
| 8 | Kitaplık seçici açık | 360 | TR, EN |
| 9 | Sekme çubuğu yakın çekim, en dar durum | 360 | TR, EN |
| 10 | iPhone PWA, en alta kaydırılmış (güvenli alan) | cihaz | TR |
| 11 | Masaüstü üst kısım (gerileme) | 1280 | TR |

Ek olarak önce/sonra karşılaştırması için 1, 4, 5 ve 7 `main` üzerinde de alınır.

## Out of Scope

- Yeni özellik, karanlık mod, taşıma aracı ve satır içi durum değişikliği (kullanıcı tanımı).
- Alt gezinme çubuğu (bottom navigation) ya da hamburger menü.
- `viewport-fit=cover` ve üst güvenli alan düzenlemesi.
- "İlk yazar +N" kısaltması ve yazarları dizi olarak saklama (takip ticket'ı).
- Keşfet sekmesinin işlevi.
- Masaüstü üst çubuk düzeninin yeniden tasarımı.
- Varsayılan Kitaplık spec'i (ayrı iş).

## Further Notes

- `.tab-label` 480 px altında bilerek gizlenmişti; o zamanki gerekçe yer darlığıydı. Karar 1 bu varsayımı ölçümle değiştiriyor.
- Seçici etiketindeki çoğul eki hatası ("1 shelves") karar 3 ve 4'ten bağımsız bir hata ve her durumda düzeltilir.
- Uygulama sırasında yeni bir terim çatışması çıkarsa (örneğin "Kitaplık Rafı" sekme adı ile Kitaplık terimi), domain-modeling ile CONTEXT.md aynı PR'da güncellenir.
