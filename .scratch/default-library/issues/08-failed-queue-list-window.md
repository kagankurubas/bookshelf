# 08: (Takip) "Gönderilemeyen kayıtlar" penceresi: Yeniden dene / Sil

**What to build:** 04'teki "N kitap gönderilemedi" şeridinden açılan küçük bir pencere. Kullanıcının `failed` kuyruk kayıtlarını başlık, yazar ve son hata sınıfıyla (ham hata değil) listeler. Her kayıt için iki işlem var:
- **"Yeniden dene":** sayacı sıfırlar, `failed`'ı kaldırır ve hemen gönderir.
- **"Sil":** onay ister, kaydı kuyruktan siler.

Bu pencere gelince `failed` kayıtları temizlemenin tek yolunun çıkış olması (04'teki bilinçli davranış) sona erer ve şerit metni güncellenir. Kaydı kitap penceresinde düzenleyip göndermek bu ticket'ta da yok.

**Blocked by:** 04

**Status:** needs-triage (PR A'nın kapsamı dışında)

- [ ] Liste yalnızca o anki kullanıcının `failed` kayıtlarını gösterir
- [ ] Yeniden dene: başarılıysa kayıt listeden ve kuyruktan çıkar; reddedilirse sayaç yeniden başlar
- [ ] Sil: onaydan sonra kayıt kuyruktan silinir; iptalde dokunulmaz
- [ ] TR/EN, `role="dialog"`, klavye ile kapanır; RTL testleri
- [ ] 04'teki "çıkış yaparsan silinirler" metni güncellendi
