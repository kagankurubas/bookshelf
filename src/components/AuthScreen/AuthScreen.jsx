import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookLogoIcon } from '../icons/Icons';
import './AuthScreen.css';

function AuthScreen({ onSignIn, onSignUp }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState('signIn'); // 'signIn' | 'signUp'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setIsSubmitting(true);
    try {
      if (mode === 'signIn') {
        await onSignIn(email, password);
      } else {
        const data = await onSignUp(email, password);
        if (!data.session) {
          setInfo(t('auth.confirmEmailSent'));
        }
      }
    } catch (err) {
      setError(err.message || t('auth.genericError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-promo-panel">
        <div className="auth-promo-blob auth-promo-blob-1"></div>
        <div className="auth-promo-blob auth-promo-blob-2"></div>

        <div className="auth-promo-brand">
          <BookLogoIcon light />
          <span className="auth-promo-word">{t('app.name')}</span>
        </div>
        <h1 className="auth-promo-title">{t('auth.promoTitle')}</h1>
        <p className="auth-promo-sub">{t('auth.promoSubtitle')}</p>
      </div>

      <div className="auth-form-panel">
        <div className="auth-card">
          <div className="auth-mode-tabs">
            <button
              type="button"
              className={`auth-mode-tab ${mode === 'signIn' ? 'active' : ''}`}
              onClick={() => { setMode('signIn'); setError(''); setInfo(''); }}
            >
              {t('auth.signIn')}
            </button>
            <button
              type="button"
              className={`auth-mode-tab ${mode === 'signUp' ? 'active' : ''}`}
              onClick={() => { setMode('signUp'); setError(''); setInfo(''); }}
            >
              {t('auth.signUp')}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <input
              type="email"
              placeholder={t('auth.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              autoComplete="email"
              required
            />
            <input
              type="password"
              placeholder={t('auth.passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
              minLength={6}
              required
            />

            {error && <p className="auth-message auth-message-error">{error}</p>}
            {info && <p className="auth-message auth-message-info">{info}</p>}

            <button type="submit" className="btn-primary auth-submit" disabled={isSubmitting}>
              {isSubmitting ? t('auth.submitting') : mode === 'signIn' ? t('auth.signIn') : t('auth.signUp')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AuthScreen;
