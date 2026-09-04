import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { useDeleteAccount, WrongPasswordError } from '../../hooks/useDeleteAccount';

// Hesap silme geri donusu olmayan bir islem oldugu icin kullaniciyi tek
// tikla degil, ya onay kelimesini yazdirarak ya da sifresini tekrar
// girdirerek dogruluyoruz.
function DeleteAccountModal({ email, onClose, onDeleted }) {
  const { t } = useTranslation();
  useEscapeKey(onClose);
  const { deleteAccount, isDeleting, error } = useDeleteAccount();

  const [method, setMethod] = useState('text'); // 'text' | 'password'
  const [confirmText, setConfirmText] = useState('');
  const [password, setPassword] = useState('');

  const confirmWord = t('deleteAccount.confirmWord');
  // Duz .toUpperCase() Turkce 'i' -> 'I' (noktasiz) cevirir, ama "SİL" noktali
  // İ ile yaziliyor - bu yuzden 'sil' asla eslesmezdi. Turkce locale'i acikca
  // vererek "sil" -> "SİL" donusumunu dogru yapiyoruz; "delete" gibi noktasiz
  // kelimeler icin bunun bir etkisi yok.
  const isTextValid = confirmText.trim().toLocaleUpperCase('tr') === confirmWord.toLocaleUpperCase('tr');
  const isPasswordValid = password.length > 0;
  const canSubmit = (method === 'text' ? isTextValid : isPasswordValid) && !isDeleting;

  const errorMessage = error
    ? error instanceof WrongPasswordError
      ? t('deleteAccount.wrongPassword')
      : t('deleteAccount.error')
    : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      await deleteAccount(email, method === 'password' ? { password } : {});
      onDeleted();
    } catch {
      // Hata durumu asagida errorMessage ile zaten gosteriliyor, modal acik kalir.
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content delete-account-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <button type="button" className="close-modal-btn" onClick={onClose} aria-label={t('deleteAccount.cancel')}>&times;</button>
        </div>
        <div className="modal-body">
          <h3 className="delete-account-title">{t('deleteAccount.title')}</h3>
          <p className="delete-account-warning">{t('deleteAccount.warning')}</p>
          <ul className="delete-account-list">
            <li>{t('deleteAccount.warningLibraries')}</li>
            <li>{t('deleteAccount.warningBooks')}</li>
            <li>{t('deleteAccount.warningChats')}</li>
          </ul>

          <form onSubmit={handleSubmit}>
            <div className="delete-account-method-tabs" role="group" aria-label={t('deleteAccount.methodGroupLabel')}>
              <button
                type="button"
                className={`delete-account-method-tab ${method === 'text' ? 'active' : ''}`}
                onClick={() => setMethod('text')}
              >
                {t('deleteAccount.methodText')}
              </button>
              <button
                type="button"
                className={`delete-account-method-tab ${method === 'password' ? 'active' : ''}`}
                onClick={() => setMethod('password')}
              >
                {t('deleteAccount.methodPassword')}
              </button>
            </div>

            {method === 'text' ? (
              <input
                type="text"
                className="form-input"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={t('deleteAccount.confirmTextPlaceholder', { word: confirmWord })}
                aria-label={t('deleteAccount.confirmTextPlaceholder', { word: confirmWord })}
                autoComplete="off"
                autoFocus
              />
            ) : (
              <input
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('auth.passwordPlaceholder')}
                aria-label={t('auth.passwordPlaceholder')}
                autoComplete="current-password"
                autoFocus
              />
            )}

            {errorMessage && <p className="auth-message auth-message-error">{errorMessage}</p>}

            <div className="delete-account-actions">
              <button type="button" className="chip-btn" onClick={onClose} disabled={isDeleting}>
                {t('deleteAccount.cancel')}
              </button>
              <button type="submit" className="btn-danger-solid" disabled={!canSubmit}>
                {isDeleting ? t('deleteAccount.deleting') : t('deleteAccount.confirmButton')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default DeleteAccountModal;
