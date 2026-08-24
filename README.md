# 📚 BookShelf

Kişisel kitap takip uygulaması — kitaplarını kaydet, kategori/durum/puan
bazlı filtrele, barkod okutarak veya arayarak hızlıca ekle, ve kitaplarını
gerçek bir kitaplık rafı gibi sürükle-bırakla düzenle. Kitaplığına göre
öneri sunan ve kitaplar hakkında sohbet edebileceğin bir Kitap Asistanı da
dahil.

## Özellikler

- **Kitap yönetimi** — başlık, yazar, yayınevi, kategori, okuma durumu,
  puan, kapak görseli, notlar.
- **Üç görünüm** — kart, tablo (filtrelenebilir/aranabilir) ve kitaplık
  rafı.
- **Dinamik raf sistemi** — sabit slot/kapasite yok, her raf üzerine
  koyduğun kitap sayısı kadar uzuyor; kitapları sürükleyerek raflar
  arasında taşıyabilir, sırasını değiştirebilirsin.
- **Hızlı ekleme** — barkod tarayarak (tekli veya toplu), kitap adıyla
  arayarak (Open Library) ya da elle.
- **Kitap Asistanı** — kitaplığına göre kişiselleştirilmiş öneriler
  sunan, kitaplar hakkında sohbet edebileceğin, geçmişi saklanan bir AI
  sohbet paneli (Gemini API).
- **Çoklu dil** — Türkçe / İngilizce.
- **Hesaplar** — e-posta/şifre ile giriş, her kullanıcının verisi
  (kitaplıklar, kitaplar, sohbetler) yalnızca kendisine ait ve izole
  (Supabase Row Level Security).

## Teknoloji

- **Frontend**: React 19 + Vite, `react-i18next` (TR/EN)
- **Backend**: Supabase (Postgres + Auth + Row Level Security + Edge
  Functions)
- **AI**: Google Gemini API (sunucu tarafında bir Edge Function
  üzerinden çağrılıyor — anahtar hiçbir zaman tarayıcıya inmiyor)
- **Barkod tarama**: `html5-qrcode`
- **Kitap arama/ISBN**: Open Library API

Proje tamamen ücretsiz katmanlarla çalışacak şekilde tasarlandı
(Supabase free tier + Gemini API free tier).

## Kurulum

### 1. Bağımlılıklar

```bash
npm install
```

### 2. Supabase projesi

[supabase.com](https://supabase.com) üzerinde ücretsiz bir proje oluştur.

**Yeni/boş bir proje için:** SQL Editor'da `supabase/schema.sql`
dosyasının tamamını çalıştır — tüm tabloları, RLS politikalarını ve
kısıtlamaları tek seferde kurar.

**Var olan (daha eski bir şemadaki) bir projeyi güncellemek için:**
`supabase/migrations/` klasöründeki dosyaları numara sırasına göre
çalıştır. `003_auth_step1` → `004_auth_step2` → `005_auth_step3` üçlüsü
özellikle sırayla ilerlemeli (önce kolon eklenir, sonra mevcut veri ilk
hesaba bağlanır, en son RLS kilitlenir) — ayrıntılar dosyaların
içindeki yorumlarda.

### 3. Ortam değişkenleri

`.env.example` dosyasını `.env` olarak kopyala ve Supabase proje
ayarlarından (Project Settings → API) URL ve `anon`/`publishable`
anahtarını doldur:

```bash
cp .env.example .env
```

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Bu iki değer tarayıcıya gömülür ve bu **normaldir** — güvenlik tamamen
Row Level Security politikalarına dayanır, anahtarın kendisi tek başına
hiçbir yetki vermez.

### 4. Kitap Asistanı (opsiyonel)

AI sohbet özelliği olmadan da uygulama tam çalışır. İstersen:

1. [Google AI Studio](https://aistudio.google.com/apikey)'dan ücretsiz
   bir Gemini API anahtarı al.
2. Supabase Dashboard → **Edge Functions** → yeni fonksiyon oluştur,
   adını `ai-chat` yap, içeriğini `supabase/functions/ai-chat/index.ts`
   dosyasından yapıştır, deploy et.
3. Aynı yerde **Secrets** kısmına `GEMINI_API_KEY` adında bir secret
   ekle (değeri adım 1'deki anahtar).

Bu anahtar **asla** `.env`'e eklenmemeli — Gemini anahtarı, Supabase'in
anon key'inin aksine tek başına tam yetki verir ve sadece Edge
Function'ın sunucu tarafında saklanmalı.

### 5. Çalıştır

```bash
npm run dev
```

Açılan sayfadan **Kayıt Ol** ile ilk hesabını oluştur.

## Komutlar

| Komut             | Açıklama                          |
| ------------------ | ---------------------------------- |
| `npm run dev`       | Geliştirme sunucusu               |
| `npm run build`     | Production build (`dist/`)        |
| `npm run lint`      | ESLint kontrolü                   |
| `npm run preview`   | Build çıktısını lokal önizleme    |

## Klasör yapısı

```
src/
  components/   UI bileşenleri (her biri kendi klasöründe .jsx + .css)
  hooks/        Supabase ile konuşan veri hook'ları (useBooks, useAuth, ...)
  lib/          Supabase client, Open Library API sarmalayıcısı
  i18n/         Dil dosyaları (tr.json, en.json)
supabase/
  schema.sql        Yeni bir proje için sıfırdan hedef şema
  migrations/       Var olan bir projeyi güncellemek için sıralı SQL dosyaları
  functions/ai-chat/  Gemini proxy'si (Supabase Dashboard'a manuel yapıştırılır)
```

## Yol haritası

- Kullanıcıların birbiriyle tanışabileceği, kitap önerebileceği bir
  topluluk/arkadaşlık sistemi
- Kitapları arkadaşlar arasında ödünç verme takibi
