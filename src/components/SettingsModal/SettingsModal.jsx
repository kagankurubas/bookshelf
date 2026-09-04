import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import DeleteAccountModal from './DeleteAccountModal';
import './SettingsModal.css';

function SettingsModal({ userEmail, onClose, onAccountDeleted }) {
  const { t } = useTranslation();
  useEscapeKey(onClose);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content settings-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <button type="button" className="close-modal-btn" onClick={onClose} aria-label={t('settings.close')}>&times;</button>
          </div>
          <div className="modal-body">
            <h3 className="settings-section-title">{t('settings.title')}</h3>

            <div className="settings-account-row">
              <span className="settings-account-label">{t('settings.emailLabel')}</span>
              <span className="settings-account-value">{userEmail}</span>
            </div>

            <div className="settings-danger-zone">
              <h4 className="settings-danger-title">{t('settings.dangerZoneTitle')}</h4>
              <p className="settings-danger-description">{t('settings.deleteAccountDescription')}</p>
              <button
                type="button"
                className="btn-danger-outline"
                onClick={() => setIsConfirmOpen(true)}
              >
                {t('settings.deleteAccountButton')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {isConfirmOpen && (
        <DeleteAccountModal
          email={userEmail}
          onClose={() => setIsConfirmOpen(false)}
          onDeleted={() => {
            setIsConfirmOpen(false);
            onAccountDeleted();
          }}
        />
      )}
    </>
  );
}

export default SettingsModal;
