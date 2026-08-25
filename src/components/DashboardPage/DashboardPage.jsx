import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useReadingStats } from '../../hooks/useReadingStats';
import { useReadingYears } from '../../hooks/useReadingYears';
import { useMonthlyReadingStats } from '../../hooks/useMonthlyReadingStats';
import { useCategoryReadingStats } from '../../hooks/useCategoryReadingStats';
import { foldCategoriesForChart } from '../../lib/categoryChartColors';
import ReadingStats from '../ReadingStats/ReadingStats';
import { ChevronDownIcon } from '../icons/Icons';
import './DashboardPage.css';

const CalendarIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" />
  </svg>
);

function DashboardPage({ libraryId, libraryName }) {
  const { t } = useTranslation();
  const [selectedYear, setSelectedYear] = useState(null); // null = tüm zamanlar
  const [metric, setMetric] = useState('books'); // 'books' | 'pages'

  const { years } = useReadingYears(libraryId);
  const readingStats = useReadingStats(libraryId, selectedYear);
  const categoryStats = useCategoryReadingStats(libraryId, selectedYear);

  // Aylık grafik her zaman somut bir yıl gösterir - "Tüm Zamanlar"
  // seçiliyken veri bulunan en yeni yıla (yoksa içinde bulunulan yıla) düşer.
  const monthlyYear = selectedYear ?? years[0] ?? new Date().getFullYear();
  const { months } = useMonthlyReadingStats(libraryId, monthlyYear);

  const foldedCategories = useMemo(
    () => foldCategoriesForChart(categoryStats.categories),
    [categoryStats.categories]
  );

  const monthShortLabels = t('dashboard.monthsShort', { returnObjects: true });
  const monthLongLabels = t('dashboard.monthsLong', { returnObjects: true });

  const monthlyValues = months.map((m) => (metric === 'books' ? m.completedCount : m.totalPages));
  const maxMonthlyValue = Math.max(1, ...monthlyValues);
  const maxCategoryCount = Math.max(1, ...foldedCategories.map((c) => c.completedCount));

  const [hoveredMonth, setHoveredMonth] = useState(null);

  return (
    <main className="dashboard-page">
      <div className="dashboard-header-row">
        <div>
          <h1 className="dashboard-title">{t('dashboard.title')}</h1>
          <p className="dashboard-subtitle">{libraryName}</p>
        </div>

        <div className="dashboard-year-select-wrap">
          <CalendarIcon />
          <select
            className="dashboard-year-select"
            value={selectedYear ?? ''}
            onChange={(e) => setSelectedYear(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">{t('dashboard.allTime')}</option>
            {years.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <ChevronDownIcon />
        </div>
      </div>

      <ReadingStats stats={readingStats} />

      <div className="dashboard-grid">
        <div className="dashboard-card dashboard-card-monthly">
          <div className="dashboard-card-header">
            <span className="dashboard-card-title">{t('dashboard.monthlyTitle')}</span>
            <div className="dashboard-metric-toggle">
              <button
                type="button"
                className={metric === 'books' ? 'active' : ''}
                onClick={() => setMetric('books')}
              >
                {t('dashboard.metricBooks')}
              </button>
              <button
                type="button"
                className={metric === 'pages' ? 'active' : ''}
                onClick={() => setMetric('pages')}
              >
                {t('dashboard.metricPages')}
              </button>
            </div>
          </div>

          {monthlyValues.every((v) => v === 0) ? (
            <p className="dashboard-empty-hint">{t('dashboard.noMonthlyData')}</p>
          ) : (
            <div className="dashboard-bar-chart">
              {months.map((m, i) => {
                const value = monthlyValues[i];
                const heightPct = value === 0 ? 0 : Math.max(4, (value / maxMonthlyValue) * 100);
                return (
                  <div
                    key={m.month}
                    className="dashboard-bar-col"
                    onMouseEnter={() => setHoveredMonth(m.month)}
                    onMouseLeave={() => setHoveredMonth(null)}
                  >
                    {hoveredMonth === m.month && (
                      <div className="dashboard-bar-tooltip">
                        {monthLongLabels[i]} · {value.toLocaleString()} {metric === 'books' ? t('dashboard.metricBooks') : t('dashboard.metricPages')}
                      </div>
                    )}
                    <div className="dashboard-bar-track">
                      <div
                        className={`dashboard-bar ${hoveredMonth === m.month ? 'hovered' : ''}`}
                        style={{ height: `${heightPct}%` }}
                      ></div>
                    </div>
                    <span className="dashboard-bar-label">{monthShortLabels[i]}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="dashboard-card dashboard-card-category">
          <div className="dashboard-card-header">
            <span className="dashboard-card-title">{t('dashboard.categoryTitle')}</span>
          </div>

          {foldedCategories.length === 0 ? (
            <p className="dashboard-empty-hint">{t('dashboard.noCategoryData')}</p>
          ) : (
            <div className="dashboard-category-list">
              {foldedCategories.map((c) => (
                <div key={c.category} className="dashboard-category-row">
                  <span className="dashboard-category-label" title={t(`categories.${c.category}`, c.category)}>
                    {t(`categories.${c.category}`, c.category)}
                  </span>
                  <div className="dashboard-category-track">
                    <div
                      className="dashboard-category-fill"
                      style={{ width: `${(c.completedCount / maxCategoryCount) * 100}%`, background: c.color }}
                    ></div>
                  </div>
                  <span className="dashboard-category-count">{c.completedCount}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default DashboardPage;
