import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

// The page heading names the active view with the same text as its tab, and
// the browser tab title follows it.
const VIEW_TITLE_KEYS = {
  cards: 'nav.cards',
  table: 'nav.table',
  shelf: 'nav.shelf',
  dashboard: 'nav.dashboard',
};

function PageTitle({ view }) {
  const { t } = useTranslation();
  const title = t(VIEW_TITLE_KEYS[view]);
  const appName = t('app.name');

  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${title} · ${appName}`;
    return () => {
      document.title = previousTitle;
    };
  }, [title, appName]);

  return <h1 className="page-title">{title}</h1>;
}

export default PageTitle;
