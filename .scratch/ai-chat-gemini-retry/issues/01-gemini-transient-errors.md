# Kitap Asistanı: Gemini'nin geçici 503/429 hatalarını zarifçe ele almak

Status: needs-triage

## Bulgu

25 Eylül 2026'da, ai-quota-lockdown (PR #19) production'a alındıktan sonra, Kitap Asistanı'na gönderilen mesajlarda arka arkaya iki kez "Bir şeyler ters gitti" hatası görüldü. Aynı mesaj tekrar gönderilince normal yanıt geldi.

`ai-chat` Edge Function loglarında iki hata var (15:17:39 ve 15:18:41). İkisi de Google kaynaklı:

```
Error: Gemini API error: 503 { "error": { "code": 503,
  "message": "This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.",
  "status": "UNAVAILABLE" } }
```

Bu hata, `ai-chat` içinde Gemini'nin `!geminiRes.ok` dönmesi durumunda atılıyor. Kota çağrısı bu noktada başarıyla tamamlanmış durumda. Deploy edilen kodun repodakiyle aynı olduğu `supabase functions download` ile doğrulandı. Hataya ne `quotaClient` ne de cold start sebep oluyor; boot süreleri 23–31 ms.

## Sorun

`ai-chat` Gemini'nin geçici hatalarını, kullanıcının hiçbir şey yapmadığı bir sunucu hatası gibi ele alıyor. Kod sırasından kaynaklanan iki yan etki var:

1. **Kota boşa düşüyor.** Kota Gemini çağrısından önce tüketiliyor. Başarısız bir deneme, günlük 15'lik paylaşılan kotadan bir hak yiyor.
2. **Kullanıcı mesajı kaydediliyor.** Mesaj Gemini çağrısından önce `ai_messages`'e yazılıyor. Başarısız denemede asistan yanıtı olmadan kalıyor. Tekrar denemede aynı mesaj ikinci kez kaydediliyor ve Gemini'ye giden geçmişte çift görünüyor.

## İstenen

1. 503 ve 429 yanıtlarında kısa bir yeniden deneme (backoff) yapılsın.
2. Gemini çağrısı sonunda yine başarısız olursa şunlardan **biri** yapılsın. Hangisi olacağına spec aşamasında karar verilecek.
   - Tüketilen kota geri verilsin.
   - Kullanıcı mesajı hiç kaydedilmesin. Örneğin mesaj ancak Gemini başarılı olduktan sonra yazılabilir.

## Notlar

- Kota fonksiyonu artık yalnızca `service_role` ile çağrılabiliyor ve parametre almıyor. Kotayı geri verme seçeneği seçilirse, bunun için yine yalnızca `service_role`'e açık ayrı bir fonksiyon gerekir. Bu fonksiyon security-walls'un kota duvarına ve `exceptions.js`'e de eklenmeli.
- Yeniden deneme, Edge Function'ın çalışma süresi sınırını ve kullanıcının bekleme süresini aşmamalı.
- Başlamadan önce `/to-spec` ile spec'lenecek.

## Comments

- Spec yazıldı: `../spec.md`. Kota iadesi ve ertelenmiş kayıt birbirinin alternatifi değil; ikisi de spec'te.
