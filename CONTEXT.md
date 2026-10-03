# Bookshelf

Kişisel kitap takip uygulaması: kullanıcılar kitaplarını raflara ekler, okuma durumlarını takip eder ve okuma istatistiklerini görür.

## Language

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
