import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { buildBooksCsv, buildBooksJson, getExportFilename } from '../../lib/bookExport';
import { DownloadIcon } from '../icons/Icons';
import DeleteAccountModal from './DeleteAccountModal';
import ImportPreviewModal from '../ImportPreviewModal/ImportPreviewModal';
import './SettingsModal.css';

function downloadTextFile(content, filename, mimeType) {
  // ReadingRecap.jsx'teki indirme deseninin aynısı: Blob + createObjectURL +
  // <a download> + revokeObjectURL - yeni bir indirme yöntemi icat edilmiyor.
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function SettingsModal({ userEmail, books = [], addBook, libraries = [], onClose, onAccountDeleted }) {
  const { t } = useTranslation();
  useEscapeKey(onClose);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const libraryNameById = useMemo(
    () => Object.fromEntries(libraries.map((lib) => [lib.id, lib.name])),
    [libraries]
  );

  const handleExportCsv = () => {
    const csv = buildBooksCsv(books, libraryNameById);
    downloadTextFile(csv, getExportFilename('csv'), 'text/csv;charset=utf-8;');
  };

  const handleExportJson = () => {
    const json = buildBooksJson(books, libraryNameById);
    downloadTextFile(json, getExportFilename('json'), 'application/json;charset=utf-8;');
  };

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
              <p className="settings-data-description">{t('settings.dataSectionDescription')}</p>
              <div className="settings-data-actions">
                <button type="button" className="settings-data-btn" onClick={handleExportCsv}>
                  <DownloadIcon />
                  {t('settings.exportCsvButton')}
                </button>
                <button type="button" className="settings-data-btn" onClick={handleExportJson}>
                  <DownloadIcon />
                  {t('settings.exportJsonButton')}
                </button>
              </div>
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
