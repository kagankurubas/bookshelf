import { useTranslation } from 'react-i18next';

// Shown across every top-level screen (loading, auth, logged-in app) - see
// AuthGate, which App.jsx renders alongside this. Offline it is a fixed bar;
// online it only appears for books that couldn't be sent, in the page flow
// so a lasting notice doesn't cover the header.
function OfflineBanner({ isOnline, queuedCount, failedCount = 0 }) {
  const { t } = useTranslation();
  const failedText = failedCount > 0 ? t('app.failedQueued', { count: failedCount }) : null;

  if (isOnline) {
    if (!failedText) return null;
    return (
      <div className="offline-banner offline-banner--failed" role="status">
        {failedText}
      </div>
    );
  }

  return (
    <div className="offline-banner" role="status">
      {t('app.offlineBanner')}
      {queuedCount > 0 && ' ' + t('app.offlineBannerQueued', { count: queuedCount })}
      {failedText && ' ' + failedText}
    </div>
  );
}

export default OfflineBanner;
