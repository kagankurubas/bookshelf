import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import DeleteAccountModal from './DeleteAccountModal';
import ImportPreviewModal from '../ImportPreviewModal/ImportPreviewModal';
import './SettingsModal.css';

function SettingsModal({ userEmail, onClose, onAccountDeleted, books, addBook, libraries }) {
  const { t } = useTranslation();
  useEscapeKey(onClose);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

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

            <div className="settings-data-section">
              <h4 className="settings-data-title">{t('settings.dataSectionTitle')}</h4>
              <p className="settings-data-description">{t('settings.importDescription')}</p>
              <button
                type="button"
                className="chip-btn"
                onClick={() => setIsImportOpen(true)}
              >
                {t('settings.importButton')}
              </button>
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

      {isImportOpen && (
        <ImportPreviewModal
          books={books}
          addBook={addBook}
          libraries={libraries}
          onClose={() => setIsImportOpen(false)}
        />
      )}
    </>
  );
}

export default SettingsModal;
