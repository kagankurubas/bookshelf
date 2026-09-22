# Kod Yorumlarını İngilizceleştirme + Sadeleştirme

Status: ready-for-agent

## Problem Statement

Kod tabanındaki yorumlar Türkçe ve İngilizce karışık - aynı dosyada bile ikisi bir arada görülebiliyor. Bazı yorumlar da gereksiz uzun: kodun (değişken/fonksiyon adının, tek satırlık bir ifadenin) zaten açıkça söylediği şeyi bir kez daha nesir halinde tekrar ediyor. Bu, hem okunabilirliği hem de (proje ileride İngilizce konuşan katkıcılara açılırsa) erişilebilirliği zorlaştırıyor.

## Solution

Tüm `//` (JS/JSX) ve `--` (SQL) yorumları İngilizce'ye çevrilir. Her yorum "başlık/özet" seviyesine kısaltılır - ama **hangi yorumun silineceği/kısaltılacağı öznel bir karar değil, aşağıda net bir kritere bağlanmıştır** (bkz. Implementation Decisions - "Filler kriteri"). Hiçbir mantık/davranış değişmez: değişken/fonksiyon/dosya adlarına, kod satırlarına, `// eslint-disable-next-line ...` gibi lint direktiflerinin kendisine dokunulmaz - sadece yorum metni.

Kapsam 4 dizine bölünüp `/to-tickets` ile ayrı ayrı ticket'lara ayrılır (`supabase/`, `src/lib/`, `src/hooks/`, `src/components/` + `App.jsx`/`src/test/setup.js`), her biri kendi `npm test && npm run lint && npm run build` çalıştırmasıyla bağımsız doğrulanır - tek dev büyük bir diff yerine, hatanın izole edilmesi daha kolay 4 küçük diff.

## User Stories

1. Geliştirici olarak, kod tabanındaki herhangi bir dosyayı açtığımda tüm yorumların İngilizce olmasını istiyorum - dil karışıklığı olmasın.
2. Geliştirici olarak, bir yorumun neden orada olduğunu (kısıtlama, tasarım gerekçesi, "bariz olmayan bir nedenle böyle yapıldı") hâlâ anlayabilmek istiyorum - çeviri/kısaltma sürecinde bu bilgi kaybolmasın.
3. Geliştirici olarak, kodun zaten açıkça söylediği bir şeyi tekrar eden yorumların (ör. `useEffect(() => fetchX(), [userId])`'in üzerinde "kullanıcı değişince yeniden çek" yazan bir yorum) tamamen kaldırılmasını istiyorum - gürültü azalsın.
4. Geliştirici olarak, bu temizlik sırasında hiçbir mantığın/davranışın değişmediğinden emin olmak istiyorum - `npm test`, `npm run lint`, `npm run build` temizlik öncesiyle **aynı sonucu** vermeli.
5. Geliştirici olarak, `// eslint-disable-next-line ...` gibi lint'e gerçekten etki eden yorum satırlarının, üzerlerindeki açıklayıcı yorum çevrilirken/kısaltılırken yanlışlıkla bozulmamasını/silinmemesini istiyorum.
6. Geliştirici olarak, `supabase/migrations/*.sql` dosyalarındaki yorumların - bu dosyalar zaten production'a uygulanmış olsa da - hâlâ **operasyonel değeri olan** açıklamaları (ör. bir migration'ın tek seferlik elle nasıl çalıştırılacağını, neden sessizce değil açık hatayla durduğunu anlatan yorumlar) kaybetmemesini istiyorum; migration yorumlarında normal kod yorumlarına göre daha temkinli (daha az agresif kısaltma) davranılmasını istiyorum.
7. Geliştirici olarak, bir migration dosyasındaki `ALTER`/`CREATE`/`DO $$ ... $$` gibi hiçbir SQL ifadesinin bu temizlikte değişmediğinden emin olmak istiyorum - sadece `--` ile başlayan satırlar dokunulur.
8. Geliştirici olarak, bu değişikliğin `supabase/`, `src/lib/`, `src/hooks/`, `src/components/` olmak üzere ayrı ayrı doğrulanabilir parçalara bölünmüş olmasını istiyorum - tek bir dev diff yerine, her parçayı ayrı inceleyip ayrı onaylayabileyim.
9. Geliştirici olarak, her ticket'ın diff'inde her hunk'ın sadece yorum satırlarını değiştirdiğini (hiçbir kod satırının `-`/`+` olarak görünmediğini) teyit edebilmek istiyorum.
10. Geliştirici olarak, şüpheli/net olmayan bir durumda (bu yorum filler mi değil mi belli değilse) yorumun silinmek yerine korunmasını istiyorum - "sil değil koru" varsayılan tarafı olsun.

