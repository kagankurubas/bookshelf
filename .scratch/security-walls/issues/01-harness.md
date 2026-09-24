# 01: security-walls altyapısı (runChecks, CLI, kayıt listesi, istisnalar)

**What to build:** Geliştirici `npm run check:security` komutunu çalıştırdığında, kayıtlı tüm duvarları çalıştıran ve PASS / FAIL / SKIP sonuçlarını (FAIL'lerde `dosya:satır` ile) basan deterministik bir Node script'ine sahip olur. Herhangi bir FAIL process'i sıfırdan farklı kodla bitirir. Bu ticket'ta henüz gerçek bir duvar yok; sonraki ticket'ların üzerine oturacağı iskelet kurulur.

**Blocked by:** —

**Status:** ready-for-agent

**Not:** Spec'teki "Mantık script'te, skill ince", "Kontrol modülü şekli", "Tek giriş noktası (seam)" ve "Bilinçli istisnalar tek listede" kararlarını uygula. Migration okuyucu (dosyaları numara sırasıyla okuyup `create table` / `enable row level security` / `create policy` / `drop policy [if exists]` / `create or replace function` ifadelerini sırayla uygulayarak tablo, policy ve fonksiyonların **son durumunu** çıkaran yardımcı) burada `ctx`'e girer, çünkü 02, 05 ve 07 aynı sonucu paylaşır. `--linked` bayrağı `ctx.linked` olarak taşınır.

- [ ] `runChecks({ root, linked })` verilen repo kökü üzerinde registry'deki tüm kontrolleri sırayla çalıştırıp birleşik sonuç listesini döndürüyor
- [ ] Her kontrol modülü `{ id, title, run(ctx) }` şeklinde; sonuçlar `status` (`pass`/`fail`/`skip`), `message`, opsiyonel `file`/`line` içeriyor
- [ ] Bir kontrolün `run`'ı exception fırlatırsa o kontrol için FAIL sonucu üretiliyor (script çökmüyor, kontrol sessizce kaybolmuyor)
- [ ] `ctx` şunları içeriyor: `root`, `linked`, takip edilen dosya listesi (`git ls-files`), migration'lardan çıkarılan tablo/policy/fonksiyon son durumu
- [ ] Migration okuyucu, sonradan `drop policy` ile silinen ya da aynı adla yeniden oluşturulan policy'nin son halini doğru döndürüyor
- [ ] İstisnalar config modülü, her girdinin gerekçesiyle birlikte oluşturuldu (ilk içerik 02-06'da doldurulacak)
- [ ] CLI sonuçları duvar başlığına göre gruplanmış, okunur şekilde basıyor ve FAIL varsa `exit 1` ile çıkıyor; `--linked` bayrağını kabul ediyor
- [ ] `package.json`'a `check:security` script'i eklendi
- [ ] Testler Node ortamında `npm test` suite'i içinde çalışıyor; fixture dizinleri için ortak bir yardımcı var (geçici dizine küçük bir "repo" kurma)
- [ ] Gerçek repo kökü üzerinde `runChecks` çağrıldığında hiçbir `fail` dönmediğini doğrulayan pozitif test eklendi (bu ticket'ta registry boş olduğu için doğal olarak geçer; sonraki duvarlarla anlam kazanır)
