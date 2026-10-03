# Varsayılan Kitaplık: yeni hesap kitaplıksız başlamasın, kitaplıksız kayıt yetim kitap bırakmasın

Status: ready-for-agent

İki PR olarak teslim edilir: **PR A** (branch `default-library-guard`; istemci, DB'ye dokunmaz) önce, **PR B** (DB: trigger, backfill, index) sonra. PR A, PR B'nin trigger'ı herhangi bir nedenle kitaplık oluşturamadığında da kullanıcıyı kurtaran savunma katmanıdır; bu yüzden önce gelir.

**Sürüm notu:** PR B, v1.1 etiketinden bağımsızdır; v1.1 PR A (ve mobil düzen işi) ile çıkabilir, PR B sonraki bir sürümle ilerleyebilir. PR A, PR B olmadan da tam çalışır: kitaplık yokken kullanıcıyı pencerede kitaplık oluşturmaya yönlendirir. Bugün depoda yalnızca `v1.0.0` etiketi var.

## Kararlar (2026-10-03, kullanıcı onayı)

1. **Dil.** Kayıt sırasında arayüz dili `signUp` metadata'sında (`locale`) gönderilir.
   - Trigger yalnızca `en` ve `tr` değerlerini tanır; başka her değer, eksik metadata dahil, "Kitaplığım" olur.
   - Metadata'dan gelen değer kitaplık adına **asla olduğu gibi yazılmaz**; yalnızca iki sabit addan hangisinin seçileceğini belirler.
   - Trigger'ın kullandığı adlar ile i18n'deki varsayılan kitaplık adı (`bookModal.defaultLibraryName`: TR "Kitaplığım", EN "My Library") bir entegrasyon testiyle eşleştirilir (bkz. Testing Decisions).
2. **Test yöntemi.** Testten doğrudan Postgres bağlantısı onaylandı, şu şartlarla:
   - `pg` yalnızca `devDependencies`'te ve sabit sürümle (`8.23.1`, `^` ya da `~` yok).
   - globalSetup'taki localhost koruması bu bağlantının adresine de uygulanır.
   - security-walls bunu doğrular.
   - Eklendiği commit'te `npm audit` çıktısı kullanıcıya gösterilir ve PR açıklamasına yazılır.
3. **Yetim önleme.** Geri silme (telafi silmesi). Kitap + bağlantı + not için tek RPC kapsam dışı takip işi olarak kayıtlı kalır.
4. **Ticket'lar ve bağımlılıklar** onaylandı.

Açık kalan tek karar: çevrimdışı kuyrukta sunucunun reddettiği kayıtların son durumu (bkz. "Açık karar: gönderilemeyen kuyruk kayıtları").

## Problem Statement

E-posta doğrulamalı yeni bir hesapla ilk girişte kullanıcının hiç kitaplığı yok. Yeni kullanıcıya kitaplık açan bir mekanizma yok: ne DB'de (`auth.users` trigger'ı yok) ne istemcide. Supabase'e geçişten beri durum bu. Kullanıcı bunu fark edemiyor: kitap ekleme penceresindeki "Kitaplıklar" bölümü boş görünüyor, Kaydet'e basınca "Kaydedilemedi. Bağlantını kontrol et…" mesajı çıkıyor. Kullanıcı bağlantısında bir sorun var sanıp tekrar deniyor.