## Implementation Decisions

### Filler kriteri (silinecek vs korunacak) - net, öznel değil

- **Silinir (filler)**: Yorum, hemen altındaki değişken/fonksiyon adının veya tek satırlık kodun kelimesi kelimesine söylediği şeyi nesir haline getiriyorsa. Somut örnek (kod tabanında birebir var, iki farklı dosyada aynı filler yorum tekrarlanmış): `useAiChat.js:28` ve `useBooks.js:169`'daki *"Kullanıcı değiştiğinde veriyi yeniden çek - standart senkronizasyon deseni"* yorumu, hemen altındaki `useEffect(() => { fetchX(); }, [userId])`'in zaten açıkça yaptığı şeyi tekrarlıyor - silinir.
- **Korunur (çevrilir + gerekirse kısaltılır, ama SİLİNMEZ)**: Yorum bir tasarım gerekçesi, bir kısıtlama, "neden böyle değil de bu şekilde yapıldı" türünden herhangi bir bilgi içeriyorsa. Örnek: `shelfSpine.js`'deki "kitap sırtının boyutu kitabın id'sinden deterministik türetiliyor, rastgele state tutmaya gerek kalmasın diye" yorumu - kod satırı (`hashCode(book.id) % ...` gibi bir şey) bu *"neden"i* kendisi söylemiyor, yorum olmadan kaybolur - korunur, sadece İngilizce'ye çevrilip başlık seviyesine kısaltılır.
- **Şüpheli durumda varsayılan: KORU.** Bir yorumun filler mi tasarım-gerekçesi mi olduğu net değilse, silme - çevirip kısalt, ama bırak.
- Bu kriter hem JS/JSX (`//`) hem SQL (`--`) yorumları için aynı şekilde geçerli.

### Migration yorumları - daha temkinli davranış

`supabase/migrations/*.sql` dosyalarındaki yorumlar normal kod yorumlarından **daha az agresif** kısaltılır - bu dosyalar production'a zaten uygulanmış, "operasyonel geçmiş" belgeleri, tekrar okunacaksa muhtemelen bir incident/migration-anlama anında okunacaklar. Somut örnek: `004_auth_step2_backfill.sql`'in başındaki yorum, bu migration'ın *aslında* tek seferlik elle çalıştırılan bir production script'i olduğunu, `BURAYA_USER_ID` placeholder'ının elle değiştirilmesi gerektiğini, fresh/local bir DB'de bu bloğun neden hiçbir şey yapmadığını, ve sahipsiz veri bulunursa neden sessizce yanlış bir UUID yazmak yerine açık hata verip durduğunu anlatıyor - bunların hepsi ileride migration'ı yanlış anlayıp yanlış çalıştırma riskini azaltan, gerçek operasyonel bilgi. Bu tarz yorumlar İngilizce'ye **sadık şekilde** çevrilir, "başlık seviyesine" indirgenmez - içerik kaybı olmaz, sadece dil değişir (gerekirse hafif üslup sadeleştirmesi, ama bilgi kaybı yok).
Migration dosyalarında SQL ifadelerinin (`alter table`, `create table`, `create policy`, `do $$ ... $$`, vb.) **hiçbiri** değişmez - sadece `--` ile başlayan satırlar dokunulur. `supabase/schema.sql` için de aynı kural geçerli.

### Lint-direktifi yorumları dokunulmaz

11 adet `// eslint-disable-next-line ...` satırı (`useAiChat.js`, `useBooks.js`, `useCategoryReadingStats.js`, `useLibraries.js`, `useMonthlyReadingStats.js`, `useReadingStats.js`, `useReadingYears.js`, `useYearlyReadingStats.js`, `BarcodeScanner.jsx`, `ImportPreviewModal.jsx`, `useOfflineBookQueue.js`) - bunlar dokümantasyon değil, gerçekten lint davranışını değiştiren direktifler. Bu satırların kendisi **hiç değişmez** (silinmez, taşınmaz, yeniden yazılmaz). Bu direktifin hemen üstünde/yanında duran açıklayıcı yorum (genelde Türkçe) ise normal kurala tabidir - çevrilir/kısaltılır/korunur, filler kriterine göre.

