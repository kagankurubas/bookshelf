# 📚 BookShelf

**🇬🇧 [English](#english) &nbsp;|&nbsp; 🇹🇷 [Türkçe](#türkçe)**

---

## English

A personal book-tracking app — log your books, filter by category,
status and rating, add them fast by scanning a barcode or searching by
title, and arrange them on a real-feeling bookshelf you can drag and
drop. Includes a Book Assistant that recommends books based on your
library and lets you chat about what you're reading.

### Features

- **Book management** — title, author, publisher, category, reading
  status, rating, cover image, notes.
- **Three views** — cards, a filterable/searchable table, and a
  bookshelf.
- **Dynamic shelves** — no fixed slot/capacity; each shelf row grows to
  exactly however many books you put on it, and you can drag books
  between shelves and reorder them.
- **Fast add flows** — scan a barcode (single or batch), search by
  title (Open Library), or add manually.
- **Book Assistant** — an AI chat panel that gives personalized
  recommendations based on your library and remembers conversation
  history (Gemini API).
- **Multi-language** — Turkish / English.
- **Accounts** — email/password sign-in; every user's data (libraries,
  books, chats) is isolated via Supabase Row Level Security.

### Tech stack

- **Frontend**: React 19 + Vite, `react-i18next` (TR/EN)
- **Backend**: Supabase (Postgres + Auth + Row Level Security + Edge
  Functions)
- **AI**: Google Gemini API, called from a server-side Edge Function
  (the key never reaches the browser)
- **Barcode scanning**: `html5-qrcode`
- **Book search/ISBN lookup**: Open Library API
- **Testing**: Vitest + React Testing Library

Designed to run entirely on free tiers (Supabase free tier + Gemini
API free tier).

### Setup

**1. Install dependencies**

```bash
npm install
```

**2. Supabase project**

