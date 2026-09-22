import { useTranslation } from 'react-i18next';

// Shown across every top-level screen (loading, auth, logged-in app) - see
// AuthGate, which App.jsx renders alongside this.
function OfflineBanner({ isOnline, queuedCount }) {
  const { t } = useTranslation();

  if (isOnline) return null;

  return (
    <div className="offline-banner" role="status">
      {t('app.offlineBanner')}
      {queuedCount > 0 && ' ' + t('app.offlineBannerQueued', { count: queuedCount })}
    </div>
  );
}

export default OfflineBanner;
