# 01: Deploy sonrası eski chunk yüzünden boş sayfa — yenileme önerisi

**Status:** needs-triage

## Gözlem

2026-10-03'te build'ler arasında geçiş yaparken, açık bir sekmede İstatistikler'e geçildiğinde konsolda şu hata çıktı ve sayfa tamamen boş kaldı:

`TypeError: Failed to fetch dynamically imported module: .../assets/DashboardPage-<hash>.js`

Sayfa eski build'in JS'iyle açıktı; SW (`registerType: 'autoUpdate'`) yeni build'e geçip eski precache'i temizleyince, eski koddaki lazy chunk adresi artık yoktu. `DashboardPage`, `SettingsModal`, `BarcodeScanner`, `BatchScanner`, `AiChatDrawer` `React.lazy` ile yükleniyor ve hata yakalayan bir error boundary yok, bu yüzden hata tüm ağacı düşürüyor.

## Etki

Gerçek kullanıcıda: Netlify'a yeni deploy çıktığında uygulama sekmesi açık kalmış biri, daha önce açmadığı lazy bir ekrana (İstatistikler, Ayarlar, barkod, AI sohbet) geçtiğinde boş sayfa görür; elle yenileyince düzelir.

## Olası yön (karar değil)

- Vite'ın `vite:preloadError` olayını dinleyip sayfayı bir kez yenilemek (sonsuz döngüye karşı `sessionStorage` bayrağıyla), ya da kullanıcıya "Yeni sürüm hazır, yenile" önerisi göstermek.
- Lazy ekranların etrafına, chunk hatasında yenileme öneren bir error boundary eklemek.
- SW güncelleme anında açık sekmeyi bilgilendirmek (`registerType: 'prompt'`) alternatif ama daha büyük bir değişiklik.

## Kabul kriterleri (taslak)

- [ ] Eski build açıkken yeni build'e geçilip lazy bir ekran açıldığında boş sayfa yerine yenileme (otomatik ya da önerili) oluyor
- [ ] Yenileme döngüye girmiyor
- [ ] `vite build` + `vite preview` ile iki build arasında geçilerek elle doğrulandı
