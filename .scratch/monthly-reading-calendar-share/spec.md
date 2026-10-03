# Aylık Okuma Takvimi Paylaşım Stili

Status: ready-for-agent

Todoist: "Aylık okuma takvimi paylaşım stili (share card)" (BookShelf → Polish v1.1)

## Problem Statement

Okuma Özeti bugün yalnızca "o dönemde hangi kitapları tamamladım" sorusunu cevaplıyor: tamamlanan kitaplar raf sırtları halinde dizilip paylaşılıyor. Kullanıcı bir ay boyunca *ne zaman* okuduğunu, hangi günlerin boş geçtiğini, bir kitabın kaç gün sürdüğünü ya da hâlâ okumakta olduğu kitabı gösteremiyor. Sosyal medyada sık görülen "aylık okuma takvimi" görseli (her günün hücresinde o gün okunan kitabın kapağı) için kullanıcı bugün başka bir araca veri girmek veya ekran görüntüsü kolajı yapmak zorunda.

## Solution

Okuma Özeti ekranına bir **stil seçici** eklenir: **Raf** (bugünkü kart) / **Takvim**. Takvim stili yalnızca aylık çalışır (Takvim seçilince Ay/Yıl modu gizlenir); varsayılan olarak geçerli ayı açar, ay/yıl seçicisi gelecek ayları sunmaz.

Takvim kartı:
- Başlıkta ay adı ve yıl (örn. `Eylül 2026` / `September 2026`), altında Pazartesi→Pazar sütunlu bir ay ızgarası.
- Okunan her günün hücresinde o gün okunan kitabın kapağı; aynı gün iki kitap okunuyorsa hücre ikiye bölünür, üç ve üzeri kitapta iki kapak + `+N` rozeti.
- Bir kitabın bittiği günün hücresinde (kapağın üzerinde) yıldız puanı (puan 0 ise yıldız yok).
- Okunan kitap olmayan geçmiş günler boş hücre.
- Geçerli ay paylaşılırken bugünden sonraki günler, boş geçmiş günden açıkça ayırt edilen ayrı bir gri tonda ve kapaksız ("gün henüz gelmedi").

"Paylaş" butonu bugünkü akışı aynen kullanır: istemci tarafında PNG üretilir, mobilde Web Share API, desteklenmiyorsa indirme (ADR 0001).

## User Stories

