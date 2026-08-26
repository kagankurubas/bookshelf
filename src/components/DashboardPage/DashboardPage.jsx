import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useReadingStats } from '../../hooks/useReadingStats';
import { useReadingYears } from '../../hooks/useReadingYears';
import { useMonthlyReadingStats } from '../../hooks/useMonthlyReadingStats';
import { useYearlyReadingStats } from '../../hooks/useYearlyReadingStats';
import { useCategoryReadingStats } from '../../hooks/useCategoryReadingStats';
import { foldCategoriesForChart } from '../../lib/categoryChartColors';
import ReadingStats from '../ReadingStats/ReadingStats';
import TrendChart from '../charts/TrendChart';
import CategoryPieChart from '../charts/CategoryPieChart';
import { ChevronDownIcon } from '../icons/Icons';
import './DashboardPage.css';

const CalendarIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" />
  </svg>
);

function MetricToggle({ value, onChange, t }) {
  return (
    <div className="dashboard-metric-toggle">
      <button type="button" className={value === 'books' ? 'active' : ''} onClick={() => onChange('books')}>
        {t('dashboard.metricBooks')}
      </button>
      <button type="button" className={value === 'pages' ? 'active' : ''} onClick={() => onChange('pages')}>
        {t('dashboard.metricPages')}
      </button>
    </div>
  );
}

function DashboardPage({ libraryId, libraryName }) {
  const { t } = useTranslation();
  const [selectedYear, setSelectedYear] = useState(null); // null = tüm zamanlar
  const [trendMetric, setTrendMetric] = useState('books'); // 'books' | 'pages' - aylık + yıllık grafikler için
  const [categoryMetric, setCategoryMetric] = useState('books'); // kategori grafiği için ayrı

  const readingYears = useReadingYears(libraryId);
  const { years } = readingYears;
  const readingStats = useReadingStats(libraryId, selectedYear);
  const categoryStats = useCategoryReadingStats(libraryId, selectedYear);
  const yearlyResult = useYearlyReadingStats(libraryId);
  const { yearlyStats } = yearlyResult;

  // Aylık grafik her zaman somut bir yıl gösterir - "Tüm Zamanlar"
  // seçiliyken veri bulunan en yeni yıla (yoksa içinde bulunulan yıla) düşer.
  const monthlyYear = selectedYear ?? years[0] ?? new Date().getFullYear();
  const monthlyResult = useMonthlyReadingStats(libraryId, monthlyYear);
  const { months } = monthlyResult;

  // Bu RPC çağrılarından biri başarısız olursa (ağ/DB hatası), aşağıdaki
  // grafikler sessizce "veri yok" gösterir - kullanıcı bunu gerçek bir boş
  // kitaplıktan ayırt edemez. O yüzden herhangi biri hata verirse üstte
  // açık bir "tekrar dene" mesajı gösteriyoruz.
  const hasLoadError = Boolean(
    readingYears.error || readingStats.error || categoryStats.error || yearlyResult.error || monthlyResult.error
  );
  const handleRetryLoad = () => {
    readingYears.refetchYears();
    readingStats.refetchStats();
    categoryStats.refetchCategories();
    yearlyResult.refetchYearlyStats();
    monthlyResult.refetchMonths();
  };

  const foldedCategories = useMemo(
    () => foldCategoriesForChart(categoryStats.categories),
    [categoryStats.categories]
  );

  const monthShortLabels = t('dashboard.monthsShort', { returnObjects: true });
  const monthLongLabels = t('dashboard.monthsLong', { returnObjects: true });
  const metricSuffix = (metric) => (metric === 'books' ? t('dashboard.metricBooks') : t('dashboard.metricPages'));

  const monthlyChartData = months.map((m, i) => ({
    label: monthShortLabels[i],
    tooltipLabel: monthLongLabels[i],
    value: trendMetric === 'books' ? m.completedCount : m.totalPages,
  }));
  const hasMonthlyData = monthlyChartData.some((d) => d.value > 0);

  const yearlyChartData = yearlyStats.map((y) => ({
    label: String(y.year),
    value: trendMetric === 'books' ? y.completedCount : y.totalPages,
  }));
  const hasYearlyData = yearlyChartData.length > 0;

  const categoryPieData = foldedCategories.map((c) => ({
    category: c.category,
    label: t(`categories.${c.category}`, c.category),
    value: categoryMetric === 'books' ? c.completedCount : c.totalPages,
    color: c.color,
  }));
  const categoryTotal = categoryPieData.reduce((acc, c) => acc + c.value, 0);

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

      {hasLoadError && (
        <div className="dashboard-error-banner">
          <span>{t('dashboard.loadError')}</span>
          <button type="button" className="chip-btn" onClick={handleRetryLoad}>
            {t('app.retry')}
          </button>
        </div>
      )}

      <ReadingStats stats={readingStats} />

      <div className="dashboard-grid">
        <div className="dashboard-card dashboard-card-trend">
          <div className="dashboard-card-header">
            <span className="dashboard-card-title">{t('dashboard.yearlyTitle')}</span>
            <MetricToggle value={trendMetric} onChange={setTrendMetric} t={t} />
          </div>
          {hasYearlyData ? (
            <TrendChart data={yearlyChartData} type="bar" valueSuffix={metricSuffix(trendMetric)} />
          ) : (
            <p className="dashboard-empty-hint">{t('dashboard.noYearlyData')}</p>
          )}
        </div>

        <div className="dashboard-card dashboard-card-trend">
          <div className="dashboard-card-header">
            <span className="dashboard-card-title">{t('dashboard.monthlyTitle')}</span>
            <MetricToggle value={trendMetric} onChange={setTrendMetric} t={t} />
          </div>
          {hasMonthlyData ? (
            <TrendChart data={monthlyChartData} type="bar" valueSuffix={metricSuffix(trendMetric)} />
          ) : (
            <p className="dashboard-empty-hint">{t('dashboard.noMonthlyData')}</p>
          )}
        </div>
      </div>

      <div className="dashboard-card dashboard-card-category-section">
        <div className="dashboard-card-header">
          <span className="dashboard-card-title">{t('dashboard.categoryTitle')}</span>
          <MetricToggle value={categoryMetric} onChange={setCategoryMetric} t={t} />
        </div>
        {categoryPieData.length === 0 ? (
          <p className="dashboard-empty-hint">{t('dashboard.noCategoryData')}</p>
        ) : (
          <CategoryPieChart
            data={categoryPieData}
            total={categoryTotal}
            totalLabel={metricSuffix(categoryMetric)}
          />
        )}
      </div>
    </main>
  );
}

export default DashboardPage;