### Kapsam

- `supabase/` (`schema.sql` + `migrations/001`...`013`): 14 dosya, ~264 yorum satırı.
- `src/lib/` (14 kaynak dosya + 14 test dosyası): ~273 yorum satırı.
- `src/hooks/` (19 kaynak dosya + 14 test dosyası): ~271 yorum satırı.
- `src/components/` (16 kaynak dosya + 7 test dosyası) + `App.jsx` + `src/test/setup.js`: ~236 yorum satırı.
- Test dosyalarındaki (`*.test.js`/`*.test.jsx`) yorumlar da kapsama dahil - aynı kural, aynı risk seviyesi, ayrı bir ticket açmaya gerek yok, ait olduğu dizinin ticket'ına dahil edilir.
- JSDoc bloğu (`/** ... */`) kod tabanında hiç yok, JSX `{/* ... */}` yorumu hiç yok, satır sonu inline yorum (`kod(); // not`) hiç yok - bu üç şekil taranmış ve bulunmamış, dolayısıyla implementasyon sadece satır-başı `//` ve `--` yorumlarını ele almak zorunda.

## Testing Decisions

- Bu değişiklik davranışı değiştirmediği için yeni bir test **yazılmaz** - mevcut test/lint/build zaten yeterli bir seam: her ticket'ta `npm test`, `npm run lint`, `npm run build` çalıştırılır, sonuç (geçen/kalan test sayısı, lint hata sayısı, build başarısı) değişiklik öncesiyle **birebir aynı** olmalı.
- Ek olarak, her ticket'ın diff'i hunk hunk gözden geçirilir (elle veya bir ajan tarafından): her hunk'ta **sadece** `//`/`--` ile başlayan satırların değiştiğini, hiçbir kod satırının `-`/`+` olarak görünmediğini doğrulamak gerekir - bu, "test geçti ama aslında bir string literal'i kazara değiştirdim" riskine karşı ikinci bir güvenlik katmanı.
- Prior art: bu repo'da yorum-only bir refactor için önceki bir örnek yok, ama `code-review` skill'inin "Standards" ekseni (bkz. bu oturumdaki `free-tags-search` PR review'ı) tam olarak bu tarz hunk-bazlı manuel inceleme deseninin nasıl işlediğini gösteriyor - her ticket'ın PR'ında aynı desen kullanılabilir.

## Out of Scope

- Değişken/fonksiyon/dosya/CSS-sınıf adlarının değiştirilmesi - sadece yorumlar.
- `console.log`/`console.error` mesajlarının, kullanıcıya gösterilen (i18n) metinlerin, commit mesajlarının içeriği - bunlar yorum değil, kapsam dışı (commit mesajı dili zaten `AGENTS.md`'deki ayrı kuralla kapsanıyor).
- Yorumların yapısal olarak yeniden organize edilmesi (ör. bir dosyanın en üstüne tek bir büyük "genel bakış" yorumu eklemek) - sadece var olan yorumların çevirisi/kısaltılması, yeni yorum İCAT edilmez.
- `.scratch/`, `docs/`, `README.md`, `CONTEXT.md`, `AGENTS.md` gibi Markdown dokümantasyon dosyaları - bunlar kod yorumu değil, kapsam dışı.
- Migration dosyalarına yeni bir migration eklenmesi ya da var olanların SQL gövdesinin değiştirilmesi - kesinlikle yasak, sadece `--` satırları.

## Further Notes

`/to-tickets` ile 4 ticket'a bölünecek: `01-supabase-comments`, `02-lib-comments`, `03-hooks-comments`, `04-components-comments` (yaklaşık sıralama - `docs/agents/issue-tracker.md`'deki numaralandırma konvansiyonuna göre kesin numaralar değişebilir). Her ticket bağımsız bir branch/PR olarak (bkz. `AGENTS.md` - Branch/PR disiplini) ele alınır; birbirine bağımlı değiller, istenen sırada/paralelde yapılabilirler.
