# 03: Duvar 2 — Sızıntı taraması

**What to build:** `check:security`, git'te takip edilen dosyalarda production Supabase adresi, gizli anahtar veya `service_role` JWT'si olmadığını; hassas dosyaların gitignore'da olduğunu ve `.env.example`'ın boş değerler içerdiğini doğrular.

**Blocked by:** 01

**Status:** ready-for-agent

**Not:** Spec'teki "Duvar 2 — Sızıntı" kararı. Production ref'i script'e **gömülmez**; varsa Supabase CLI'ın gitignore'daki local link bilgisinden okunur. İzinli local demo JWT'leri `iss` değeriyle tanınır ve bu değer istisnalar config'inde durur. README'deki canlı Netlify linki gizli bilgi değildir.

- [x] Takip edilen dosyalarda `*.supabase.co` adresi, `sb_secret_` önekli anahtar, `AIza…` Gemini anahtarı veya `sk-ant-` anahtarı bulunursa FAIL (`dosya:satır`)
- [x] Bulunan her JWT'nin payload'ı çözülüyor: `service_role` her yerde FAIL, `anon` takip edilen dosyalarda FAIL, local demo `iss`'li olanlar izinli
- [x] Build çıktısı varsa yalnızca `service_role` JWT'si için taranıyor; yoksa bu alt kontrol SKIP
- [x] Production ref'i local link bilgisinden okunabiliyorsa takip edilen dosyalarda aranıyor; okunamıyorsa bu alt kontrol SKIP
- [x] `.env`, `.env.test.local` ve Supabase CLI local link klasörü `git check-ignore` ile ignore edilmiş değilse ya da takip ediliyorsa FAIL
- [x] `.env.example`'da değeri boş olmayan bir anahtar varsa FAIL
- [x] Her kural için kötü örnek fixture'la FAIL veren test var; fixture'daki sahte anahtarlar test çalışırken üretiliyor, ki test dosyasının kendisi bu duvarı kırmasın
- [x] Gerçek repoda bu duvar PASS veriyor
