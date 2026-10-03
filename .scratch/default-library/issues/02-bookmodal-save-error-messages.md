# 02: "Bağlantını kontrol et" yalnızca gerçek ağ hatasında (PR A)

**What to build:** Kitap penceresi kaydetme hatasını 01'deki sınıflandırıcıyla ayırır:
- `network`: mevcut bağlantı mesajı
- `rejected`: yeni "Kaydedilemedi, sorun bağlantında değil" mesajı
- `no_library`: yeni "Önce bir kitaplık oluştur" mesajı

Form her durumda açık kalır ve girilenler korunur. Düzenleme akışı da aynı sınıflandırmayı kullanır.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Üç hata sınıfı için RTL testi: doğru metin görünür; `network` dışındaki sınıflarda bağlantı metni görünmez
- [ ] Yeni anahtarlar (`bookModal.saveRejectedError`, `bookModal.noLibraryError`) TR ve EN'de; locale eşlik testi geçer
- [ ] Mevcut kitabı düzenlerken de aynı sınıflandırma uygulanır
