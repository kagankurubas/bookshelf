# 07: (Takip) Tabloda "ilk yazar +N" kısaltması

**What to build:** Çok yazarlı kitaplar tabloda "İlk Yazar +N" olarak gösterilir. Önce bir karar gerekiyor: yazar alanı tek metin ve `", "` hem yazar ayırıcısı (Goodreads, Open Library) hem "Soyad, Ad" biçiminin parçası olabiliyor ("Dostoyevski, Fyodor" → yanlışlıkla "Dostoyevski +1"). Seçenekler:
- Ayırıcıyı yalnızca içe aktarma ve Open Library'den gelen kayıtlar için güvenilir saymak
- Yazarları ayrı bir dizi alanında saklamak (şema değişikliği, migration)
- Elle girişte ayrı yazar alanları

Bu PR'ın (mobile-nav-clarity) kapsamında değil.

**Blocked by:** 05

**Status:** needs-triage

- [ ] Ayırıcı ya da veri modeli kararı verildi
- [ ] Ayrı bir spec yazıldı
