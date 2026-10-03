# 01: `<html lang>` uygulama diliyle güncellensin

**Status:** needs-triage

## Gözlem

`index.html` kök etiketi sabit olarak `<html lang="en">`. Uygulama dili TR/EN arasında değiştirilse de (AppHeader'daki dil butonları `i18n.changeLanguage`), `document.documentElement.lang` hiç güncellenmiyor. Takvim i18n doğrulaması sırasında (2026-10-03) dil TR'ye alınmışken `lang` hâlâ `en` kalıyordu.

## Etki

- Ekran okuyucular Türkçe metni İngilizce telaffuz kurallarıyla okur.
- Tarayıcının otomatik çeviri önerisi, heceleme denetimi ve `:lang()` CSS seçicileri yanlış dile göre çalışır.
- Etkisi uygulama genelinde; takvim stiline özgü değil.

## Olası yön (karar değil)

- i18next'in `languageChanged` olayında `document.documentElement.lang` güncellenir; ilk yüklemede algılanan dil de yazılır.
- `index.html`'deki varsayılan, `fallbackLng` ile (`tr`) tutarlı hale getirilebilir.

## Kabul kriterleri (taslak)

- [ ] Dil değiştirildiğinde `<html lang>` aynı anda `tr`/`en` olur
- [ ] Sayfa ilk açıldığında algılanan dil `<html lang>`'e yansır
- [ ] Davranışı kapsayan bir test var
