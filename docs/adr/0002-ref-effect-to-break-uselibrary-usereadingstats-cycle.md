---
status: accepted
---

# useLibrary → useReadingStats dairesel bağımlılığını ref+effect ile kırma

`useLibrary`'nin mutator'ları (`addBook`, `editBook`, `deleteBook`) başarı sonrası okuma istatistiklerini otomatik tazelemek için `refreshStats`'a ihtiyaç duyar, ama `refreshStats` (`useReadingStats(activeLibraryId).refetchStats`) tam olarak `useLibrary`'nin ürettiği `activeLibraryId`'ye bağımlı — iki hook birbirinin çıktısına muhtaç. `App.jsx` bunu bir `useRef` (`readingStatsRef`) ile çözüyor: `useLibrary`'ye verilen `refreshStats` fonksiyonu her zaman `readingStatsRef.current`'ı okur, `readingStats` hesaplandıktan sonra bağımsız bir `useEffect` bu ref'i günceller. Render sırasında ref'e yazmak React'in "ref'ler render'da okunmaz/yazılmaz" kuralını ihlal ettiği için (eslint `react-hooks/refs` bunu doğruluyor) güncelleme bilinçli olarak bir effect'e taşındı.

Bu desenin bu codebase'deki diğer hook çıkarmalarında (`useAddBookFlow`, `useShelfDnd`, `useBookFilters`) hiçbir emsali yok — hiçbiri dairesel bir bağımlılığa sahip değildi. Gelecekte biri App.jsx'i sadeleştirmeye çalışırken bu ref+effect'i "gereksiz karmaşıklık" sanıp kaldırabilir; bu ADR o dairesel bağımlılığın gerçek olduğunu ve nedenini kayıt altına alıyor.

## Considered Options

- **Ref + effect (seçilen)**: dairesel bağımlılığı kırar, `useLibrary`'nin mutator'ları içinde otomatik stats-refresh (deepening'in asıl amacı) korunur.
- **`refreshStats`'ı `useLibrary`'den çıkarıp App.jsx'e bırakmak** (her mutator çağrısından sonra App.jsx elle `readingStats.refetchStats()` çağırır): dairesel bağımlılığı ortadan kaldırırdı, ama tam olarak bu refactor'ün çözmeye çalıştığı "stats-refresh'i unutma riski 3 çağrı noktasına dağılmış" sorununu geri getirirdi.
