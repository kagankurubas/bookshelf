import { useTranslation } from 'react-i18next';
import AuthScreen from '../AuthScreen/AuthScreen';

// Gates the app behind auth: shows a loading placeholder while the session
// is being resolved, the auth screen once resolved with no user, or
// `children` (the logged-in app) once a user is present.
function AuthGate({ authLoading, user, onSignIn, onSignUp, redirectError, accountDeletedNotice, children }) {
  const { t } = useTranslation();

  if (authLoading) {
    return (
      <div className="main-container">
        <p className="app-loading-text">{t('app.loading')}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthScreen
        onSignIn={onSignIn}
        onSignUp={onSignUp}
        redirectError={redirectError}
        accountDeletedNotice={accountDeletedNotice}
      />
    );
  }

  return children;
}

export default AuthGate;
