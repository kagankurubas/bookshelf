import { describe, it, expect } from 'vitest';
import { getCategoryChartColor, foldCategoriesForChart, OTHER_CATEGORY_LABEL, OTHER_CATEGORY_COLOR } from './categoryChartColors';

describe('getCategoryChartColor', () => {
  it('returns a distinct color for each of the 8 mapped categories', () => {
    const categories = [
      'Bilim Kurgu', 'Fantastik Kurgu', 'Bilim', 'Tarih',
      'Felsefe', 'Kurgu', 'Distopya', 'Klasik Edebiyat',
    ];
    const colors = new Set(categories.map(getCategoryChartColor));
    expect(colors.size).toBe(8);
  });

  it('falls back to the neutral "Diğer" color for an unmapped category', () => {
    expect(getCategoryChartColor('Biyografi')).toBe(OTHER_CATEGORY_COLOR);
    expect(getCategoryChartColor('Kurgu Dışı')).toBe(OTHER_CATEGORY_COLOR);
    expect(getCategoryChartColor(undefined)).toBe(OTHER_CATEGORY_COLOR);
  });
});

describe('foldCategoriesForChart', () => {
  it('keeps mapped categories separate and sorts by count descending', () => {
    const input = [
      { category: 'Kurgu', completedCount: 3, totalPages: 900 },
      { category: 'Bilim Kurgu', completedCount: 9, totalPages: 2700 },
    ];
    const result = foldCategoriesForChart(input);
    expect(result.map((r) => r.category)).toEqual(['Bilim Kurgu', 'Kurgu']);
  });

  it('folds unmapped categories into a single "Diğer" entry', () => {
    const input = [
      { category: 'Bilim Kurgu', completedCount: 5, totalPages: 1500 },
      { category: 'Biyografi', completedCount: 2, totalPages: 400 },
      { category: 'Diğer', completedCount: 1, totalPages: 100 },
    ];
    const result = foldCategoriesForChart(input);
    const other = result.find((r) => r.category === OTHER_CATEGORY_LABEL);
    expect(other.completedCount).toBe(3);
    expect(other.totalPages).toBe(500);
    expect(other.color).toBe(OTHER_CATEGORY_COLOR);
  });

  it('omits the "Diğer" entry when there is nothing to fold', () => {
    const input = [{ category: 'Kurgu', completedCount: 4, totalPages: 800 }];
    const result = foldCategoriesForChart(input);
    expect(result.find((r) => r.category === OTHER_CATEGORY_LABEL)).toBeUndefined();
  });

  it('returns an empty array for no data', () => {
    expect(foldCategoriesForChart([])).toEqual([]);
  });
});
