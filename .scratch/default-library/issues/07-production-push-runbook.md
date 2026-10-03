# 07: 016 ve 017'yi canlıya push (yalnızca açık onayla)

**What to build:** spec'teki "Canlıya push" bölümünün uygulanması:
1. **Salt okunur durum kontrolü:** `migration list --linked`, `check:security -- --linked`, ön ölçüm sorguları, FK `confdeltype` kontrolü.
2. **Yedek** (2026-10-03'te CLI 2.119.0 ile doğrulanan bilgiyle):
   - **(a) Tam yedek:** `supabase db dump` Docker gerektirir (daemon kapalıyken `DockerRunError`). Docker Desktop açılır, komut önce `--local` ile yerelde denenir, sonra `--linked` ile şema, `--data-only` ve `--role-only` dosyaları alınır.
   - **(b) Hedefli yedek:** Docker'sız `supabase db query --linked` ile `public.libraries` tablosunun tamamı dosyaya alınır; çıktı biçimi önce `--local` ile denenir.
   - (a) çalışmazsa push, (b) olmadan yapılmaz. Yerelde doğrulanmamış komut canlıya karşı çalıştırılmaz.
3. **Kuru çalıştırma:** `db push --dry-run`.
4. **Push:** kullanıcının açık onayı, ardından `db push`.
5. **Doğrulama:** salt okunur sorgular.
6. **Elle kayıt:** iPhone Safari'de yeni hesapla elle doğrulama.

Geri alma planı spec'te yazılı ve yalnızca gerekirse, onayla uygulanır. PR B, v1.1 etiketinden bağımsız, sonraki bir sürümle çıkabilir.

**Blocked by:** 05, 06 (ikisi de `main`'e merge edilmiş olmalı)

**Status:** ready-for-human

- [ ] Ön ölçümler kaydedildi (kitaplıksız kullanıcı id'leri, çoklu Ana Kitaplık = 0, FK'ler cascade)
- [ ] Yedek komutları önce yerelde (`--local`) çalıştı; ardından canlı yedek (a) ya da en az (b) alındı ve dosyalar dolu
- [ ] Dry-run yalnızca 016 ve 017'yi listeledi
- [ ] Kullanıcı push'u açıkça onayladı
- [ ] Doğrulama: 016 ve 017 applied, trigger, fonksiyon ve index mevcut, kitaplıksız kullanıcı = 0
- [ ] Yeni hesapla elle kayıt: Ana Kitaplık hazır, kitap eklenebiliyor
