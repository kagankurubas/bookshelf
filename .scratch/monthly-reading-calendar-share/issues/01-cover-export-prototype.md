# 01: Kapak export prototipi (karar ticket'ı)

**What to build:** Okuma Özeti kartına Open Library kapakları konduğunda `html-to-image` export'unun kapakları gerçekten PNG'ye gömüp gömmediğini gerçek tarayıcıda, SW aktifken doğrulamak; çalışmıyorsa spec'teki A–F seçeneklerinden birini kanıtla seçmek. Kalıcı kod üretmez; çıktı bir karardır.

**Blocked by:** —

**Status:** ready-for-agent

- [ ] Throwaway prototip (ayrı branch, merge edilmez): mevcut raf kartına birkaç kapak `<img>`'i eklenip mevcut `handleExport` akışıyla PNG üretiliyor
- [ ] Test edilen kapak türleri: `covers.openlibrary.org/b/isbn/...-M.jpg`, archive.org'a yönlenen `/b/id/...-L.jpg`, `default=false` ile 404 dönen ISBN, CORS vermeyen rastgele bir URL
- [ ] Her tür için şu koşullarda sonuç kaydedildi: `npm run dev`; `npm run build && npm run preview` ile SW aktif, kapaklar önce normal görünümlerde (no-cors `<img>`) yüklenmiş/cache'lenmiş halde; `cacheBust` açık ve kapalı
- [ ] SW opak-cache senaryosu doğrulandı veya çürütüldü (Open Library cache'inde opak yanıt varken CORS'lu fetch ne dönüyor) ve `cacheBust`'ın `openlibrary-cache` üzerindeki etkisi DevTools → Application → Cache Storage'da gözlendi
- [ ] Blob ön-yükleme (seçenek B) denendi: başarısız kapaklar tespit edilebiliyor mu, export ekrandakiyle birebir aynı mı
- [ ] Masaüstü Chrome'da indirme ve en az bir mobil tarayıcıda (kullanıcı tarafından) Web Share ile sonuç doğrulandı
- [ ] Karar ve gerekçe spec'in "Further Notes" bölümüne yazıldı (seçilen seçenek, SW için gereken değişiklik, kaldırılacaksa `cacheBust`); D/E (proxy) gerekiyorsa uygulamadan önce kullanıcı onayı istendi ve maliyet (Netlify/Supabase free tier güncel limitleri) belgelendi
- [ ] Gerekirse ADR 0001'e ek olarak yeni bir ADR yazıldı (yalnızca proxy veya SW stratejisi değişikliği gibi zor geri alınır bir karar çıkarsa)
