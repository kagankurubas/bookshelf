// Color mapping for the dashboard's category chart - the dataviz guide's
// validated 8-color categorical palette (see the dataviz skill reference
// palette), a fixed order that has passed colorblind and normal-vision
// distinguishability tests. Category names match the app's own category
// list (App.jsx categories).
//
// The palette can safely distinguish at most 8 categories (see dataviz
// skill: "A 9th series is never a generated hue - it folds into Other").
// The app has 9 categories, so the least-used one (Biography) and
// anything uncategorized/unrecognized fold into the neutral "Other" color.
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

// Folds the raw rows from get_category_reading_stats (one row per real
// category plus the 'Other' row SQL produces for NULL category) down to
// the categories the palette can distinguish plus a single "Other" total,
// returned sorted by book count descending.
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
