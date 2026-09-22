// Spine size is derived deterministically from the book's id (same on
// every render) so spines vary slightly in width/height like a real
// bookshelf, without needing to keep random state.
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

// Color is chosen by category, but books in the same category all in the
// exact same tone made the shelf look like a flat-colored wall. We add a
// small, deterministic hue/saturation/brightness offset derived from the
// book's id for variety within the family, like a real bookshelf - the
// category stays recognizable, but each spine is slightly different.
export function getSpineFilter(id) {
  const hash = hashString(`spine-${id}`);
  const hueShift = ((hash % 41) - 20); // -20..20 degrees
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

// 3-letter category abbreviation shown on the spine's small foil badge -
// makes the category readable as text when color alone isn't distinctive
// enough (colorblindness, similar tones). Category is always stored as a
// Turkish canonical string in the DB, so the UI language decides which map
// to use.
export function getCategoryEmblem(category, language = 'tr') {
  const emblems = language === 'en' ? CATEGORY_EMBLEMS_EN : CATEGORY_EMBLEMS_TR;
  if (emblems[category]) return emblems[category];
  return category ? category.slice(0, 3).toUpperCase() : '';
}

// CSS class selecting spine background color by category - ShelfView and
// Reading Recap share the same ".shelf-book.category-*" rules (App.css).
export function getCategoryColorClass(category) {
  switch (category) {
    case 'Klasik Edebiyat': return 'category-klasik';
    case 'Fantastik Kurgu': return 'category-fantastik';
    case 'Bilim Kurgu': return 'category-bilimkurgu';
    case 'Distopya': return 'category-distopya';
    case 'Kurgu': return 'category-kurgu';
    case 'Tarih': return 'category-tarih';
    case 'Felsefe': return 'category-felsefe';
    case 'Biyografi': return 'category-biyografi';
    case 'Bilim': return 'category-bilim';
    default: return 'category-default';
  }
}

// Counts how many books are on a given shelf row of a library - new books
// are appended to the end of that row (shelf_row: 0, sequential
// slot_index). useShelfDnd and BatchScanner share this same calculation.
export function countBooksInRow(books, libraryId, shelfRow) {
  return books.filter((b) => b.libraryIds.includes(libraryId) && (b.shelfRow ?? 0) === shelfRow).length;
}

const SPINE_GAP = 9; // must match the gap in .shelf-row

// Splits books in a shelf row into lines that fit the given width - each
// line gets its own full (unbroken) shelf line. No fixed "how many books
// fit" assumption, sums actual pixel widths.
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