1. Kullanıcı olarak, Okuma Özeti ekranında Raf ile Takvim stilleri arasında geçiş yapabilmek istiyorum, ki aynı ekrandan iki farklı paylaşım görseli üretebileyim.
2. Kullanıcı olarak, Takvim stilini açtığımda geçerli ayı görmek istiyorum, ki en sık paylaşacağım ay için ek seçim yapmayayım.
3. Kullanıcı olarak, ay ve yıl seçerek geçmiş bir ayın takvimini görebilmek istiyorum, ki örneğin Ekim'de Eylül'ü paylaşabileyim.
4. Kullanıcı olarak, seçicide gelecek ayları görmemek istiyorum, ki anlamsız boş bir takvim üretmeyeyim.
5. Kullanıcı olarak, yıl seçicide yalnızca tamamladığım değil okumaya başladığım kitapların yıllarını da görmek istiyorum, ki henüz hiç kitap bitirmediğim bir yılın takvimini de paylaşabileyim.
6. Kullanıcı olarak, Takvim stilinde Ay/Yıl modunun gizlenmesini istiyorum, ki takvimin yıllık bir versiyonu varmış gibi yanılmayayım.
7. Kullanıcı olarak, takvimin başlığında hangi ay olduğunu görmek istiyorum, ki paylaştığım görsel kendi başına anlaşılır olsun.
8. Kullanıcı olarak, haftaların Pazartesi'den başlamasını istiyorum, ki takvim alıştığım düzende olsun.
9. Kullanıcı olarak, bir kitabı okuduğum her günün hücresinde o kitabın kapağını görmek istiyorum, ki ay boyunca ne okuduğum bir bakışta görülsün.
10. Kullanıcı olarak, bitirdiğim kitabın bitiş günü hücresinde verdiğim yıldız puanını görmek istiyorum, ki takipçilerim kitabı ne kadar beğendiğimi görsün.
11. Kullanıcı olarak, puan vermediğim bir kitabın bitiş gününde yıldız görmemek istiyorum, ki takvim yanlışlıkla "0 yıldız" vermişim gibi görünmesin.
12. Kullanıcı olarak, bir kitabı bitirdiğim gün başka bir kitaba başladıysam, biten kitabın o günün hücresinde kalmasını ve yeni kitabın ertesi günden başlamasını istiyorum, ki bitiş günü ve yıldızı net görünsün.
13. Kullanıcı olarak, iki kitabı aynı günlerde paralel okuyorsam o günlerin hücresinde iki kapağı yan yana görmek istiyorum, ki paralel okumam da takvime yansısın.
14. Kullanıcı olarak, aynı gün üç veya daha fazla kitap okuduysam hücrede iki kapak ve kalan sayıyı gösteren bir rozet görmek istiyorum, ki hücre okunamaz hale gelmesin.
15. Kullanıcı olarak, okuma yapmadığım geçmiş günlerin boş görünmesini istiyorum, ki okuma ritmim dürüstçe yansısın.
16. Kullanıcı olarak, okumakta olduğum kitabın başladığım günden bugüne kadar dolu görünmesini istiyorum, ki devam eden okumam da takvimde yer alsın.
17. Kullanıcı olarak, geçerli ayı paylaşırken bugünden sonraki günleri boş geçmiş günlerden farklı bir gri tonda görmek istiyorum, ki "okumadım" ile "gün henüz gelmedi" karışmasın.
18. Kullanıcı olarak, geçmiş bir ayı paylaşırken hâlâ okumakta olduğum kitabın başladığı günden ayın sonuna kadar dolu görünmesini istiyorum, ki o ayın tamamında okuduğum doğru görünsün.
19. Kullanıcı olarak, önceki ay başlayıp bu ay bitirdiğim bir kitabın bu ayın 1'inden bitiş gününe kadar görünmesini istiyorum, ki ay sınırı okumamı kesmesin.
20. Kullanıcı olarak, başlangıç veya bitiş tarihini girmediğim tamamlanmış kitapların takvimde görünmemesini istiyorum, ki uygulama tarih uydurmasın.
21. Kullanıcı olarak, yarıda bıraktığım ve henüz başlamadığım kitapların takvimde görünmemesini istiyorum, ki takvim yalnızca gerçek okumalarımı göstersin.
22. Kullanıcı olarak, kapak URL'si kayıtlı olmayan ama ISBN'i olan bir kitabın kapağının ISBN'den bulunmasını istiyorum, ki barkodsuz/elle eklediğim kitaplar da kapaklı görünsün.
23. Kullanıcı olarak, kapağı hiç bulunamayan bir kitabın hücresinin yine de dolu (okundu) görünmesini istiyorum, ki kapak eksikliği okuma günümü silmesin.
24. Kullanıcı olarak, ekranda gördüğüm takvimle paylaştığım PNG'nin birebir aynı olmasını istiyorum, ki ekranda görünen bir kapak görselde eksik çıkmasın ya da tek bozuk kapak yüzünden görsel hiç üretilememesin.
25. Kullanıcı olarak, mobilde "Paylaş" butonuna bastığımda telefonumun paylaşım menüsünün açılmasını istiyorum, ki görseli doğrudan Instagram/WhatsApp'a gönderebileyim.
26. Kullanıcı olarak, masaüstünde aynı butonun görseli indirmesini istiyorum, ki dosyayı istediğim yere yükleyebileyim.
27. Kullanıcı olarak, paylaşım menüsünü iptal ettiğimde dosyanın indirilmemesini istiyorum, ki istemediğim bir indirmeyle karşılaşmayayım.
28. Kullanıcı olarak, görsel üretimi başarısız olursa anlaşılır bir hata mesajı görmek istiyorum, ki tekrar deneyebileyim.
29. Kullanıcı olarak, seçtiğim ayda hiç okuma günü yoksa bunu söyleyen bir mesaj görmek ve paylaş butonunun pasif olmasını istiyorum, ki boş bir takvim paylaşmayayım.
30. Kullanıcı olarak, indirilen dosyanın adında ayın yer almasını istiyorum, ki farklı ayların görsellerini karıştırmayayım.
31. Kullanıcı olarak, takvimin uygulamayı Türkçe kullanırken Türkçe, İngilizce kullanırken İngilizce olmasını istiyorum (gün kısaltmaları, başlık, mesajlar, paylaşım metni), ki görsel kitleme uygun dilde olsun.
32. Kullanıcı olarak, takvimin o an seçili kütüphanemin kitaplarını göstermesini istiyorum, ki Dashboard'daki diğer istatistiklerle tutarlı olsun.
33. Ekran okuyucu kullanan bir kullanıcı olarak, stil seçicinin ve ay/yıl seçicilerinin erişilebilir etiketlere sahip olmasını istiyorum, ki takvimi görmeden de üretip paylaşabileyim.
34. Kullanıcı olarak, Raf stiline geri döndüğümde Ay/Yıl modunun eskisi gibi çalışmasını istiyorum, ki mevcut paylaşım deneyimim bozulmasın.

## Implementation Decisions

