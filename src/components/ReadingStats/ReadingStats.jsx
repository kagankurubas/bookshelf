import { useTranslation } from 'react-i18next';
import './ReadingStats.css';

const BookIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M4 5.5C4 4.7 4.7 4 5.5 4H12v16H5.5A1.5 1.5 0 0 1 4 18.5v-13z" />
    <path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H12v16h6.5a1.5 1.5 0 0 0 1.5-1.5v-13z" />
  </svg>
);

const PagesIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M3 9h18" />
  </svg>
);

const StarIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 3l2.6 5.9 6.4.6-4.8 4.3 1.5 6.3L12 17l-5.7 3.1 1.5-6.3-4.8-4.3 6.4-.6z" />
  </svg>
);

function ReadingStats({ stats }) {
  const { t } = useTranslation();
  const { completedCount, totalPages, averageRating, loading } = stats;

  // Kitaplık yokken (kullanıcı henüz hiç kitaplık oluşturmadan önceki an)
  // gösterilecek bir şey yok.
  if (loading && completedCount === 0 && totalPages === 0 && averageRating === null) {
    return null;
  }

  return (
    <div className="reading-stats-card">
      <div className="reading-stats-item">
        <span className="reading-stats-icon"><BookIcon /></span>
        <div>
          <div className="reading-stats-value">{completedCount.toLocaleString()}</div>
          <div className="reading-stats-label">{t('readingStats.completedBooks')}</div>
        </div>
      </div>

      <div className="reading-stats-divider"></div>

      <div className="reading-stats-item">
        <span className="reading-stats-icon"><PagesIcon /></span>
        <div>
          <div className="reading-stats-value">{totalPages.toLocaleString()}</div>
          <div className="reading-stats-label">{t('readingStats.pagesRead')}</div>
        </div>
      </div>

      <div className="reading-stats-divider"></div>

      <div className="reading-stats-item">
        <span className="reading-stats-icon reading-stats-icon-star"><StarIcon /></span>
        <div>
          <div className="reading-stats-value">
            {averageRating != null ? averageRating.toFixed(1) : t('readingStats.noRating')}
          </div>
          <div className="reading-stats-label">{t('readingStats.averageRating')}</div>
        </div>
      </div>
    </div>
  );
}

export default ReadingStats;
