import { useTranslation } from 'react-i18next';
import { BookLogoIcon, GridTabIcon, TableTabIcon, ShelfTabIcon, CompassIcon } from '../icons/Icons';

const LANGUAGES = ['tr', 'en'];

function AppHeader({ activeView, onChangeView }) {
  const { t, i18n } = useTranslation();

  return (
    <header className="app-header">
      <div className="brand-mark">
        <BookLogoIcon />
        <span className="brand-word">{t('app.name')}</span>
      </div>

      <div className="modern-tabs">
        <button className={`modern-tab-btn ${activeView === 'cards' ? 'active' : ''}`} onClick={() => onChangeView('cards')}>
          <GridTabIcon /> {t('nav.cards')}
        </button>
        <button className={`modern-tab-btn ${activeView === 'table' ? 'active' : ''}`} onClick={() => onChangeView('table')}>
          <TableTabIcon /> {t('nav.table')}
        </button>
        <button className={`modern-tab-btn ${activeView === 'shelf' ? 'active' : ''}`} onClick={() => onChangeView('shelf')}>
          <ShelfTabIcon /> {t('nav.shelf')}
        </button>
        <button className="modern-tab-btn" disabled style={{ cursor: 'not-allowed', opacity: 0.55 }} title={t('nav.exploreTooltip')}>
          <CompassIcon /> {t('nav.explore')}
          <span className="tab-badge">{t('nav.comingSoon')}</span>
        </button>
      </div>

      <div className="lang-switch" role="group" aria-label={t('language.label')}>
        {LANGUAGES.map((lng) => (
          <button
            key={lng}
            type="button"
            className={`lang-switch-btn ${i18n.resolvedLanguage === lng ? 'active' : ''}`}
            onClick={() => i18n.changeLanguage(lng)}
          >
            {lng.toUpperCase()}
          </button>
        ))}
      </div>
    </header>
  );
}

export default AppHeader;
