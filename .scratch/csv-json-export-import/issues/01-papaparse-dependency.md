# 01: papaparse bağımlılığını ekle

**What to build:** Geliştirici, hem export (02) hem import (03) ticket'larının ihtiyaç duyacağı CSV parse/serialize kütüphanesinin projeye eklenmiş ve çalıştığı doğrulanmış halini bulur. Bu, 02 ve 03'ün paralel çalışırken `package.json`/`package-lock.json` üzerinde çakışmamasını sağlayan bir prefactor'dür.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `papaparse` `package.json`'a dependency olarak eklendi, `npm install` sorunsuz çalışıyor
- [ ] Kütüphanenin `Papa.parse`/`Papa.unparse` fonksiyonlarının basit bir örnekle (küçük bir CSV string'i ↔ dizi) doğru çalıştığını gösteren minik bir smoke testi eklendi (`src/lib/` altında uygun bir yere)
- [ ] Mevcut `npm test` (132 test) ve `npm run lint` değişmeden geçmeye devam ediyor
