// Kitap sırtlarının gerçek bir kitaplıktaki gibi biraz farklı en/boyda
// görünmesi için, kitabın id'sinden deterministik (her renderda aynı)
// bir boyut türetiyoruz - rastgele state tutmaya gerek kalmıyor.
export function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function getSpineSize(id) {
  const hash = hashString(String(id));
  const width = 46 + (hash % 17); // 46-62px
  const height = 138 + ((hash >> 4) % 35); // 138-172px
  return { width, height };
}

// Renk kategoriye göre belirleniyor, ama aynı kategorideki tüm kitaplar
// birebir aynı tonda olunca raf tek renk bir duvar gibi görünüyor. Kitabın
// id'sinden türetilen küçük, deterministik bir ton/doygunluk/parlaklık
// sapması ekleyip gerçek bir kitaplıktaki gibi aile içinde çeşitlilik
// katıyoruz - kategori hâlâ tanınabilir, ama her sırt biraz farklı.
export function getSpineFilter(id) {
  const hash = hashString(`spine-${id}`);
  const hueShift = ((hash % 41) - 20); // -20..20 derece
  const saturate = 0.85 + (((hash >> 6) % 31) / 100); // 0.85..1.15
  const brightness = 0.92 + (((hash >> 11) % 19) / 100); // 0.92..1.10
  return `hue-rotate(${hueShift}deg) saturate(${saturate}) brightness(${brightness})`;
}

const CATEGORY_EMBLEMS_TR = {
  'Klasik Edebiyat': 'KLS',
  'Fantastik Kurgu': 'FNT',
  'Bilim Kurgu': 'BLK',
  'Distopya': 'DST',
  'Kurgu': 'KRG',
  'Tarih': 'TRH',
  'Felsefe': 'FLS',
  'Biyografi': 'BYG',
  'Bilim': 'BLM',
};

const CATEGORY_EMBLEMS_EN = {
  'Klasik Edebiyat': 'CLS',
  'Fantastik Kurgu': 'FAN',
  'Bilim Kurgu': 'SCI',
  'Distopya': 'DYS',
  'Kurgu': 'FIC',
  'Tarih': 'HIS',
  'Felsefe': 'PHI',
  'Biyografi': 'BIO',
  'Bilim': 'SCI',
};

// Sırt üzerindeki küçük folyo rozetine yazılan 3 harfli kategori kısaltması -
// renk tek başına yeterince ayırt edici olmadığında (renk körlüğü, benzer
// tonlar) kategoriyi metinle de okunur kılıyor. Kategori DB'de her zaman
// Türkçe canonical string olarak tutuluyor, bu yüzden hangi haritanın
// kullanılacağını UI dili (language) belirliyor.
export function getCategoryEmblem(category, language = 'tr') {
  const emblems = language === 'en' ? CATEGORY_EMBLEMS_EN : CATEGORY_EMBLEMS_TR;
  if (emblems[category]) return emblems[category];
  return category ? category.slice(0, 3).toUpperCase() : '';
}

const SPINE_GAP = 9; // .shelf-row'daki gap ile aynı olmalı

// Bir raf katındaki kitapları, verilen genişliğe sığacak şekilde satırlara
// böler - her satır kendi bütün (kesintisiz) raf çizgisini alacak. Sabit bir
// "kaç kitap sığar" varsayımı yok, gerçek piksel genişliklerini toplar.
export function chunkIntoLines(books, availableWidth) {
  if (!availableWidth || availableWidth <= 0 || books.length === 0) {
    return books.length ? [books] : [];
  }
  const lines = [];
  let current = [];
  let currentWidth = 0;

  for (const book of books) {
    const { width } = getSpineSize(book.id);
    const additional = current.length === 0 ? width : width + SPINE_GAP;
    if (current.length > 0 && currentWidth + additional > availableWidth) {
      lines.push(current);
      current = [book];
      currentWidth = width;
    } else {
      current.push(book);
      currentWidth += additional;
    }
  }
  if (current.length > 0) lines.push(current);
  return lines;
}
