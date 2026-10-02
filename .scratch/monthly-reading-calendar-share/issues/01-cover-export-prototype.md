# 01: Kapak export prototipi (karar ticket'ı)

**What to build:** Okuma Özeti kartına Open Library kapakları konduğunda `html-to-image` export'unun kapakları PNG'ye gerçekten gömüp gömmediğini, service worker aktifken gerçek tarayıcılarda ve gerçek bir telefonda doğrulamak; sonuca göre spec'teki A–F seçeneklerinden birini kanıtla önermek. Kalıcı kod üretmez; çıktı bir karardır.

**Blocked by:** —

**Status:** ready-for-agent

- [ ] Throwaway prototip, `monthly-reading-calendar-share`'den dallanan ayrı bir branch'te; push edilmez, iş bitince silinir
- [ ] Prototip, mevcut raf kartına birkaç kapak `<img>`'i ekleyip mevcut `handleExport` akışıyla PNG üretiyor
- [ ] Test edilen kapak türleri: `covers.openlibrary.org/b/isbn/...-M.jpg`, archive.org'a yönlenen `/b/id/...-L.jpg`, `default=false` ile 404 dönen ISBN, CORS vermeyen rastgele bir URL
- [ ] **Başarı ölçütü görsel doğrulamadır, "hata fırlatmadı" değil:** her denemede export edilen PNG dosyası açılıp kapakların gerçekten dolu olup olmadığına gözle bakıldı ve sonuç (dolu / boş / kısmen) kaydedildi
- [ ] Test ortamı: `vite build` + `vite preview --host`; service worker kayıtlı ve sayfayı kontrol ediyor (DevTools → Application → Service Workers'ta doğrulandı); kapaklar önce normal görünümlerde (no-cors `<img>`) yüklenip cache'lenmiş halde
- [ ] Masaüstü Chrome'da ve aynı ağdaki **gerçek bir telefonda, iOS Safari dahil**, PNG doğrulandı (telefon testi kullanıcı tarafından yapılır; ajan sonucu kullanıcıdan alır)
- [ ] `cacheBust` açık ve kapalı iki durumda da denendi; SW opak-cache senaryosu (Open Library cache'inde opak yanıt varken CORS'lu fetch ne dönüyor) doğrulandı veya çürütüldü; `cacheBust`'ın `openlibrary-cache` üzerindeki etkisi Cache Storage'da gözlendi
- [ ] Blob ön-yükleme (seçenek B) denendi: başarısız kapaklar tespit edilebiliyor mu, export ekrandakiyle birebir aynı mı
- [ ] SW düzeltmesi bu ticket'ta **yapılmaz**; gerekiyorsa hangi düzeltmenin gerektiği 02'ye girdi olarak yazılır
- [ ] Sonuç E'yi (Edge Function proxy) gerektiriyorsa iş durur ve kullanıcıya sorulur; uygulanmaz. D (Netlify proxy) gerekiyorsa da uygulamadan önce kullanıcı onayı istenir
- [ ] Karar ve gerekçe spec'in "Further Notes" bölümüne yazıldı (seçilen seçenek, `cacheBust`'ın kalıp kalmayacağı, 02 için gereken SW değişikliği)
