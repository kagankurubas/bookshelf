import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import i18n from '../i18n/i18n';

// jsdom'un varsayılan navigator.language'i (en-US) dil algılayıcıyı
// İngilizce'ye yönlendirebiliyor - testler her ortamda aynı sonucu
// versin diye uygulamanın birincil dilini (Türkçe) sabitliyoruz.
i18n.changeLanguage('tr');

// Her testten sonra render edilen DOM'u temizle, aksi halde ayni dosyadaki
// testler birbirinin ürettiği elemanları görüp "birden fazla eşleşme" hatası verir.
afterEach(cleanup);