Her deneme veritabanında **yetim kitap** bırakıyor: kitap satırı ekleniyor, kitaplığa bağlama adımı (kitaplık id'si `null`) reddediliyor, hata gösteriliyor ama kitap satırı geri alınmıyor. Canlıda tek bir kullanıcıda 6 dakika içinde 16 yetim kitap oluştu. Yetim kitaplar hiçbir kitaplık görünümünde çıkmıyor. Buna rağmen yazar ve etiket önerilerine, Tablo görünümündeki yazar filtresine, dışa aktarmaya, içe aktarmadaki "olası kopya" işaretine ve AI asistanının bağlamına giriyorlar.

Aynı kök neden başka yerlerde de var. Kitaplıksız içe aktarma, kitapları hata vermeden yetim olarak ekliyor. Çevrimdışıyken eklenen kitap `null` kitaplık id'siyle kuyruğa giriyor, bağlantı gelince her senkronda reddediliyor ve kuyruk ilk hatada durduğu için arkasındaki tüm kayıtları kilitliyor.

Canlıda bugün kitaplığı olmayan 2 hesap var (ikisinin de kitabı yok). Birden fazla Ana Kitaplığı olan kullanıcı yok.

## Solution

**PR A (istemci):**
- Kitaplıksız kitap hiçbir yoldan veritabanına gitmez: kitap ekleme, içe aktarma ve çevrimdışı kuyruk bunu en baştan reddeder.
- Kitap eklenip kitaplığa bağlanamazsa eklenen kitap satırı geri silinir.
- Kitaplık yokken kitap ekleme penceresi bunu açıkça söyler. Aynı yerde, bir isim alanı ve "Oluştur" düğmesiyle kitaplık oluşturulabilir. İlk kitaplık otomatik olarak Ana Kitaplık olur ve seçili gelir.
- "Bağlantını kontrol et" mesajı yalnızca gerçek ağ hatasında çıkar. Sunucunun reddettiği kayıt (doğrulama/RLS) ve kitaplık eksikliği ayrı, doğru mesajlar alır.
- Çevrimdışı kuyruk tek bir bozuk kayıt yüzünden kilitlenmez. Kitaplığı eksik eski kayıtlar senkron sırasında Ana Kitaplığa bağlanarak onarılır.

**PR B (DB):**
- Her yeni hesap kayıt anında (e-posta doğrulamasından önce) bir Ana Kitaplıkla başlar.
- Kitaplık oluşturma bir nedenle başarısız olursa kayıt yine tamamlanır; hata log'a uyarı olarak düşer ve PR A'daki pencere kullanıcıyı karşılar.
- Bugün kitaplığı olmayan hesaplara bir kez Ana Kitaplık açılır.
- Veritabanı, bir kullanıcının birden fazla Ana Kitaplığı olmasına izin vermez.

## User Stories

1. Yeni kayıt olmuş bir kullanıcı olarak, ilk girişte hazır bir kitaplık görmek istiyorum, ki hemen kitap ekleyebileyim.
2. E-posta doğrulamalı kayıt olan bir kullanıcı olarak, doğrulama bağlantısına hangi cihazdan tıkladığımdan bağımsız olarak kitaplığımın hazır olmasını istiyorum.
3. İngilizce arayüzle kayıt olan bir kullanıcı olarak, varsayılan kitaplığımın adını kendi dilimde görmek istiyorum (karar bekliyor, bkz. Implementation Decisions / Dil).
4. Kayıt olan bir kullanıcı olarak, arka planda kitaplık oluşturma başarısız olsa bile kaydımın tamamlanmasını istiyorum, ki hesabımı kaybetmeyeyim.
5. Kitaplığı olmayan bir kullanıcı olarak, kitap ekleme penceresinde "henüz kitaplığın yok" diye net bir açıklama görmek istiyorum.
6. Kitaplığı olmayan bir kullanıcı olarak, kitap ekleme penceresinden çıkmadan, yazdığım bilgileri kaybetmeden kitaplık oluşturabilmek istiyorum.
7. Pencereden kitaplık oluşturan bir kullanıcı olarak, yeni kitaplığın kitabım için otomatik seçilmesini ve Ana Kitaplık olmasını istiyorum.
8. Kitaplığı olmayan bir kullanıcı olarak, kitaplık oluşturmadan Kaydet'in beni yanıltıcı bir hata mesajına götürmemesini istiyorum: Kaydet devre dışıdır ya da nedenini açıkça söyler.
9. Bağlantısı gerçekten kopan bir kullanıcı olarak, "bağlantını kontrol et" mesajını görmek istiyorum, ki tekrar denemem gerektiğini bileyim.
10. Kaydı sunucu tarafından reddedilen bir kullanıcı olarak, bağlantı mesajı yerine "kaydedilemedi, sorun bağlantında değil" anlamında bir mesaj görmek istiyorum, ki boşuna tekrar denemeyeyim.
11. Bir kullanıcı olarak, başarısız bir kaydetme denemesinin arkasında görünmez bir kitap bırakmamasını istiyorum, ki yazar önerilerim, dışa aktarmam ve AI asistanım hayalet kitaplarla dolmasın.
12. Bir kullanıcı olarak, kitap eklenip kitaplığa bağlanamadığında, aynı kitabı tekrar denediğimde kopya oluşmamasını istiyorum.
13. Kitaplığı olmayan bir kullanıcı olarak, içe aktarma denediğimde kitapların sessizce görünmez eklenmesi yerine önce kitaplık oluşturmam gerektiğini söyleyen bir mesaj görmek istiyorum.
14. Çevrimdışıyken kitap ekleyen bir kullanıcı olarak, kitaplığım yoksa bunun kuyruğa alınmadan önce söylenmesini istiyorum.
15. Kuyrukta bekleyen kitapları olan bir kullanıcı olarak, bir kaydın sunucu tarafından reddedilmesinin arkasındaki diğer kitapların senkronunu durdurmamasını istiyorum.
16. Önceki bir sürümde kitaplıksız kuyruğa girmiş kitapları olan bir kullanıcı olarak, bağlantı gelince bu kitapların Ana Kitaplığıma eklenmesini istiyorum.
17. Kuyrukta bekleyen kitapları olan bir kullanıcı olarak, gerçek bir ağ kesintisinde senkronun durmasını ve kayıtlarımın kuyrukta kalmasını istiyorum (bugünkü davranış korunur).
18. Bir kullanıcı olarak, iki sekmede aynı anda ilk kitaplığımı oluştursam bile tek bir Ana Kitaplığım olmasını istiyorum.
19. Türkçe arayüz kullanan bir kullanıcı olarak, tüm yeni mesajları Türkçe görmek istiyorum; İngilizce arayüzde İngilizce.
20. Bugün kitaplığı olmayan mevcut bir hesap sahibi olarak, güncellemeden sonra ilk girişte hazır bir Ana Kitaplık görmek istiyorum.
21. Geliştirici olarak, yeni kullanıcı trigger'ının mevcut RLS entegrasyon testlerini bozmadığını CI'da görmek istiyorum.
22. Geliştirici olarak, backfill'in ikinci kez çalıştırıldığında hiçbir şey değiştirmediğini testle görmek istiyorum.
23. Bakımcı olarak, canlıya push öncesi yedek, kontrol ve geri alma adımlarının yazılı olmasını istiyorum, ki push'u güvenle onaylayabileyim.

## Implementation Decisions

### PR A: istemci

- **Kitaplık değişmezi `useBooks.addBook` içinde.** Kitap ekleme, kitaplık id listesi boşsa ya da geçersiz (`null`/boş) bir id içeriyorsa, kitap satırını yazmadan önce tipli bir "kitaplık yok" hatası fırlatır. Kitap ekleme penceresi, içe aktarma ve çevrimdışı kuyruğun senkronu aynı fonksiyondan geçtiği için tek kontrol hepsini kapsar. İçe aktarma bugün boş listeyle çağırıyor; artık reddedilir ve önizleme penceresi bunu kitaplık eksikliği olarak gösterir.
- **Yetim satır bırakmama: telafi silmesi (compensating delete).** Kitap satırı eklendikten sonra kitaplığa bağlama ya da not ekleme adımı hata verirse, `addBook` eklediği kitap satırını silip asıl hatayı yeniden fırlatır. Kitabın kitaplık bağlantıları ve notları cascade ile birlikte gider. Silme de başarısız olursa (örneğin ağ tam o anda koptu) asıl hata yine fırlatılır ve olay konsola loglanır; yetim kalma ihtimali kabul edilir.

  | | Telafi silmesi (seçilen) | Kitap + bağlantı + not tek RPC'de |
  |---|---|---|
  | Atomiklik | En iyi çaba; silme isteği de ağdan geçer | Tek transaction, tam atomik |
  | DB değişikliği | Yok (PR A'nın "DB'ye dokunmaz" kuralına uyar) | Yeni migration ve fonksiyon; PR B'ye ya da üçüncü bir PR'a kayar |
  | Maliyet | Küçük; mevcut mock'lu hook testleriyle test edilir | Kitap kolon eşlemesi SQL'de ikinci kez yazılır; `editBook` de tutarlılık için aynı modele çekilmek ister; RLS entegrasyon testi gerekir |
  | Kalan risk | Kitap eklendi, bağlama ağ hatasıyla düştü ve silme de düştü: yetim kalır, kullanıcı "bağlantı" mesajı görür ve tekrar denerse kopya oluşur | Yok; ağ hatasında ya hepsi yazılmıştır ya hiçbiri |

  Kitaplık değişmezi en büyük ve bilinen nedeni (`null` kitaplık) tamamen kaldırdığı için kalan risk, ağın iki istek arasında kopması gibi dar bir pencere. Atomik RPC, Out of Scope'ta takip işi olarak duruyor.
- **Hata sınıflandırması tek bir saf modülde.** Yeni modül bir kaydetme hatasını üç sınıftan birine ayırır: `network` | `no_library` | `rejected`. Kurallar:
  - `no_library`: tipli kitaplık hatası.
  - `network`: tarayıcı çevrimdışı bildiriyorsa ya da hata bir fetch hatasıysa. Bu, ham `TypeError` olabilir ya da supabase-js'in döndürdüğü, `code` alanı boş ve mesajı `TypeError:` ile başlayan hata (Chrome "Failed to fetch", Safari "Load failed").
  - `rejected`: geri kalan her şey; SQLSTATE ya da `PGRST` kodu taşıyan sunucu yanıtları (RLS `42501`, not-null `23502`, check `23514` vb.).

  Önceki "API hata durumları" spec'indeki ilke korunur: ağ ayrımı mesaj metninin yorumlanmasına değil, çevrimiçi bayrağı ve fetch hata şekline dayanır.
- **Kitap ekleme penceresinin mesajları.** Pencere, kaydetme hatasını bu modülle sınıflandırır:
  - `network`: mevcut `bookModal.saveError` metni ("Kaydedilemedi. Bağlantını kontrol et…"), artık yalnızca bu durumda.
  - `rejected`: yeni `bookModal.saveRejectedError`. TR: "Kaydedilemedi. Sorun bağlantında değil; girdiklerin kaybolmadı, sayfayı yenileyip tekrar dene." EN karşılığıyla.
  - `no_library`: yeni `bookModal.noLibraryError`. TR: "Kitabı kaydetmek için önce bir kitaplık oluştur." EN karşılığıyla.

  Kesin metinler PR'da TR/EN olarak gözden geçirilir.
- **Kitaplık yokken pencere.** Kitaplık listesi boşsa "Kitaplıklar" bölümü boş bir çip satırı yerine şunları gösterir:
  - açıklama: `bookModal.noLibrariesHint` ("Henüz bir kitaplığın yok.")
  - dilin varsayılan kitaplık adıyla önceden doldurulmuş bir isim alanı: `bookModal.defaultLibraryName` (TR "Kitaplığım", EN "My Library")
  - bir "Oluştur" düğmesi

  Oluşturma başarılı olunca yeni kitaplık çip olarak görünür ve seçili gelir. Formdaki diğer alanlar korunur. Kitaplık yokken Kaydet devre dışıdır. Oluşturma hata verirse pencere içinde mevcut `alerts.createLibraryError` metni gösterilir (`alert()` kullanılmaz). Pencere, kitaplık oluşturmayı yeni bir `onCreateLibrary` prop'uyla dışarıdan alır.
- **"İlk kitaplık Ana Kitaplık olur" kuralı tek yerde.** Bugün bu kural yalnızca App'teki araç çubuğu akışında. Kural `useLibraries.createLibrary` içine taşınır: kullanıcının hiç kitaplığı yoksa yeni kitaplık `is_default = true` ile oluşturulur. Araç çubuğu ve pencere kısayolu aynı fonksiyonu çağırır.
- **İkinci Ana Kitaplık ihlali bir hata değil, bayat durum.**
  - PR B'deki unique index, iki sekme ya da cihaz aynı anda "ilk kitaplığı" oluşturduğunda ikinci `is_default = true` eklemesini `23505` ile reddeder.
  - Bu kod, Ana Kitaplık index'inin adıyla birlikte gelirse `createLibrary` bunu genel `rejected` sınıfına düşürmez ve kullanıcıya hata mesajı göstermez.
  - Bunun yerine kitaplıkları yeniden çeker ve şöyle devam eder:
    - *Pencere kısayolu* (varsayılan adla oluşturma): ikinci bir kitaplık açmaz; yeni çekilen Ana Kitaplığı seçili döndürür.
    - *Araç çubuğu* (kullanıcının yazdığı adla): aynı adı `is_default = false` ile bir kez daha ekler, çünkü kullanıcının açıkça istediği kitaplık kaybolmamalı. Bu ikinci deneme de hata verirse genel sınıflandırma uygulanır.
  - Index PR A'dan sonra gelse de davranış PR A'da yazılır ve mock'lu testle doğrulanır, ki PR B canlıya çıktığı gün istemci hazır olsun.
- **Çevrimdışı kuyruk.**
  - *Kuyruğa giriş:* kitaplık id listesi geçersizse kayıt kuyruğa alınmaz, aynı `no_library` hatası fırlatılır. Kontrol, ekle-ya-da-kuyruğa-al kararından önce, çevrimiçi/çevrimdışı ayrımı yapılmadan çalışır.
  - *Onarım:* senkron her kaydı göndermeden önce kitaplık id listesindeki `null` ve boş değerleri atar ve Ana Kitaplığı ekler. Bu, `useLibrary`'nin "her kitap Ana Kitaplıkta da bulunur" kuralıyla aynı. Böylece önceki sürümde `[null]` ile kuyruğa girmiş kayıtlar Ana Kitaplığa bağlanarak senkronlanır. Kullanıcının hiç kitaplığı yoksa senkron başlamaz: hazır olma koşuluna "en az bir kitaplık var" eklenir ve kayıtlar kuyrukta kalır.
  - *Kilitlenmeme:* senkron bir kayıtta `network` hatası alırsa durur, kalanlar kuyrukta bekler (bugünkü davranış). `rejected` ya da `no_library` hatasında o kaydın deneme sayacını ve son hata sınıfını kayda yazar, loglar ve **sonraki kayda geçer**. Arkasındakileri bekletmez. Bu, mevcut "ilk hatada dur" testinin değiştiği bilinçli bir davranış değişikliği.
  - *Sessizce sonsuza kadar kalmama:* reddedilen bir kayıt kuyrukta sessizce sonsuza kadar beklemez; son durumu aşağıdaki açık karara göre belirlenir. Kayıt alanlarına deneme sayısı, son hata sınıfı ve son deneme zamanı eklenir. Aynı object store kullanıldığı için IndexedDB sürüm yükseltmesi gerekmez.

- *Kapsam güncellemesi (2026-10-03 bulguları):*
  - Kuyruk bugün cihazdaki herkes için ortak ve çıkışta temizlenmiyor. Bu yüzden A'nın kayıtları B'nin oturumuyla gönderilebiliyor; `[null]` onarımı da A'nın kitabını B'nin Ana Kitaplığına bağlayabilirdi.
  - Kayıtlarda istemci kimliği yok; yanıtı kaybolan bir isteğin tekrar gönderimi çift kitap üretir.
  - 04 bu yüzden kuyruğu kullanıcıya özel yapar (`ownerId`), çıkışta ve hesap silmede temizler ve kayıtlara istemci kimliği (`clientBookId`) ekler.
  - Ayrıntı, açık kararlar (D1–D3) ve test planı ticket 04'te. Liste penceresi takip ticket'ı 08.
  - Aşağıdaki seçenek kaydında seçilen: seçenek 1'in yalnızca veri tarafı (kullanıcı kararı).

### Açık karar: gönderilemeyen kuyruk kayıtları

Sunucu tarafından reddedilen kayıt (`rejected`) çoğunlukla deterministiktir; aynı veri tekrar gönderilince yine reddedilir. Geçici bir 5xx de `rejected` sınıfına düşer, bu yüzden birkaç deneme hakkı anlamlı.

| Seçenek | Nasıl | Artı | Eksi |
|---|---|---|---|
| **1. "Gönderilemeyen kayıtlar" listesi (önerilen)** | N = 3 başarısız denemeden sonra kayıt `failed` olarak işaretlenir ve otomatik senkrondan çıkar. Çevrimdışı şeridi yanında ya da yerinde "N kitap gönderilemedi" bağlantısı görünür; açılan küçük pencerede her kayıt için başlık, yazar, son hata, "Yeniden dene" ve "Sil" bulunur. | Kullanıcının verisi kaybolmaz; neyin neden gönderilemediğini görür; geçici hatalar 3 denemede kendiliğinden çözülür | En büyük kapsam: yeni küçük bir pencere, 2 düğme, TR/EN metinler ve RTL testleri; PR A'yı büyütür |
| 2. N denemeden sonra bildirimle atmak | 3 başarısız denemeden sonra kayıt silinir; kullanıcıya bir kez "Şu kitaplar eklenemedi: …" bildirimi gösterilir | Küçük kapsam; kuyruk her zaman temizlenir | Veri kaybı: kullanıcı kitabı yeniden girmek zorunda; bildirim kaçırılırsa iz kalmaz |
| 3. Yalnızca sayaç, sınırsız deneme | Kayıt kuyrukta kalır, şeritte "N kitap bekliyor (gönderilemiyor)" yazar; işlem yok | En küçük kapsam | Kullanıcının elinde çözüm yok; asıl şikâyet (sessiz takılma) yalnızca görünür hale gelir |

Öneri 1. "Yeniden dene" kaydın sayacını sıfırlar ve hemen gönderir; "Sil" onay ister. Kitabı penceresinde düzenleyip gönderme bu PR'da yok (takip). Kapsam PR A için büyük bulunursa: PR A'da seçenek 1'in veri tarafı (sayaç, `failed` işareti, otomatik senkrondan çıkarma ve şeritte sayı) yapılır, liste penceresi ayrı bir takip ticket'ına ayrılır.
- **Tüm yeni çeviri anahtarları TR ve EN'de birlikte eklenir.** Mevcut locale eşlik testi eksik anahtarı yakalar.

### PR B: DB

- **Yeni migration'lar (016, 017; sıra önemli).**
  - *016: tekil Ana Kitaplık ve backfill.*
    1. Backfill: kitaplığı olmayan her kullanıcıya bir Ana Kitaplık. `auth.users`'tan, `libraries`'te satırı olmayanlar. Ad, Dil kararına göre belirlenir: metadata seçeneğinde kullanıcının metadata'sındaki dil, yoksa varsayılan. `shelf_count` 2, `is_default` true. `not exists` koşuluyla idempotent.
    2. Kısmi unique index: `libraries (user_id) where is_default`, adı **`libraries_one_default_per_user_idx`**. İstemci (`useLibraries`) ikinci Ana Kitaplık ihlalini bu adla tanıdığı için ad değişmemeli. Canlıda çakışma olmadığı doğrulandı. Migration yine de önce 007'nin 1. adımındaki gibi "birden fazla Ana Kitaplık varsa en eskisi kalsın" düzeltmesini idempotent biçimde çalıştırır, ki yerel ya da başka bir ortamda index oluşturma kırılmasın.
    3. Yetim kitaplar kitaplığa **bağlanmaz** (kapsam dışı).
  - *017: yeni kullanıcı trigger'ı.*
    - `public.handle_new_user()`: `security definer`, `set search_path = ''`, tüm tablo adları şemayla (`public.libraries`). `auth.users` üzerinde `after insert for each row` trigger'ı.
    - Gövde: Ana Kitaplığı `on conflict (user_id) where is_default do nothing` ile ekler. Bütün gövde `exception when others then raise warning '…', sqlerrm` ile sarılıdır: kitaplık oluşturma hatası kaydı düşürmez, uyarı Postgres log'una gider. `return new`.
    - `revoke execute ... from public, anon, authenticated`; 014 ve 015 ile aynı desen.
- **Neden e-posta doğrulamasından önce:** `auth.users` satırı `signUp` anında oluşur. Trigger orada çalışır, doğrulama ile giriş arasında bir yarış yoktur.
- **Security walls.** `handle_new_user`, `scripts/security-walls` exceptions'ındaki `securityDefinerFunctions` listesine gerekçesiyle eklenir: "`auth.users`'a yazılan yeni kullanıcı için `public.libraries`'e satır açmalı; o anda istek sahibi bir oturum yok." RLS ve security definer duvarı bunu zorunlu tutuyor.
- **`supabase/schema.sql`** yeni index, fonksiyon ve trigger ile güncellenir. README'ye göre yeni projeler bu dosyayla kuruluyor. Backfill schema.sql'e girmez.
- **Dil: karar seçenek 1** (signUp metadata'sı). Trigger, `raw_user_meta_data->>'locale'` değerini yalnızca `= 'en'` karşılaştırmasında kullanır: eşitse "My Library", aksi her durumda "Kitaplığım". Ad hiçbir zaman metadata değerinden türetilmez. Backfill'de metadata'sı `en` olanlar "My Library", diğerleri "Kitaplığım" alır. Karşılaştırma kaydı:

  | Seçenek | Nasıl | Artı | Eksi |
  |---|---|---|---|
  | 1. signUp metadata'sı (önerilen) | Kayıt ekranı arayüz dilini (`tr`/`en`) `signUp`'ın `options.data.locale` alanında gönderir. Trigger `raw_user_meta_data->>'locale'` değerine bakar: `en` ise "My Library", aksi halde "Kitaplığım". | Kitaplık doğduğu anda doğru dilde; kayıt dili en iyi sinyal; az kod | Metadata kullanıcı tarafından değiştirilebilir (zararsız: yalnızca iki sabit addan biri seçilir, beyaz liste dışı değer varsayılana düşer). Admin ya da dashboard ile oluşturulan kullanıcılar ve backfill varsayılanı alır. Kullanıcı sonra arayüz dilini değiştirirse ad değişmez. |
  | 2. Sabit "Kitaplığım" | 007 ile aynı | En basit, istemci değişikliği yok | İngilizce kullanıcı Türkçe ad görür |
  | 3. Adı boş bırakıp istemcide çevirmek | `name` boş ya da işaretli; istemci `t('…defaultLibraryName')` gösterir | Arayüz dili değişince ad da değişir | Adı okuyan her yere dokunur: araç çubuğu, dışa aktarma, Okuma Özeti, AI bağlamı. `name not null` anlamı bozulur; en pahalısı |
  | 4. İlk girişte istemcide yeniden adlandırma | Ad varsayılan sabitse ve dil farklıysa günceller | Mevcut hesaplar için de çalışır | Yarışlı ve sihirli; kullanıcının bilinçli seçtiği "Kitaplığım" adını da değiştirebilir |

  Seçenek 1 seçilirse kayıt ekranı ve `useAuth.signUp` küçük bir istemci değişikliği alır ve bu değişiklik PR B'ye girer.
- **Hesap silme etkilenmez.** Kitaplık, kitap ve AI sohbet tablolarının `user_id` FK'leri `on delete cascade`. delete-account Edge Function `auth.admin.deleteUser` ile kalıcı silme yapıyor. Kitaplığa bağlı olmayan kitaplar da `books.user_id` cascade'iyle siliniyor. Canlıda bunun gerçekten böyle tanımlı olduğu, push öncesi kontrollerde bir kez sorgulanır (aşağıda).

### Canlıya push (PR B merge edildikten sonra; ancak açık onayla)

Sıra `docs/agents/supabase-migrations.md` ile uyumlu:

1. **Durum kontrolü (salt okunur).**
   - `npx supabase migration list --linked`: 001–015 `remote` sütununda dolu, yalnızca 016 ve 017 bekliyor olmalı. Farklıysa dur; 013 öncesinde olduğu gibi `migration repair` öncesi canlı şema elle karşılaştırılır.
   - `npm run check:security -- --linked`: migration geçmişi ve policy duvarı.
   - `supabase db query --linked` ile ön ölçümler:
     - kitaplığı olmayan kullanıcı sayısı (beklenen 2) ve id'leri; geri alma için not edilir
     - birden fazla Ana Kitaplığı olan kullanıcı sayısı (beklenen 0)
     - `pg_constraint`: `books`, `libraries`, `ai_conversations` için `user_id` FK'lerinde `confdeltype = 'c'`
     - `auth.users` üzerinde başka trigger var mı (`pg_trigger`)
2. **Yedek.** 2026-10-03'te Supabase CLI 2.119.0 ile doğrulananlar:
   - **`supabase db dump` Docker gerektirir.** pg_dump'ı bir Docker konteynerinde çalıştırıyor. Docker daemon kapalıyken `--db-url` ile denendi: `DockerRunError: failed to inspect docker image: failed to connect to the docker API`. Bu makinede Docker 29.7.2 kurulu ama Docker Desktop açık değil; yerelde `pg_dump` da yok.
   - **`supabase db query` Docker gerektirmez.** Aynı denemede doğrudan Postgres'e bağlanmaya çalıştı (`DbConnectError`, Docker hatası değil). `--linked` modu Management API üzerinden çalışıyor (`--help`: "Queries the linked project's database via Management API").

   Bu yüzden yedek iki katmanlı:
   - **(a) Tam yedek, Docker ile.** Docker Desktop açılır. Komut önce yerelde denenir: `supabase start` + `npx supabase db dump --local -f local-check.sql` çalışmalı ve dosya dolu olmalı. Bu deneme başarılıysa canlıya karşı:
     - `npx supabase db dump --linked -f backup-schema.sql`
     - `npx supabase db dump --linked --data-only -f backup-data.sql`
     - `npx supabase db dump --linked --role-only -f backup-roles.sql`
     - Dosyaların boş olmadığı ve `public.libraries` tanımı ile verisini içerdiği kontrol edilir.
   - **(b) Hedefli yedek, Docker'sız.** Değişiklik yalnızca `public.libraries` tablosuna (backfill satırları) ve `auth.users` üzerindeki bir trigger'a dokunuyor. `npx supabase db query --linked "select * from public.libraries order by user_id, created_at"` çıktısı bir dosyaya kaydedilir. Komutun çıktı biçimi önce yerel DB'de (`--local`) denenir.
   - (a) çalışmazsa push, (b) alınmadan yapılmaz. Supabase Dashboard'daki otomatik yedekler plana bağlı ve bu oturumda doğrulanmadı; yedek planı bunlara dayanmaz.
   - Bu runbook'ta yerelde doğrulanmamış hiçbir komut canlıya karşı çalıştırılmaz.
3. **Kuru çalıştırma:** `npx supabase db push --dry-run`. Yalnızca 016 ve 017 listelenmeli.
4. **Push:** `npx supabase db push`, yalnızca kullanıcının açık onayıyla.
5. **Doğrulama (salt okunur).**
   - `migration list`'te 016 ve 017 uygulanmış görünmeli.
   - `pg_trigger` ve `pg_proc`: fonksiyon `security definer`, `proconfig` içinde `search_path=""`.
   - Index `pg_indexes`'te görünmeli.
   - Kitaplığı olmayan kullanıcı sayısı 0 olmalı.
6. **Elle doğrulama:** kullanıcı iPhone Safari'de yeni bir e-postayla kayıt olur, doğrular, girer. Ana Kitaplık hazır olmalı ve kitap eklenebilmeli. Test hesabı sonra uygulama içinden silinir.

**Geri alma planı:**
- **Trigger'ı kaldırmak:** `drop trigger if exists on_auth_user_created on auth.users; drop function if exists public.handle_new_user();` yeni kayıtları anında eski davranışa döndürür. PR A'nın kitaplık-yok ekranı devrede kalır.
- **Index'i kaldırmak:** `drop index if exists …;`, tek başına güvenli.
- **Backfill ile açılan kitaplıklar** ön ölçümde not edilen id'lerle tanımlanır. Yalnızca hâlâ kitapsızlarsa silinir; kitap eklenmişse bırakılır.
- **Kayıt geçmişi:** `supabase migration repair --status reverted 016 017` geçmişi şemayla uyumlu tutar.
- Bu adımlar ancak gerektiğinde ve yine onayla çalıştırılır.

## Testing Decisions

- **İyi test:** dışarıdan gözlenen davranışı test eder: hook'un ne döndürdüğünü ya da fırlattığını, Supabase'e hangi yazma isteklerinin gittiğini, kullanıcının ekranda ne gördüğünü. İç state'i ya da çağrı sırasını test etmez. Testler yalnızca bu akışlar için kritik olanlarla sınırlı.
- **PR A: seam'ler (hepsi mevcut).**
  - `useBooks` hook testi (mock'lu supabase builder, mevcut desen):
    - boş ya da `null` içeren kitaplık listesiyle `addBook` hiçbir `books` yazması yapmadan `no_library` fırlatır
    - kitaplığa bağlama hata verdiğinde eklenen kitap satırı için silme isteği gider ve asıl hata fırlar
    - not ekleme hata verdiğinde de aynısı olur
    - silme de hata verirse asıl hata fırlar
  - Hata sınıflandırma modülü için saf birim testi: supabase-js'in ağ hatası şekli (boş `code`, `TypeError:` mesajı; Chrome ve Safari metinleri), ham `TypeError`, çevrimdışı bayrak, `42501`/`23502`/`PGRST…` kodlu yanıtlar, tipli kitaplık hatası.
  - `BookModal` RTL testleri (mevcut dosya):
    - kitaplık yokken açıklama ve önceden dolu isim alanı görünür, Kaydet devre dışıdır
    - "Oluştur" `onCreateLibrary`'yi çağırır; dönen kitaplık seçili çip olarak görünür, girilen başlık ve yazar korunur
    - üç hata sınıfının her biri doğru metni gösterir (TR); `network` dışındaki sınıflarda bağlantı metni görünmez
    - oluşturma hatası pencere içinde gösterilir
  - `useLibraries` hook testi:
    - kitaplığı yokken oluşturulan ilk kitaplık `is_default: true` ile, sonrakiler `false` ile gönderilir
    - Ana Kitaplık index'inden `23505` gelince hata fırlamaz, kitaplıklar yeniden çekilir
    - pencere kısayolu yeniden çekilen Ana Kitaplığı döndürür ve ikinci bir ekleme yapmaz
    - araç çubuğu akışı aynı adı `is_default: false` ile bir kez yeniden ekler
    - başka bir constraint'ten gelen `23505` genel sınıflandırmaya düşer
  - `useOfflineBookQueue` ve `useAddOrQueueBook` hook testleri (mevcut):
    - geçersiz kitaplıkla çevrimdışı ekleme kuyruğa yazmaz ve `no_library` fırlatır
    - `libraryIds: [null]` olan eski kayıt senkronda Ana Kitaplıkla gönderilir
    - `rejected` hata veren kayıt kuyrukta kalır, deneme sayacı artar ve sonraki kayıt senkronlanır
    - 3. başarısız denemeden sonra kayıt otomatik senkrondan çıkar ve "gönderilemedi" sayısına girer (seçilen seçeneğe göre: liste, yeniden dene ve sil; ya da bildirimle atma)
    - `network` hatası senkronu durdurur (mevcut test bu ayrıma göre güncellenir)
    - kitaplık yokken senkron başlamaz
  - İçe aktarma önizlemesi: kitaplık yokken içe aktarma kitap eklemez ve kitaplık eksikliğini söyler (mevcut ImportPreviewModal testine).
- **PR B: seam'ler.**
  - Mevcut: `tests/integration/rls` fixture'ı (`admin.createUser` + gerçek oturum).
    - Yeni kullanıcı tam olarak bir Ana Kitaplıkla başlar; adı metadata'daki dile göre seçilir (`en` → "My Library", yok ya da `tr` → "Kitaplığım").
    - Kullanıcı ikinci bir `is_default = true` kitaplık eklemeye çalışınca unique ihlaliyle reddedilir.
    - Kullanıcı başkasının id'siyle Ana Kitaplık oluşturamaz (mevcut RLS kapsamı korunur).
  - **Varsayılan ad eşleşmesi:** entegrasyon testi locale dosyalarındaki `bookModal.defaultLibraryName` değerlerini okur. Üç kullanıcı oluşturur: metadata `locale` `tr`, `en` ve geçersiz bir değer (örneğin `'; drop table` gibi bir metin ya da `de`). Trigger'ın açtığı kitaplık adları sırasıyla TR, EN ve TR değeriyle birebir eşleşmeli; geçersiz değer adın hiçbir yerinde görünmemeli. i18n'deki ad değişip trigger değişmezse (ya da tersi) bu test kırılır.
  - **Yeni seam (onaylandı): testten doğrudan Postgres bağlantısı.**
    - `pg@8.23.1` yalnızca `devDependencies`'te, sabit sürümle.
    - Bağlantı adresi `supabase status -o env`'deki `DB_URL`'den gelir. CI'da mevcut env üretme adımına eklenir; yerelde `.env.test.local`'e `SUPABASE_DB_URL` olarak yazılır.
    - globalSetup'taki localhost koruması `SUPABASE_DB_URL`'in host'unu da kontrol eder: localhost ya da 127.0.0.1 değilse çalıştırma durur. Değişken yoksa doğrudan bağlantı gerektiren testler atlanmaz, açık hata verir.
    - security-walls'ta localhost-koruma duvarı genişler: koruma uzak bir `SUPABASE_DB_URL` ile çalıştırılınca exit 1 beklenir. Yeni bir kural da `pg`'nin `dependencies`'te olmadığını ve `devDependencies`'te sabit sürümle durduğunu doğrular. Duvar kuralı gereği her yeni kural için bozuk bir örnekle (bad-example) test yazılır.
    - `pg` eklendiği commit'te `npm audit` çıktısı kullanıcıya gösterilir ve PR açıklamasına yazılır.

    Şu iki test için gerekli; PostgREST üzerinden yapılamıyorlar:
    1. *Trigger hatası kaydı düşürmez.* Test, `libraries`'e her eklemeyi reddeden geçici bir constraint ya da trigger ekler, `admin.createUser`'ın başarılı olduğunu ve kullanıcının kitaplıksız oluştuğunu doğrular, sonra geçici nesneyi kaldırır.
    2. *Backfill idempotent.* Kitaplıksız bir kullanıcı hazırlanır (trigger'ın açtığı kitaplık silinerek). Backfill SQL'i migration dosyasından okunup iki kez çalıştırılır. İlk çalıştırma tam olarak bir Ana Kitaplık açar, ikincisi hiçbir satır değiştirmez.

    (Değerlendirilip elenen alternatif: bu iki doğrulamayı CI'da bir SQL betiğiyle yapmak.)
  - **Mevcut testlerin kırılmaması:** `tests/integration/rls` içindeki testler kitaplıkları id ile buluyor. Kullanıcı başına kitaplık sayısını varsayan bir doğrulama yok (`toHaveLength` yalnızca AI sohbet ve notlarda, id'ye göre süzülmüş). Yine de PR B'de tüm entegrasyon paketi yerelde ve CI'da koşturulur, sonuç PR açıklamasına yazılır.
  - `npm run check:security` yeni security definer fonksiyonla geçmeli.
- **Prior art:** önceki "API hata durumları" spec'i (ağ ve "bulunamadı" ayrımı), migration 014 ve 015 (definer, revoke, grant deseni), 007 (idempotent onarım), mevcut `useOfflineBookQueue` testleri.

## Out of Scope

- **Canlıdaki 16 yetim kitabı kitaplığa bağlamak ya da silmek.** Ayrı karar. PR A yenilerinin oluşmasını engeller, mevcutları temizlemez.
- **Kitap ekleme, bağlama ve notları tek atomik RPC'ye taşımak** (ve `editBook`'u aynı modele çekmek). Takip işi; kullanıcı kararıyla kayıtlı (2026-10-03).
- **Gönderilemeyen kuyruk kaydını kitap penceresinde düzenleyip yeniden gönderme.** Takip işi.
- **Yetim kitapların yazar ve etiket önerilerinden, dışa aktarmadan, içe aktarma kopya kontrolünden ve AI bağlamından süzülmesi.** Ham kitap listesini kullanan yerler bilerek değiştirilmiyor.
- **"2 shelves" / "2 Kat" etiketinin anlaşılırlığı** ve CONTEXT.md'ye Kitaplık, Ana Kitaplık, Kat terimlerinin eklenmesi. Ayrı bir `domain-modeling` işi.
- **Kitaplık yeniden adlandırma arayüzü.**
- **AI asistanının kitap sorgusundaki sırasız `limit(200)`.**

## Further Notes

- **Kitap silme (inceleme):** kitap satırının kendisini siliyor (`books` üzerinde id ile `delete`). Kitaplık bağlantıları ve notlar cascade ile gidiyor; yalnızca bağlantının kaldırıldığı bir akış yok.
- **Yazar önerileri (inceleme):** Tablo görünümündeki yazar filtresi ve kitap penceresindeki yazar önerisi, kitaplık filtresinden geçmemiş ham kitap listesinden her render'da türetiliyor. Kitap silinince state'ten düştüğü için hemen yenileniyor. Yetim kitaplar sayfa yenilendikten sonra bu listeye giriyor.
- **AI asistanı (inceleme):** Edge Function kitapları `user_id` ile, kitaplık bağlantısına bakmadan sorguluyor. Yetim kitaplar bağlama giriyor.
- **Hesap silme (inceleme):** `books.user_id` (001 ve 003), `libraries.user_id` ve `ai_conversations.user_id` → `auth.users on delete cascade`; `book_libraries` ve `notes` → `books`/`libraries` cascade. delete-account `auth.admin.deleteUser` ile kalıcı siliyor. Kitaplığa bağlı olmayan kitaplar da siliniyor; ayrı bir bulgu yok. Tek çekince: canlı şema elle uygulanmış migration'larla kuruldu, bu yüzden push öncesi FK sorgusu bu güvenceyi canlıda da doğrular.
- **İçe aktarma (bulgu):** kitaplıksız hesapta içe aktarma bugün hata vermeden yetim kitap üretiyor. PR A'daki tek kontrol bunu da kapatıyor.
