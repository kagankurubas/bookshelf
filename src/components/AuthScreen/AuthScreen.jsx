import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookLogoIcon } from '../icons/Icons';
import './AuthScreen.css';

function AuthScreen({ onSignIn, onSignUp, redirectError, accountDeletedNotice }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState('signIn'); // 'signIn' | 'signUp'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Supabase dogrulama linki gecersizse (suresi dolmus, zaten kullanilmis vb.)
  // kullaniciyi bos bir ekran yerine burada anlasilir bir mesajla karsilamak
  // icin. Dogrudan prop'tan turetiliyor, bir lazy state kopyasina
  // ALINMIYOR: kullanici bu ekran zaten acikken ayni sekmede eski bir
  // dogrulama linkine tekrar tiklarsa (hash-only navigasyon, component
  // yeniden mount olmaz) useAuthRedirectError redirectError prop'unu
  // SONRADAN gunceller - bir lazy state kopyasi bu degisikligi hicbir
  // zaman yakalayamazdi (bildirilen bug buydu). Yeni bir submit hatasi
  // geldiginde `error` OR ile onune gecer, o yuzden ayrica "dismiss"
  // durumu tutmaya gerek yok.
  const redirectErrorMessage = redirectError
    ? (redirectError.errorCode === 'otp_expired' ? t('auth.verifyLinkExpired') : t('auth.verifyLinkError'))
    : '';

  // Hesabini az once silmis bir kullanici signOut ile buraya donuyor - normal
  // "onay mailini kontrol et" mesajiyla ayni alani kullanan bir bildirim.
  const [showAccountDeletedNotice, setShowAccountDeletedNotice] = useState(() => Boolean(accountDeletedNotice));
  const accountDeletedMessage = showAccountDeletedNotice && accountDeletedNotice ? t('deleteAccount.notice') : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setShowAccountDeletedNotice(false);
    setIsSubmitting(true);

    // Tarayici autofill'i (mobil Safari/Chrome, sifre yoneticileri) input'u
    // gorsel olarak doldurup React'in onChange'ini hemen tetiklemeyebiliyor -
    // kullanici forma hic dokunmadan direkt submit ederse email/password
    // state'i hala bos kalip ilk denemede hatali giris denemesine yol
    // aciyordu. Submit anindaki gercek DOM degerlerini okumak bu
    // senkronizasyon farkini ortadan kaldiriyor.
    const formData = new FormData(e.target);
    const emailValue = formData.get('email') || email;
    const passwordValue = formData.get('password') || password;
    if (emailValue !== email) setEmail(emailValue);
    if (passwordValue !== password) setPassword(passwordValue);

    try {
      if (mode === 'signIn') {
        await onSignIn(emailValue, passwordValue);
      } else {
        const data = await onSignUp(emailValue, passwordValue);
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
              onClick={() => { setMode('signIn'); setError(''); setInfo(''); setShowAccountDeletedNotice(false); }}
            >
              {t('auth.signIn')}
            </button>
            <button
              type="button"
              className={`auth-mode-tab ${mode === 'signUp' ? 'active' : ''}`}
              onClick={() => { setMode('signUp'); setError(''); setInfo(''); setShowAccountDeletedNotice(false); }}
            >
              {t('auth.signUp')}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <input
              type="email"
              name="email"
              placeholder={t('auth.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              autoComplete="email"
              required
            />
            <input
              type="password"
              name="password"
              placeholder={t('auth.passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
              minLength={6}
              required
            />

            {(error || redirectErrorMessage) && (
              <p className="auth-message auth-message-error">{error || redirectErrorMessage}</p>
            )}
            {(info || accountDeletedMessage) && (
              <p className="auth-message auth-message-info">{info || accountDeletedMessage}</p>
            )}

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
