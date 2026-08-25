// Dashboard'daki kategori grafiği için renk kısmı - dataviz kılavuzunun
// doğrulanmış 8 renkli kategorik paleti (bkz. dataviz skill referans
// paleti), renk körlüğü ve normal görüş ayırt edilebilirlik testlerinden
// geçmiş sabit bir sıra. Kategori isimleri, uygulamanın kendi kategori
// listesiyle (App.jsx categories) eşleşiyor.
//
// Palet en fazla 8 kategoriyi güvenle ayırt edebiliyor (bkz. dataviz
// skill: "A 9th series is never a generated hue - it folds into Other").
// Uygulamada 9 kategori olduğu için en az kullanılanı (Biyografi) ve
// kategorisi olmayan/tanınmayan her şey "Diğer" nötr rengine katlanıyor.
const CATEGORY_CHART_COLORS = {
  'Bilim Kurgu': '#2a78d6',
  'Fantastik Kurgu': '#eb6834',
  Bilim: '#1baf7a',
  Tarih: '#eda100',
  Felsefe: '#e87ba4',
  Kurgu: '#008300',
  Distopya: '#4a3aa7',
  'Klasik Edebiyat': '#e34948',
};

export const OTHER_CATEGORY_LABEL = 'Diğer';
export const OTHER_CATEGORY_COLOR = '#898781';

export function getCategoryChartColor(category) {
  return CATEGORY_CHART_COLORS[category] || OTHER_CATEGORY_COLOR;
}

// get_category_reading_stats'tan gelen ham satırları (her gerçek kategori
// kendi satırı + SQL'in NULL kategori için ürettiği 'Diğer' satırı) renk
// paletinin güvenle ayırt edebildiği kategorilere ve tek bir "Diğer"
// toplamına indirger, kitap sayısına göre azalan sırada döner.
export function foldCategoriesForChart(categories) {
  const known = [];
  let otherCount = 0;
  let otherPages = 0;

  for (const row of categories) {
    if (CATEGORY_CHART_COLORS[row.category]) {
      known.push(row);
    } else {
      otherCount += row.completedCount;
      otherPages += row.totalPages;
    }
  }

  const result = known
    .map((row) => ({ ...row, color: getCategoryChartColor(row.category) }));

  if (otherCount > 0) {
    result.push({
      category: OTHER_CATEGORY_LABEL,
      completedCount: otherCount,
      totalPages: otherPages,
      color: OTHER_CATEGORY_COLOR,
    });
  }

  return result.sort((a, b) => b.completedCount - a.completedCount);
}
