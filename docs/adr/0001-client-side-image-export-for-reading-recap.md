---
status: accepted
---

# Okuma Özeti paylaşımı: istemci taraflı görsel export, herkese açık link değil

Okuma Özeti kartının nasıl "paylaşılacağına" karar verirken, herkese açık bir link/sayfa (örn. `bookshelf.app/share/abc123`) ile istemci tarafında oluşturulan indirilebilir/paylaşılabilir bir görsel (PNG) arasında seçim yapıldı. Uygulama tamamen kullanıcı başına izole bir modelde çalışıyor (Supabase Auth + Row Level Security, herkese açık profil ya da paylaşım altyapısı yok), bu yüzden public link seçeneği yeni bir güvenlik yüzeyi (kimliksiz erişilebilir uçlar, veri ifşası riski) ve ciddi bir backend altyapısı gerektirirdi. Bunun yerine DOM'u istemci tarafında görsele çeviren bir kütüphane (örn. html-to-image) eklenip kart Web Share API (mobil) veya doğrudan indirme (masaüstü) ile paylaşılacak; bu, kullanıcı verisini sunucu tarafında hiç herkese açık hale getirmeden Duolingo/Spotify Wrapped tarzı bir "hazır paylaş" deneyimi sağlıyor.

## Considered Options

- **Herkese açık paylaşım linki**: reddedildi — yeni backend/güvenlik yüzeyi gerektirir, mevcut RLS/kullanıcı-başına-izole modeliyle çelişir.
- **Sadece ekran içi görsel, kullanıcı manuel ekran görüntüsü alır**: reddedildi — Duolingo tarzı "hazır paylaş" deneyimini karşılamıyor, native paylaşım menüsüne (Web Share API) entegre olamıyor.
- **İstemci taraflı DOM→görsel export (seçilen)**: yeni bir bağımlılık gerektiriyor ama sunucu tarafında hiçbir yeni yüzey açmıyor.
