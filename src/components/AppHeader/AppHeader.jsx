import { useTranslation } from 'react-i18next';
import { BookLogoIcon, GridTabIcon, TableTabIcon, ShelfTabIcon, DashboardTabIcon, CompassIcon, SettingsIcon } from '../icons/Icons';

const LANGUAGES = ['tr', 'en'];

// On phones each tab shows its short name under the icon; the full name
// stays in the accessible name and the tooltip.
const TABS = [
  { view: 'cards', Icon: GridTabIcon, name: 'nav.cards', shortName: 'nav.cardsShort' },
  { view: 'table', Icon: TableTabIcon, name: 'nav.table', shortName: 'nav.tableShort' },
  { view: 'shelf', Icon: ShelfTabIcon, name: 'nav.shelf', shortName: 'nav.shelfShort' },
  { view: 'dashboard', Icon: DashboardTabIcon, name: 'nav.dashboard', shortName: 'nav.dashboardShort' },
];

function AppHeader({ activeView, onChangeView, userEmail, onSignOut, onOpenSettings }) {
  const { t, i18n } = useTranslation();

  return (
    <header className="app-header">
      <div className="brand-mark">
        <BookLogoIcon />
        <span className="brand-word">{t('app.name')}</span>
      </div>

      <nav className="modern-tabs">
        {TABS.map(({ view, Icon, name, shortName }) => (
          <button
            key={view}
            type="button"
            className={`modern-tab-btn ${activeView === view ? 'active' : ''}`}
            onClick={() => onChangeView(view)}
            aria-label={t(name)}
            title={t(name)}
            aria-current={activeView === view ? 'page' : undefined}
          >
            <Icon />
            <span className="tab-label">{t(name)}</span>
            <span className="tab-label-short" aria-hidden="true">{t(shortName)}</span>
          </button>
        ))}
        <button
          type="button"
          className="modern-tab-btn"
          disabled
          style={{ cursor: 'not-allowed', opacity: 0.55 }}
          title={t('nav.exploreTooltip')}
          aria-label={t('nav.exploreSoonLabel')}
        >
          <CompassIcon />
          <span className="tab-label">{t('nav.explore')}</span>
          <span className="tab-label-short" aria-hidden="true">{t('nav.exploreShort')}</span>
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
