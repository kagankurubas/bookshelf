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

Kullanıcının seçtiği bir ay ya da yıl içinde tamamladığı kitapları, mevcut raf (sırt) görselini kullanarak paylaşılabilir bir kart halinde özetleyen ekran.
_Avoid_: Paylaşım ekranı, özet ekranı
