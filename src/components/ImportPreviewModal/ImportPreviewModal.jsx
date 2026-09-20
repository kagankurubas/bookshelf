import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { IMPORT_PARSERS } from '../../lib/importParsers';
import { checkImportFileLimits } from '../../lib/importLimits';
import { markPossibleDuplicates } from '../../lib/importDedup';
import './ImportPreviewModal.css';

// Kullanici Ayarlar > Veri > Ice Aktar'i tetikledigi zaman acilan, ucdan uca
// akisi (platform sec -> dosya yukle -> onizle/dedup -> onayla -> addBook ->
// ozet) yoneten paylasilan modal. Platforma ozel mantik burada YOK - hangi
// platformlarin secilebilecegi ve her biri icin hangi parser'in cagrilacagi
// tamamen IMPORT_PARSERS haritasindan turetiliyor (bkz. lib/importParsers.js),
// boylece ticket 04 (StoryGraph) bu bilesene dokunmadan yeni bir parser
// ekleyebiliyor.
function ImportPreviewModal({ books, addBook, libraries, onClose }) {
  const { t } = useTranslation();
  useEscapeKey(onClose);

  const platformKeys = useMemo(() => Object.keys(IMPORT_PARSERS), []);
  const [platform, setPlatform] = useState(platformKeys[0]);
  const [step, setStep] = useState('select'); // 'select' | 'preview' | 'done'
  const [fileError, setFileError] = useState(null);
  const [isReading, setIsReading] = useState(false);
  const [previewRows, setPreviewRows] = useState([]);
  const [parseSkippedRows, setParseSkippedRows] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  const [summary, setSummary] = useState(null);

  const defaultLibrary = (libraries || []).find((lib) => lib.isDefault) || (libraries || [])[0] || null;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setFileError(null);
    setIsReading(true);
    try {
      const csvText = await file.text();
      const limitCheck = checkImportFileLimits(csvText, file.size);
      if (!limitCheck.ok) {
        setFileError(limitCheck.reason);
        return;
      }

      const parseFn = IMPORT_PARSERS[platform];
      const result = parseFn(csvText);
      if (result.error) {
        setFileError(result.error);
        return;
      }

      const rowsWithFlags = markPossibleDuplicates(result.bookFields, books || []).map((row, index) => ({
        ...row,
        _rowId: index,
        selected: !row.isPossibleDuplicate,
      }));

      setPreviewRows(rowsWithFlags);
      setParseSkippedRows(result.skippedRows || []);
      setStep('preview');
    } catch {
      // Dosya okunamadi (ör. bozuk/beklenmeyen encoding) - teknik olmayan
      // genel bir hata mesaji gosteriyoruz.
      setFileError('malformed');
    } finally {
      setIsReading(false);
    }
  };

  const toggleRow = (rowId) => {
    setPreviewRows((prev) =>
      prev.map((row) => (row._rowId === rowId ? { ...row, selected: !row.selected } : row))
    );
  };

  const handleConfirm = async () => {
    setIsImporting(true);
    const selectedRows = previewRows.filter((row) => row.selected);
    const duplicateSkippedCount = previewRows.filter((row) => !row.selected && row.isPossibleDuplicate).length;
    const deselectedCount = previewRows.filter((row) => !row.selected && !row.isPossibleDuplicate).length;

    let addedCount = 0;
    let addFailedCount = 0;
    const libraryIds = defaultLibrary ? [defaultLibrary.id] : [];

    for (const row of selectedRows) {
      // eslint-disable-next-line no-unused-vars
      const { _rowId, selected, isPossibleDuplicate, ...bookFields } = row;
      try {
        await addBook({ ...bookFields, libraryIds });
        addedCount += 1;
      } catch {
        addFailedCount += 1;
      }
    }

    setSummary({
      addedCount,
      missingTitleCount: parseSkippedRows.filter((row) => row.reason === 'missing-title').length,
      duplicateSkippedCount,
      deselectedCount,
      addFailedCount,
      libraryName: defaultLibrary?.name || '',
    });
    setIsImporting(false);
    setStep('done');
  };

  const selectedCount = previewRows.filter((row) => row.selected).length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content import-preview-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <button type="button" className="close-modal-btn" onClick={onClose} aria-label={t('settings.close')}>&times;</button>
        </div>
        <div className="modal-body">
          <h3 className="import-modal-title">{t('import.title')}</h3>

          {step === 'select' && (
            <>
              <div className="import-platform-group" role="group" aria-label={t('import.platformLabel')}>
                <span className="import-platform-label">{t('import.platformLabel')}</span>
                <div className="import-platform-options">
                  {platformKeys.map((key) => (
                    <button
                      key={key}
                      type="button"
                      className={`import-platform-option ${platform === key ? 'active' : ''}`}
                      onClick={() => setPlatform(key)}
                    >
                      {t(`import.platform.${key}`)}
                    </button>
                  ))}
                </div>
              </div>

              <label className="import-file-picker">
                <span className="import-file-picker-label">{t('import.chooseFile')}</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  aria-label={t('import.chooseFile')}
                  disabled={isReading}
                />
              </label>

              {isReading && <p className="import-status-text">{t('import.reading')}</p>}
              {fileError && <p className="import-error-text">{t(`import.error.${fileError}`)}</p>}
            </>
          )}

          {step === 'preview' && (
            <>
              <p className="import-preview-summary-line">
                {t('import.previewSummary', { count: previewRows.length, selected: selectedCount })}
              </p>
              <ul className="import-preview-list">
                {previewRows.map((row) => (
                  <li key={row._rowId} className="import-preview-row">
                    <label className="import-preview-row-label">
                      <input
                        type="checkbox"
                        checked={row.selected}
                        onChange={() => toggleRow(row._rowId)}
                      />
                      <span className="import-preview-row-title">{row.title}</span>
                      <span className="import-preview-row-author">{row.author}</span>
                      <span className="import-preview-row-status">{row.status}</span>
                      {row.isPossibleDuplicate && (
                        <span className="import-preview-duplicate-badge">{t('import.possibleDuplicate')}</span>
                      )}
                    </label>
                  </li>
                ))}
              </ul>

              {parseSkippedRows.length > 0 && (
                <p className="import-status-text">
                  {t('import.missingTitleSkipped', { count: parseSkippedRows.length })}
                </p>
              )}

              <div className="import-modal-actions">
                <button type="button" className="chip-btn" onClick={onClose} disabled={isImporting}>
                  {t('import.cancel')}
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleConfirm}
                  disabled={isImporting || selectedCount === 0}
                >
                  {isImporting ? t('import.importing') : t('import.confirmButton', { count: selectedCount })}
                </button>
              </div>
            </>
          )}

          {step === 'done' && summary && (
            <div className="import-summary">
              <p className="import-summary-line import-summary-added">
                {t('import.summaryAdded', { count: summary.addedCount })}
              </p>
              {summary.libraryName && (
                <p className="import-summary-line">
                  {t('import.summaryLibraryNote', { library: summary.libraryName })}
                </p>
              )}
              {summary.missingTitleCount > 0 && (
                <p className="import-summary-line">
                  {t('import.missingTitleSkipped', { count: summary.missingTitleCount })}
                </p>
              )}
              {summary.duplicateSkippedCount > 0 && (
                <p className="import-summary-line">
                  {t('import.summaryDuplicateSkipped', { count: summary.duplicateSkippedCount })}
                </p>
              )}
              {summary.deselectedCount > 0 && (
                <p className="import-summary-line">
                  {t('import.summaryDeselectedSkipped', { count: summary.deselectedCount })}
                </p>
              )}
              {summary.addFailedCount > 0 && (
                <p className="import-summary-line import-summary-error">
                  {t('import.summaryAddFailed', { count: summary.addFailedCount })}
                </p>
              )}

              <div className="import-modal-actions">
                <button type="button" className="btn-primary" onClick={onClose}>
                  {t('import.done')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ImportPreviewModal;