Create a free project at [supabase.com](https://supabase.com).

- **Fresh/empty project**: run the whole `supabase/schema.sql` file in
  the SQL Editor — sets up every table, RLS policy and constraint in
  one go.
- **Upgrading an existing project**: run the files in
  `supabase/migrations/` in numeric order. The `003_auth_step1` →
  `004_auth_step2` → `005_auth_step3` trio must run in sequence
  specifically (add column → backfill existing rows to the first
  account → lock down RLS) — see the comments in each file.

**3. Environment variables**

Copy `.env.example` to `.env` and fill in your Supabase project URL
and `anon`/`publishable` key (Project Settings → API):

```bash
cp .env.example .env
```

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

These two values end up in the browser bundle, and that's **expected**
— security relies entirely on Row Level Security, not on keeping this
key secret.

**4. Book Assistant (optional)**

The app works fully without the AI chat feature. To enable it:

1. Get a free Gemini API key from
   [Google AI Studio](https://aistudio.google.com/apikey).
2. Supabase Dashboard → **Edge Functions** → create a new function
   named `ai-chat`, paste the contents of
   `supabase/functions/ai-chat/index.ts`, deploy.
3. In the same section, add a **Secret** named `GEMINI_API_KEY` with
   the key from step 1.

This key must **never** go into `.env` — unlike the Supabase anon key,
it grants unrestricted access on its own and must stay server-side.

**5. Run**

```bash
npm run dev
```

Use **Sign Up** on the screen that opens to create your first account.

### Commands

| Command             | What it does                    |
| -------------------- | -------------------------------- |
| `npm run dev`         | Start the dev server            |
| `npm run build`       | Production build (`dist/`)      |
| `npm run lint`        | Run ESLint                      |
| `npm run test`        | Run the test suite once         |
| `npm run test:watch`  | Run tests in watch mode         |
| `npm run preview`     | Preview the production build    |

### Tests

A handful of Vitest + React Testing Library tests cover the parts that
don't need a live Supabase connection: the deterministic shelf-spine
sizing math, the Open Library API wrapper (response mapping and
caching, with `fetch` mocked), and a couple of presentational
components (rendering, click handlers, translated labels).

```bash
npm run test
```

### Project structure

```
src/
  components/   UI components (each in its own folder with .jsx + .css)
  hooks/        Data hooks talking to Supabase (useBooks, useAuth, ...)
  lib/          Supabase client, Open Library wrapper, small pure utils
  i18n/         Translation files (tr.json, en.json)
  test/         Vitest setup (jsdom + i18n + RTL cleanup)
supabase/
  schema.sql          Target schema for a brand-new project
  migrations/         Ordered SQL files for upgrading an existing project
  functions/ai-chat/  Gemini proxy (pasted manually into the Supabase Dashboard)
```

### Roadmap

- A community/friends system so users can connect with each other
- Tracking books lent between friends

---

## Türkçe

Kişisel kitap takip uygulaması — kitaplarını kaydet, kategori/durum/puan
bazlı filtrele, barkod okutarak veya arayarak hızlıca ekle, ve kitaplarını
gerçek bir kitaplık rafı gibi sürükle-bırakla düzenle. Kitaplığına göre
öneri sunan ve kitaplar hakkında sohbet edebileceğin bir Kitap Asistanı da
dahil.

### Özellikler

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

### Teknoloji

- **Frontend**: React 19 + Vite, `react-i18next` (TR/EN)
- **Backend**: Supabase (Postgres + Auth + Row Level Security + Edge
  Functions)
- **AI**: Google Gemini API (sunucu tarafında bir Edge Function
  üzerinden çağrılıyor — anahtar hiçbir zaman tarayıcıya inmiyor)
- **Barkod tarama**: `html5-qrcode`
- **Kitap arama/ISBN**: Open Library API
- **Test**: Vitest + React Testing Library

Proje tamamen ücretsiz katmanlarla çalışacak şekilde tasarlandı
(Supabase free tier + Gemini API free tier).

### Kurulum

**1. Bağımlılıklar**

```bash
npm install
```

**2. Supabase projesi**

[supabase.com](https://supabase.com) üzerinde ücretsiz bir proje oluştur.

- **Yeni/boş bir proje için:** SQL Editor'da `supabase/schema.sql`
  dosyasının tamamını çalıştır — tüm tabloları, RLS politikalarını ve
  kısıtlamaları tek seferde kurar.
- **Var olan bir projeyi güncellemek için:** `supabase/migrations/`
  klasöründeki dosyaları numara sırasına göre çalıştır. `003_auth_step1`
  → `004_auth_step2` → `005_auth_step3` üçlüsü özellikle sırayla
  ilerlemeli (önce kolon eklenir, sonra mevcut veri ilk hesaba bağlanır,
  en son RLS kilitlenir) — ayrıntılar dosyaların içindeki yorumlarda.

**3. Ortam değişkenleri**

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

**4. Kitap Asistanı (opsiyonel)**

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

**5. Çalıştır**

```bash
npm run dev
```

Açılan sayfadan **Kayıt Ol** ile ilk hesabını oluştur.

### Komutlar

| Komut                | Açıklama                          |
| ---------------------- | ---------------------------------- |
| `npm run dev`           | Geliştirme sunucusu               |
| `npm run build`         | Production build (`dist/`)        |
| `npm run lint`          | ESLint kontrolü                   |
| `npm run test`          | Test paketini bir kez çalıştır    |
| `npm run test:watch`    | Testleri izleme modunda çalıştır  |
| `npm run preview`       | Build çıktısını lokal önizleme    |

### Testler

Canlı bir Supabase bağlantısı gerektirmeyen kısımlar için birkaç
Vitest + React Testing Library testi var: deterministik kitap sırtı
boyutlandırma matematiği, Open Library API sarmalayıcısı (yanıt
eşleme ve önbellekleme, `fetch` mock'lanarak), ve birkaç sunum
bileşeni (render, tıklama davranışı, çevrilen etiketler).

```bash
npm run test
```

### Klasör yapısı

```
src/
  components/   UI bileşenleri (her biri kendi klasöründe .jsx + .css)
  hooks/        Supabase ile konuşan veri hook'ları (useBooks, useAuth, ...)
  lib/          Supabase client, Open Library API sarmalayıcısı, küçük saf yardımcılar
  i18n/         Dil dosyaları (tr.json, en.json)
  test/         Vitest kurulumu (jsdom + i18n + RTL temizliği)
supabase/
  schema.sql        Yeni bir proje için sıfırdan hedef şema
  migrations/       Var olan bir projeyi güncellemek için sıralı SQL dosyaları
  functions/ai-chat/  Gemini proxy'si (Supabase Dashboard'a manuel yapıştırılır)
```

### Yol haritası

- Kullanıcıların birbiriyle tanışabileceği, kitap önerebileceği bir
  topluluk/arkadaşlık sistemi
- Kitapları arkadaşlar arasında ödünç verme takibi
