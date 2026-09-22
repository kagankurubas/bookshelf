import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { IMPORT_PARSERS } from '../../lib/importParsers';
import { checkFileSizeLimit, checkRowCountLimit } from '../../lib/importLimits';
import { markPossibleDuplicates } from '../../lib/importDedup';
import './ImportPreviewModal.css';

// Shared modal opened when the user triggers Settings > Data > Import, which
// drives the whole end-to-end flow (pick platform -> upload file -> preview/dedup
// -> confirm -> addBook -> summary). No platform-specific logic lives here -
// which platforms can be picked and which parser is called for each is fully
// derived from the IMPORT_PARSERS map (see lib/importParsers.js), so ticket 04
// (StoryGraph) can add a new parser without touching this component.
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
  const [roundedRatingsCount, setRoundedRatingsCount] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [summary, setSummary] = useState(null);

  const defaultLibrary = (libraries || []).find((lib) => lib.isDefault) || (libraries || [])[0] || null;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setFileError(null);

    // The size check works off file.size - the file's full text hasn't been
    // read YET, so an oversized file never gets loaded into browser memory
    // via file.text() (see lib/importLimits.js).
    const sizeCheck = checkFileSizeLimit(file.size);
    if (!sizeCheck.ok) {
      setFileError(sizeCheck.reason);
      return;
    }

    setIsReading(true);
    try {
      const csvText = await file.text();
      const rowCountCheck = checkRowCountLimit(csvText);
      if (!rowCountCheck.ok) {
        setFileError(rowCountCheck.reason);
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
      // Only some platform parsers (e.g. StoryGraph) round fractional
      // ratings - falls back to 0 for parsers like Goodreads that never
      // return this field, so the summary line doesn't show up needlessly.
      setRoundedRatingsCount(result.roundedRatingsCount || 0);
      setStep('preview');
    } catch {
      // File couldn't be read (e.g. corrupt/unexpected encoding) - show a
      // generic, non-technical error message.
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
      malformedRowCount: parseSkippedRows.filter((row) => row.reason === 'malformed-row').length,
      duplicateSkippedCount,
      deselectedCount,
      addFailedCount,
      roundedRatingsCount,
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

              {parseSkippedRows.filter((row) => row.reason === 'missing-title').length > 0 && (
                <p className="import-status-text">
                  {t('import.missingTitleSkipped', {
                    count: parseSkippedRows.filter((row) => row.reason === 'missing-title').length,
                  })}
                </p>
              )}
              {parseSkippedRows.filter((row) => row.reason === 'malformed-row').length > 0 && (
                <p className="import-status-text">
                  {t('import.summaryMalformedRows', {
                    count: parseSkippedRows.filter((row) => row.reason === 'malformed-row').length,
                  })}
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
              {summary.malformedRowCount > 0 && (
                <p className="import-summary-line">
                  {t('import.summaryMalformedRows', { count: summary.malformedRowCount })}
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
              {summary.roundedRatingsCount > 0 && (
                <p className="import-summary-line">
                  {t('import.summaryRoundedRatings', { count: summary.roundedRatingsCount })}
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