### Milestone sırası
1. Kapak export prototipi (karar üretir, kalıcı kod üretmez) — ticket 01.
2. Service worker kapak cache düzeltmesi (kendi ticket'ı, kendi commit'i) — ticket 02.
3. Saf gün eşleme util'i + testleri — ticket 03.
4. UI/stil entegrasyonu — ticket 04.
5. i18n — ticket 05.

### Kayıtlı kararlar
- **Yarıda Bırakıldı kitaplar takvimde atlanır** (kullanıcı kararı). Gerekçe: CONTEXT.md'ye göre Yarıda Bırakıldı okuma istatistiklerinde ve Okuma Özeti'nde "okunmuş" sayılmaz; takvim aynı kuralı izler. Başlanmadı kitaplar da atlanır.
- **Paralel okuma bölünmüş hücreyle gösterilir** (en fazla 2 kapak + `+N`; kullanıcı kararı).
- **Kapak çözümleme sırası** `cover_image` → ISBN'den türetilen Open Library URL'si → kategori renkli karo (kullanıcı kararı).
- **Takvim, Okuma Özeti'ne Raf/Takvim stil seçicisi olarak girer** (kullanıcı kararı).
- **Edge Function proxy (seçenek E) kullanıcı onayı olmadan uygulanmaz.** 01'in sonucu E'yi gerektirirse iş durur ve kullanıcıya sorulur.

- **Takvim başlık formatı: ay adı + yıl** (`Eylül 2026` / `September 2026`), `Intl.DateTimeFormat` ile uygulamanın aktif diliyle (`{ month: 'long', year: 'numeric' }`) üretilir (kullanıcı kararı; referans görseldeki sayısal `9/2026` yerine). Ay adları için i18n dosyalarına yeni anahtar eklenmez.

### Kapak export: bilinenler ve risk
- Mevcut Okuma Özeti kartı `html-to-image` (`toBlob`, `pixelRatio: 2`, `cacheBust: true`, `skipFonts: true`) ile PNG'ye çevriliyor; bugüne kadar karta hiç uzak görsel konmadı, kapak export'u bu kodda denenmemiş bir yol.
- `html-to-image`, `<img>` kaynaklarını `fetch` ile data URL'ye çevirip gömüyor. Fetch başarısız olursa (CORS, 404, SW'nin opak yanıtı) kaynağı boş string'le değiştiriyor; klonlanan `<img>` bu yüzden yüklenemiyor ve **`toBlob` hata fırlatıyor: tek bir bozuk kapak export'un tamamını düşürür, PNG hiç üretilmez** (prototipte doğrulandı). Ayrıca `html-to-image` sonucu modül düzeyindeki bellek cache'inde, sorgu parametresi atılmış URL'yi anahtar alarak saklıyor; başarısız sonuç da cache'lendiği için **aynı sayfa oturumunda sonraki denemeler (cacheBust açık olsa bile) aynı şekilde başarısız olur**. Risk "tainted canvas" değil, export'un tamamen düşmesidir.
- Ön test (curl, `Origin` başlığıyla): `covers.openlibrary.org` `Access-Control-Allow-Origin: *` dönüyor; `/b/id/...` URL'leri archive.org'a iki adımlı 302 yönlendirmesi yapıyor ve zincirin her adımı CORS başlığı içeriyor. Tarayıcıda da doğrulandı (prototip).
- **Service worker riski:** PWA, Open Library isteklerini `CacheFirst` ile ve `cacheableResponse: { statuses: [0, 200] }` ile cache'liyor; normal görünümlerdeki `<img>` (no-cors) yüklemeleri **opak** yanıt olarak cache'e girer. Aynı URL'ye sonradan yapılan CORS'lu `fetch`'e SW opak yanıtı dönerse istek başarısız olur → kapak boş. Mevcut `cacheBust: true` URL'yi benzersizleştirip bunu atlatıyor ama her export'ta `openlibrary-cache`'e yeni kayıtlar yazıp (maks. 200) gerçek kapakları tahliye ediyor. Prototip bu yüzden SW aktifken (production build + preview) test edilmeli; `npm run dev` bu riski göstermez.
- `cover_image` her zaman Open Library değil: BookModal'da kullanıcı rastgele bir URL yapıştırabiliyor. CORS vermeyen bu tür kaynaklar hangi yöntem seçilirse seçilsin (proxy hariç) export'ta kullanılamaz.

### Kapak export: seçenekler (prototip sonucuna göre biri seçilir; spec aşamasında hiçbiri uygulanmaz)

