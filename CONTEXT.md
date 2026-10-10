# Bookshelf

Kişisel kitap takip uygulaması: kullanıcılar kitaplarını kitaplıklara ekler, okuma durumlarını takip eder ve okuma istatistiklerini görür.

## Language

<!-- TASLAK (mobile-nav-clarity, ticket 06): Kitaplık bölümü kullanıcının son onayını bekliyor. Onaydan sonra bu yorum ve aşağıdaki "Taslak notları" yorumu silinir. -->

### Kitaplık

**Kitaplık**: Kullanıcının adını verdiği kitap koleksiyonu. Bir kitap birden fazla Kitaplıkta bulunabilir.
_Avoid_: Raf (kitaplık anlamında), koleksiyon, liste

**Ana Kitaplık**: Kullanıcının silinemeyen Kitaplığı. Kullanıcının ilk Kitaplığı Ana Kitaplık olur. Uygulama eklediği ve düzenlediği her kitabı Ana Kitaplığa da bağlar.
_Avoid_: varsayılan kitaplık (arayüzde), main library

**Kat**: Bir Kitaplığın Raf görünümündeki yatay kitap sırası; her Kitaplığın en az bir Katı vardır. Yalnızca Raf görünümündeki yerleşimi belirler. İngilizce arayüzde "row".
_Avoid_: raf (sıra anlamında), shelf (EN'de sıra anlamında)

<!-- Taslak notları (onaydan sonra silinir):
- "her kitap ayrıca burada bulunur" çıkarıldı: kanıtlanamadı. Kodda yalnızca uygulamanın yazdığı kitaplar için geçerli: useLibrary.withDefaultLibrary (ekleme, düzenleme, toplu tarama), ImportPreviewModal (yalnızca Ana Kitaplık), queuedBookRepair (çevrimdışı kuyruk); hepsi 028f73e (2026-08-25) ile geldi. Veritabanında bunu zorlayan kısıt ya da tetikleyici yok; migration 007 yalnızca hiç kitaplığı olmayan kitapları Ana Kitaplığa bağladı, yalnızca başka bir Kitaplıkta olan eski kitaplara dokunmadı. Canlı veriye sorgu atılmadı. Yerine kanıtlanabilen dar kural yazıldı: "Uygulama eklediği ve düzenlediği her kitabı Ana Kitaplığa da bağlar."
- "tam olarak bir tane" de çıkarıldı: bugün yalnızca istemci sağlıyor (ilk Kitaplık Ana olur; useLibraries ikinci Ana Kitaplığı reddeden indeks hatasını yakalar). Benzersiz indeks (libraries_one_default_per_user_idx) PR B ile gelecek; o zaman "her kullanıcının tam olarak bir Ana Kitaplığı vardır" eklenebilir. Ana Kitaplık işaretli değilse uygulama ilk Kitaplığı Ana sayar (findDefaultLibrary).
- "silinemeyen": arayüz silme düğmesini göstermiyor (LibraryToolbar) ve useLibraries.deleteLibrary reddediyor; veritabanında engel yok.
- "en az bir Kat": Kat Sil düğmesi yalnızca 1'den fazla Kat varken görünür, useShelfDnd de 1'in altına inmez. Kat sayısı boşsa 2 sayılır.
- Arayüzde "Raf" kalan yerler: sekme adı ("Kitaplık Rafı" / kısa "Raf"), Okuma Özeti'nin "Raf stili" ve giriş ekranındaki "raflarını düzenle" (genel anlamda; istersen "kitaplıklarını düzenle" yapılabilir).
-->

### Kitap Durumu

**Tamamlandı**: Kullanıcının bitirdiğini işaretlediği kitap durumu. Bir kitabın belirli bir dönemde (ay/yıl) "okunmuş" sayılması için hem durumu Tamamlandı olmalı hem de bitirme tarihi (`date_finished`) dolu ve o döneme denk gelmelidir; kaydın uygulamaya ne zaman eklendiği sayılmaz.
_Avoid_: Bitti, Okundu (durum adı olarak)

**Okunuyor**: Kullanıcının şu anda okumakta olduğu kitap durumu.

**Başlanmadı**: Kullanıcının rafa eklediği ama henüz okumaya başlamadığı kitap durumu.

**Yarıda Bırakıldı**: Kullanıcının okumaya başlayıp bitirmeden bıraktığı kitap durumu. Okuma istatistiklerinde ve Okuma Özeti'nde "okunmuş" sayılmaz.

### Okuma Özeti

Kullanıcının seçtiği bir dönemdeki okumasını paylaşılabilir bir kart (PNG) halinde özetleyen ekran. İki stili vardır:
_Avoid_: Paylaşım ekranı, özet ekranı

**Raf stili**: Seçilen ay ya da yıl içinde **Tamamlandı** kitapları, raf (sırt) görseliyle gösteren kart.

**Takvim stili**: Seçilen ayı Pazartesi başlangıçlı bir takvim olarak gösteren kart. Her günün hücresinde o gün okunan kitabın kapağı, kitabın bittiği günde puanı yer alır. **Tamamlandı** kitaplar başlangıç ve bitiş tarihleri arasında; **Okunuyor** kitaplar başlangıç tarihinden bugüne (geçmiş bir ayda ay sonuna) kadar görünür. **Başlanmadı** ve **Yarıda Bırakıldı** kitaplar ile tarihi eksik ya da hatalı kitaplar takvime girmez. Yalnızca aylık çalışır; gelecek aylar seçilemez.
