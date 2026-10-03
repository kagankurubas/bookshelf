# 01: Kitaplıksız kitap DB'ye gitmesin, başarısız ekleme yetim kitap bırakmasın (PR A)

**What to build:** Kitap eklemenin her yolu (kitap penceresi, içe aktarma, kuyruk senkronu) kitaplık id listesi boşsa ya da `null` içeriyorsa hiçbir şey yazmadan tipli bir "kitaplık yok" hatası fırlatır. Kitap satırı eklendikten sonra kitaplığa bağlama ya da not ekleme adımı hata verirse eklenen kitap satırı geri silinir (telafi silmesi), sonra asıl hata fırlatılır. Kaydetme hatalarını `network` | `no_library` | `rejected` olarak ayıran saf sınıflandırma modülü de bu ticket'ta eklenir. Kullanıcı açısından: başarısız bir kaydetme artık görünmez bir kitap bırakmaz. İçe aktarma, kitaplık yokken kitap eklemez ve nedenini söyler.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Boş ya da `null` içeren kitaplık listesiyle `addBook` hiçbir `books` yazması yapmadan `no_library` hatası fırlatır
- [ ] Kitaplığa bağlama hata verirse eklenen kitap satırı için silme isteği gider; asıl hata fırlar, state'e kitap eklenmez
- [ ] Not ekleme hata verirse de aynısı olur
- [ ] Telafi silmesi de hata verirse asıl hata fırlar ve olay loglanır
- [ ] Sınıflandırıcı: supabase-js ağ hatası şekli (boş `code`, `TypeError:` mesajı; Chrome ve Safari metinleri), ham `TypeError` ve çevrimdışı bayrak → `network`; `42501`/`23502`/`PGRST…` → `rejected`; tipli hata → `no_library`. Hepsi birim testli.
- [ ] İçe aktarma önizlemesi kitaplık yokken kitap eklemez ve kitaplık eksikliğini gösterir (TR/EN, mevcut ImportPreviewModal RTL testine)
- [ ] `npm test`, `npm run lint`, `npm run build` geçer