| Seçenek | Maliyet | Risk / not |
|---|---|---|
| A. Doğrudan: `html-to-image`'in kendi fetch'i (bugünkü yol) | 0 | SW opak-cache çakışması; `cacheBust` ile cache kirliliği; başarısızlık sessiz. |
| B. İstemci blob ön-yükleme: export öncesi her kapak CORS'lu `fetch` → `Blob` → object URL; kart object URL'leri render eder; başarısızlar fallback'e düşer | 0 | A ile aynı CORS bağımlılığı, ama başarısızlık **tespit edilebilir** (önizleme = export) ve `cacheBust` gereksizleşir. SW opak-cache sorunu ayrıca çözülmeli (bkz. C). Önerilen ana yol. |
| C. SW düzeltmesi: Open Library kapaklarını CORS modunda yüklemek (`crossOrigin="anonymous"` yalnızca Open Library host'u için) veya kapak cache'inde opak yanıtı saklamamak | 0 | Uygulama genelindeki kapak görünümlerine dokunur; offline kapak davranışı ve mevcut cache girdileri için regresyon kontrolü gerekir. B ile birlikte düşünülmeli. |
| D. Netlify proxy (aynı origin'de `/covers/*` → `covers.openlibrary.org`, status 200 rewrite) | Netlify free tier bant genişliğinden yer (güncel limit doğrulanmalı) | archive.org 302'si istemciye geri dönebilir → zincir yine cross-origin olur (doğrulanmadı). Rastgele host'ları kapsamaz. |
| E. Supabase Edge Function proxy | Free tier invocation + egress kotasından yer (güncel limitler doğrulanmalı; Gemini AI kotasıyla paylaşılan proje bütçesi) | Yeni sunucu yüzeyi: açık proxy/SSRF riski, host allowlist + JWT şart, security-walls kapsamına girer; ADR 0001'in "sunucu yüzeyi açma" gerekçesiyle gerilim. Son çare. |
| F. Kapak yoksa fallback hücre | 0 | Her senaryoda son katman olarak gerekli (bkz. aşağı). |

**Karar (kullanıcı onaylı, prototip sonrası): B1 + C. Proxy (D/E) yok, yeni dependency yok.** B1 = CORS'lu fetch ile kapakları data URL'ye ön-yükleme; C = ticket 02. Ayrıntı ve kanıt: Further Notes → Prototip sonucu.

Prototipin çıktısı: hangi seçeneğin (muhtemelen B + C, gerekirse D) kullanılacağı ve gerekçesi, bu spec'in "Further Notes" bölümüne ve gerekirse yeni bir ADR'ye yazılır. D seçilirse yeni yapılandırma olduğu için kullanıcı onayı alınır. **E (Edge Function proxy) gerekirse iş durur, kullanıcıya sorulur, uygulanmaz.**

Prototipin başarı ölçütü "hata fırlatmadı" değildir: **export edilen PNG dosyası açılıp kapakların gerçekten dolu olduğu gözle doğrulanır.** Test, `vite build` + `vite preview --host` ile, service worker aktif ve kontrol ediyorken, hem masaüstünde hem de aynı ağdaki **gerçek bir telefonda (iOS Safari dahil)** yapılır.

Seçenek C (SW kapak cache düzeltmesi) 01'den ayrıdır: kendi ticket'ında (02) ve kendi commit'inde yapılır; 01 yalnızca sorunun gerçekleşip gerçekleşmediğini ve hangi düzeltmenin gerektiğini belirler.

### Tarih tipi ve saat dilimi
- `books.date_started` ve `books.date_finished` Postgres'te **`date`** tipinde (`timestamptz` değil; saat ve saat dilimi bilgisi yok). Supabase bunları `'YYYY-MM-DD'` string'i olarak döner; `useBooks` boş değeri `''`'ye çevirir.
- Util tüm günleri **takvim günü** olarak, string'i `-` ile parçalayarak işler; hiçbir tarihi `Date` nesnesine çevirip UTC'ye ya da yerel saate dönüştürmez. Dolayısıyla util'in kendisinde UTC/yerel ayrımı yoktur; kayıtlı tarih hangi günse hücre o gündür. Ay uzunluğu ve haftanın günü, yalnızca yıl/ay/gün tamsayılarından hesaplanır (saat dilimi etkisi olmayan bir yöntemle, örn. `Date.UTC` + `getUTCDay`).
- **`today` çağrıldığı yerde (UI) kullanıcının yerel saatinden üretilir**: `getFullYear()`/`getMonth()`/`getDate()` ile `'YYYY-MM-DD'`. `toISOString()` kullanılmaz (UTC'ye çevirir; Türkiye'de 00:00–03:00 arası önceki günü verir).
- Bilinen tutarsızlık (bu spec'in kapsamı dışında, ayrı ticket adayı): BookModal, durum Okunuyor/Tamamlandı'ya çevrildiğinde boş tarihi `new Date().toISOString().split('T')[0]` ile, yani **UTC** günüyle dolduruyor. Türkiye'de gece 00:00–03:00 arasında işaretlenen kitap bir önceki güne kaydedilir; takvim bu kayıtlı günü olduğu gibi gösterir.

### Saf gün eşleme modülü
- Okuma Özeti'nin mevcut saf mantığının (`readingRecap` lib) yanında, UI/DOM/Supabase'den bağımsız yeni bir saf modül. Tek dış arayüz:
  `buildReadingCalendar({ books, year, month, today })` → ay ızgarası.
  - `books`: `useBooks`'un döndürdüğü kitap nesneleri (`status`, `dateStarted`, `dateFinished`, `rating`, `coverImage`, `isbn`, `id`, `title`, `category`).
  - `year`, `month` (1–12).
  - `today`: `'YYYY-MM-DD'` yerel tarih string'i; çağıran üretir. Modül içinde `new Date()` (argümansız) çağrılmaz.
- Çıktı: Pazartesi'den başlayan haftalar; her hücre ayın bir günü veya ay dışı dolgu. Gün hücresi durumu:
  - `read` — o gün okunan kitapların sıralı listesi (her kitap için "bu gün bitti mi" bilgisiyle),
  - `empty` — okuma olmayan geçmiş/bugünkü gün,
  - `future` — bugünden sonraki gün (yalnızca geçerli ay; geçmiş aylarda hiç oluşmaz).
  - Ay dışı dolgu hücreleri ayrı bir `outside` türüyle işaretlenir.
- Tarihler string olarak parçalanır (mevcut `parseFinishedDate` yaklaşımı); `new Date('YYYY-MM-DD')` UTC kayması nedeniyle kullanılmaz.
- Takvime giren kitaplar:
  - **Tamamlandı**: `dateStarted` ve `dateFinished` ikisi de dolu ve `dateStarted ≤ dateFinished` ise; aralık başlangıç→bitiş. Aksi halde atlanır.
  - **Okunuyor**: `dateStarted` dolu ise; aralık başlangıç→(geçerli ayda bugün / geçmiş ayda ayın son günü). `dateFinished` dolu olsa bile yok sayılır. `dateStarted` bugünden sonraysa atlanır.
  - **Başlanmadı**, **Yarıda Bırakıldı**: her zaman atlanır (CONTEXT.md: Yarıda Bırakıldı "okunmuş" sayılmaz).
  - Aralık seçilen ayın sınırlarına kırpılır (önceki ay başlayan kitap ayın 1'inden görünür).
- **Kural 1 (bitiş günü önceliği):** Bir kitap X gününde bitiyorsa ve başka bir kitap X gününde başlıyorsa, yeni kitabın aralığı X+1'den başlar. Yeni kitap da X'te bitiyorsa (aynı gün başlayıp biten) kaydırılmaz, X'te kalır (kaydırma kitabın kendi bitişini geçemez).
- **Paralel okuma:** Kural 1 uygulandıktan sonra bir güne birden fazla kitap düşerse hepsi hücrenin listesinde yer alır. Sıralama: o gün biten kitaplar önce (yıldız görünsün diye), sonra başlangıç tarihi eskiden yeniye, eşitlikte `id`. Kaç kapağın gösterileceği (2) ve `+N` rozeti UI kararıdır; util tam listeyi döner.
- **Yıldız:** kitap o gün bittiyse ve `rating > 0` ise hücre o kitap için puanı taşır; `rating` 0 ise yıldız yok.
- **Kapak çözümleme** saf util'in parçası değil, ayrı bir küçük saf fonksiyon: `coverImage` varsa o (Open Library ise `openLibraryCoverUrl` ile `-M` boyut + `default=false`), yoksa `isbn` varsa `covers.openlibrary.org/b/isbn/{isbn}-M.jpg?default=false`, yoksa `null` → fallback hücre.
- Yıl seçici seçenekleri: geçerli yıl + tamamlanmış kitapların bitiş yılları + Okunuyor/Tamamlandı kitapların başlangıç yılları (mevcut `getRecapYearOptions`'ın takvim varyantı). Geçerli yılda ay seçici geçerli aydan sonrasını sunmaz.

### UI/stil entegrasyonu
- `ReadingRecap` genişletilir, yeniden yazılmaz. Yeni durum: `style: 'shelf' | 'calendar'` (varsayılan `shelf`, mevcut davranış korunur).
- Takvim seçilince Ay/Yıl toggle'ı gizlenir, mod fiilen `month` olur; ay varsayılanı geçerli ay.
- Mevcut export/paylaşım mantığı (toBlob → Web Share / indirme, AbortError'da sessiz çıkış, hata mesajı) iki stil tarafından ortak kullanılacak şekilde bileşen içinde tek yerde kalır; yalnızca dosya adı, paylaşım metni ve export öncesi kapak hazırlığı stile göre değişir.
- Takvim kartı ayrı bir alt bileşen (raf kartının yanında). Kapak hücresi: tek kitapta tam hücre, iki kitapta ikiye bölünmüş, üç ve üzerinde iki kapak + `+N` rozeti. Biten kitabın kapağı üzerinde 1–5 yıldız. Kapak yüklenemezse hücre, raf sırtlarındaki kategori rengiyle dolu ve başlık kısaltması içeren bir karo olur (`shelfSpine` lib'inin renk eşlemesi yeniden kullanılır).
- `future` hücreleri `empty` hücrelerinden farklı, açıkça ayırt edilir bir gri tonla; renkler mevcut tasarım token'larından (App.css değişkenleri).
- Export, ekranda görünenle birebir aynı olmalı: kart açılırken/ay değişince her kapak CORS'lu `fetch` ile alınıp **data URL**'ye çevrilir (object URL değil: `cacheBust` `blob:` URL'sine sorgu ekleyince fetch kırılıyor, prototipte doğrulandı); kart yalnızca data URL'leri ya da fallback karosunu render eder, böylece `html-to-image` hiçbir uzak kaynağa fetch atmaz ve tek bozuk kapak export'u düşüremez. Hazırlık bitmeden Paylaş "hazırlanıyor" durumunda kalır. Takvim export'unda `cacheBust` kullanılmaz. Aynı kapak oturum içinde tekrar fetch edilmez (ay değiştirince önceki sonuç yeniden kullanılır).
- Seçilen ayda hiç `read` hücre yoksa kart boş-durum mesajı gösterir ve Paylaş pasif olur (mevcut raf davranışıyla tutarlı).
- Dosya adı: `<prefix>-calendar-YYYY-MM.png` (prefix mevcut `readingRecap.filenamePrefix`).
- Başlık: `Intl.DateTimeFormat(<aktif dil>, { month: 'long', year: 'numeric' })` ile ay adı + yıl (bkz. Kayıtlı kararlar). Tarih nesnesi seçilen yıl/ayın 1'inden yerel saatle kurulur; saat dilimi kayması olmaz.
- Tarihi eksik veya hatalı olduğu için takvimden atlanan kitap sayısı (Tamamlandı ama tarihi eksik / `start > finish`; Okunuyor ama başlangıç tarihi yok), **görselin dışında**, seçicilerin bulunduğu ekran alanında kısa bir notla gösterilir (örn. "Tarihi eksik 2 kitap takvimde gösterilmiyor"). Yalnızca seçilen aya denk gelebilecek değil, kütüphanedeki bu tür kitapların hepsi sayılır, çünkü eksik tarihli bir kitabın hangi aya ait olduğu bilinemez. Sayı 0 ise not gösterilmez. Bu sayıyı saf modülün ayrı bir fonksiyonu üretir; Yarıda Bırakıldı ve Başlanmadı kitaplar bu sayıya girmez (tarihleri yüzünden değil, kural gereği atlanırlar).
- Yeni dependency yok; schema değişikliği yok.

### i18n
- Tüm yeni metinler `tr.json` ve `en.json`'a eklenir: stil seçici etiketleri (`Raf`/`Takvim`, `Shelf`/`Calendar`), Pazartesi-başlangıçlı kısa gün adları (TR: Pzt…Paz, EN: Mon…Sun), boş-durum mesajı, paylaşım metni (ay + okunan gün/kitap sayısı, çoğul kuralları), `+N` rozeti, erişilebilirlik etiketleri (hücre aria-label'ı: tarih + kitap başlıkları + puan), dosya adı soneki.
- Hafta her iki dilde de Pazartesi başlar (referans kuralı).

## Testing Decisions

- İyi test: yalnızca dış davranışı doğrular (verilen kitaplar/ay/bugün → hücre durumları; kullanıcı etkileşimi → görünen çıktı ve paylaşım çağrısı), iç yardımcı fonksiyonları veya ara veri yapılarını doğrulamaz. Kritik akışlara odaklanılır, sayı şişirmek için test yazılmaz.
- **Seam 1 (ana seam): saf takvim modülü** — mock'suz birim testleri. Kapsam: ızgara şekli (ayın ilk günü Pazartesi olmayan aylar, 28/29/30/31 günlük aylar, artık yıl Şubat), her durum kuralı (Tamamlandı tam aralık, eksik tarih atlanır, Okunuyor bugüne kadar / ay sonuna kadar, gelecek başlangıç atlanır, Yarıda Bırakıldı/Başlanmadı atlanır, `start > finish` atlanır), ay sınırına kırpma (önceki aydan devreden kitap), Kural 1 (aynı gün bitiş/başlangıç kayması ve aynı gün başlayıp biten istisna), paralel okuma listesi ve sıralaması, yıldız (`rating 0` → yok), `future` yalnızca geçerli ayda, `today` parametresinin tek zaman kaynağı olması, tarihlerin saat diliminden bağımsız işlenmesi (test ortamı `TZ` değiştiğinde aynı sonuç). Atlanan kitap sayısı fonksiyonu. Ayrıca kapak çözümleme fonksiyonu (coverImage → ISBN → null) ve takvim yıl seçenekleri.
  - Önceki örnek: Okuma Özeti'nin saf lib testleri, `shelfSpine` testleri.
- **Seam 2: `ReadingRecap` bileşeni (RTL)** — `html-to-image` mock'lanır. Kapsam: stil geçişi (Takvim'de Ay/Yıl toggle'ı gizli, Raf'a dönünce geri gelir), Takvim'de boş ay → mesaj + pasif Paylaş, atlanan kitap notu (sayı > 0 iken görünür, 0 iken yok, export edilen kartın içinde değil), Paylaş → `toBlob` çağrılır ve indirme/Web Share yolu çalışır. Hücre görsel detayları (bölünmüş hücre piksel düzeni, gri tonlar) testle değil elle doğrulanır.
  - Önceki örnek: mevcut bileşen testleri (ör. `CardsView`, `SettingsModal`), `CoverImage` testi.
- Kapak export'unun gerçek CORS/SW davranışı jsdom'da test edilemez; prototip ticket'ında ve PR doğrulamasında gerçek tarayıcıda (masaüstü Chrome + mobil Safari/Chrome, SW aktif production build) elle doğrulanır.
- **Release öncesi smoke test (merge sonrası, Netlify HTTPS'te):** LAN http'de telefon güvenli bağlamda olmadığı için SW kayıt olmaz ve `navigator.share` yoktur; gerçek paylaşım menüsü ve telefonda SW'li export yalnızca HTTPS'te denenebilir. Netlify deploy'unda telefonda (mümkünse iOS Safari ve Android Chrome): uygulama bir kez açılıp SW'nin sayfayı kontrol ettiği doğrulanır, kapaklı kitapların olduğu bir ay Takvim stilinde açılır, Paylaş ile native paylaşım menüsü açılır, paylaşılan/kaydedilen PNG'de kapakların dolu ve kapaksızların fallback olduğu gözle doğrulanır; menüyü iptal etmenin indirme tetiklemediği kontrol edilir.

## Out of Scope

- Yıllık takvim / çok aylık görseller.
- Takvim stili için yeni bir paylaşım kanalı (herkese açık link vb.) — ADR 0001 geçerli.
- Okuma tarihlerini toplu düzeltme/girme UI'ı (eksik tarihli kitaplar sadece atlanır).
- Günlük okunan sayfa/süre takibi; "o gün gerçekten okundu mu" bilgisi yoktur, aralık içindeki her gün okunmuş sayılır.
- Haftanın ilk gününü dile göre değiştirme (her iki dilde Pazartesi).
- Prototip sonucu D/E (proxy) çıkarsa, proxy'nin kendisi ayrı bir spec konusudur.
- Schema değişikliği, yeni dependency.

## Further Notes

- Domain terimleri CONTEXT.md'ye uygun: Tamamlandı / Okunuyor / Başlanmadı / Yarıda Bırakıldı, Okuma Özeti. Takvim, Okuma Özeti'nin bir stilidir; CONTEXT.md'ye "Takvim stili" eklenmesi uygulama sırasında değerlendirilebilir.
- Takvim, Dashboard gibi aktif kütüphanenin kitaplarını gösterir.
### Prototip sonucu (ticket 01, 2026-10-02)

Prototip throwaway branch'te yapıldı ve silindi (push edilmedi). Ölçüt, export edilen PNG'nin gözle (bir yerde piksel örneklemesiyle) kontrolüydü. Test kapakları: Open Library ISBN `-M`, archive.org'a 302 yapan Open Library `/b/id/-L`, `default=false` ile 404 dönen ISBN, CORS başlığı vermeyen bir host.

**Masaüstü Chrome, `vite build` + `vite preview --host`, localhost, SW aktif ve sayfayı kontrol ediyor:**
- Normal görünümdeki (no-cors) kapak `<img>`'leri `openlibrary-cache`'e **opak (status 0)** girdi; 404 dönen kapak da opak olduğu için 30 günlüğüne cache'lendi.
- A1 (bugünkü Okuma Özeti ayarı, `cacheBust: true`), yalnız iyi kapaklarla: kapaklar PNG'de dolu, ama her export `openlibrary-cache`'e cache-bust'lı yeni kayıtlar ekledi.
- A1, kartta tek bir 404 veya CORS'suz kapak varken: `toBlob` hata fırlattı, PNG üretilmedi.
- A2 (`cacheBust: false`), iyi kapaklarla bile: SW opak yanıt döndü, `toBlob` hata fırlattı.
- B1 (CORS'lu fetch → data URL ön-yükleme): SW opak yanıt dönünce fetch başarısız oldu ama **tespit edildi**, kart fallback gösterdi, export başarılı.
- B2 (object URL + `cacheBust: true`): `toBlob` hata fırlattı (`blob:` URL'ye sorgu eklenmesi).
- C simülasyonu (kapak `<img>`'leri `crossOrigin="anonymous"`, cache temizlenmiş): kayıtlar `cors`/200 olarak saklandı, 404 cache'lenmedi; A2 cacheBust'sız kapakları dolu üretti. **B1 + C: iki iyi kapak dolu, 404 ve CORS'suz kapak fallback; PNG ekrandaki önizlemeyle birebir aynı.**
- `crossOrigin="anonymous"` CORS'suz bir host'ta normal görünümde de görseli kırıyor → C yalnızca Open Library host'una uygulanmalı.

**Android Chrome, LAN http (`secureContext: false`, SW yok, `navigator.share` yok), kullanıcı testi:** B1: ilk iki kapak dolu, son ikisi fallback; indirilen PNG önizlemeyle aynı. A1: `toBlob` hata fırlattı, PNG üretilmedi; ikinci denemede de aynı (bellek cache'i). Masaüstüyle tutarlı.

**Mevcut Raf export'u (kod değiştirilmedi):** gerçek Okuma Özeti bileşeni, 3 tamamlanmış kitaptan 2'sinin kapağı bozukken (404 ve CORS'suz) masaüstünde SW aktifken export edildi: hata yok, konsolda hiçbir kaynak fetch denemesi yok. Sebep: Raf kartı yalnızca CSS ile çizilen sırtlardan oluşuyor; kartta `<img>` ya da CSS `url()` yok, kapak alanı Raf export'una hiç girmiyor. Açık yalnızca karta uzak görsel konunca (Takvim) ortaya çıkıyor.

**Bilinen açıklar** (release öncesi HTTPS smoke test'iyle kapatılacak, bkz. Testing Decisions):
- iOS Safari hiç test edilmedi.
- Telefonda SW'li senaryo test edilmedi (yalnızca masaüstünde doğrulandı); LAN http'de SW kayıt olmuyor.
- Gerçek native paylaşım menüsüyle export telefonda test edilmedi (http'de `navigator.share` yok).

### Kapak boyutu ölçümü ve karar (2026-10-03)

Takvim kapakları spec gereği `-M` boyutunda isteniyor; Kartlar görünümü kayıtlı boyutu (çoğunlukla `-L`) yüklüyor. URL'ler farklı olduğu için ilk takvim açılışında SW kapak cache'i ıskalanıyor ve her farklı kapak ağa gidiyor. Ölçüm (Eylül 2026, 3 kapak, Open Library `/b/id/…`):

| Durum | Süre |
|---|---|
| `-M`, soğuk ağ (`curl`, cache yok) | kapak başına 1,95–2,4 sn; bunun 1,15–1,3 sn'si 2 yönlendirme (`covers.openlibrary.org` → archive.org → archive.org) |
| `-M`, tarayıcıda soğuk (`cache: 'reload'`, 3 kapak paralel) | kapak başına 1,6–1,8 sn, toplam 1,8 sn |
| `-M`, SW cache'inde yok, HTTP disk cache'inde var | kapak başına ~225 ms |
| `-L`, SW cache'inden (Kartlar'da yüklenmiş) | 3 ms, ağ yok |

- Daha önce görülen ~20 sn'lik hazırlık tekrarlanamadı. Tarayıcı ölçümleri arka plandaki bir otomasyon sekmesinde yapıldı (`visibilityState: hidden`): 200×246 canvas için `toBlob` 1013 ms, 100 ms'lik zamanlayıcı 313 ms sürdü. Ölçülen ~1 sn'lik hazır olma tabanı bu kısıtlamadan geliyor; ~20 sn büyük olasılıkla bu kısıtlama ile soğuk archive.org isteklerinin birleşimiydi (kanıtlanmadı).
- Kayıtlı boyutu kullanmak, Kartlar'da yüklenmiş kapaklar için ağ isteğini kaldırır; ama Kartlar kapakları lazy yüklüyor, aramayla eklenen kitaplar `-M` kaydediliyor ve ISBN'den türetilen kapaklar hiçbir görünümde yüklenmiyor.
- **Karar (kullanıcı):** spec'teki `-M` kalıyor. v1.2'de gerçek cihazda (ön plandaki sekmede, telefonda) ölçülerek yeniden değerlendirilecek.

