import { useTranslation } from 'react-i18next';
import { BookLogoIcon, GridTabIcon, TableTabIcon, ShelfTabIcon, DashboardTabIcon, CompassIcon, SettingsIcon } from '../icons/Icons';

const LANGUAGES = ['tr', 'en'];

function AppHeader({ activeView, onChangeView, userEmail, onSignOut, onOpenSettings }) {
  const { t, i18n } = useTranslation();

  return (
    <header className="app-header">
      <div className="brand-mark">
        <BookLogoIcon />
        <span className="brand-word">{t('app.name')}</span>
      </div>

      <nav className="modern-tabs">
        <button className={`modern-tab-btn ${activeView === 'cards' ? 'active' : ''}`} onClick={() => onChangeView('cards')} aria-label={t('nav.cards')}>
          <GridTabIcon /> <span className="tab-label">{t('nav.cards')}</span>
        </button>
        <button className={`modern-tab-btn ${activeView === 'table' ? 'active' : ''}`} onClick={() => onChangeView('table')} aria-label={t('nav.table')}>
          <TableTabIcon /> <span className="tab-label">{t('nav.table')}</span>
        </button>
        <button className={`modern-tab-btn ${activeView === 'shelf' ? 'active' : ''}`} onClick={() => onChangeView('shelf')} aria-label={t('nav.shelf')}>
          <ShelfTabIcon /> <span className="tab-label">{t('nav.shelf')}</span>
        </button>
        <button className={`modern-tab-btn ${activeView === 'dashboard' ? 'active' : ''}`} onClick={() => onChangeView('dashboard')} aria-label={t('nav.dashboard')}>
          <DashboardTabIcon /> <span className="tab-label">{t('nav.dashboard')}</span>
        </button>
        <button className="modern-tab-btn" disabled style={{ cursor: 'not-allowed', opacity: 0.55 }} title={t('nav.exploreTooltip')} aria-label={t('nav.explore')}>
          <CompassIcon /> <span className="tab-label">{t('nav.explore')}</span>
          <span className="tab-badge">{t('nav.comingSoon')}</span>
        </button>
      </nav>

      <div className="header-actions">
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

        {userEmail && (
          <div className="account-chip" title={userEmail}>
            <span className="account-chip-email">{userEmail}</span>
            <button
              type="button"
              className="account-chip-settings"
              onClick={onOpenSettings}
              title={t('settings.title')}
              aria-label={t('settings.title')}
            >
              <SettingsIcon />
            </button>
            <button type="button" className="account-chip-signout" onClick={onSignOut}>
              {t('auth.signOut')}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

export default AppHeader;
