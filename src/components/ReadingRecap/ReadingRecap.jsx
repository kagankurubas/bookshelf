import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toBlob } from 'html-to-image';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { getFinishedBooksInPeriod, getRecapYearOptions, splitForDisplay } from '../../lib/readingRecap';
import { getSpineSize, getSpineFilter, getCategoryEmblem, getCategoryColorClass } from '../../lib/shelfSpine';
import CustomSelect from '../CustomSelect/CustomSelect';
import { ShareIcon, DownloadIcon } from '../icons/Icons';
import './ReadingRecap.css';

const now = new Date();
const CURRENT_YEAR = now.getFullYear();
const CURRENT_MONTH = now.getMonth() + 1;

const supportsNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

// Spine sizes from ShelfView (46-62px x 138-172px) are designed for a
// full-page-width shelf - placed at the same size on the square share card, a
// 24-book period would overflow past the bottom of the card. Instead of
// shrinking the sizes, we scale the rendered image via CSS transform, so
// padding/badge/font ratios (and getSpineSize's deterministic width/color
// mapping) stay identical to ShelfView.
const RECAP_SPINE_SCALE = 0.55;

function RecapSpine({ book, language }) {
  const colorClass = getCategoryColorClass(book.category);
  const { width, height } = getSpineSize(book.id);
  const emblem = getCategoryEmblem(book.category, language);
  return (
    <div className="recap-spine-slot" style={{ width: width * RECAP_SPINE_SCALE, height: height * RECAP_SPINE_SCALE }}>
      <div
        className={`shelf-book recap-spine ${colorClass}`}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          filter: getSpineFilter(book.id),
          transform: `scale(${RECAP_SPINE_SCALE})`,
          transformOrigin: 'top left',
        }}
      >
        <span className="shelf-book-texture"></span>
        <span className="shelf-book-foil"></span>
        <span className="shelf-book-highlight"></span>
        {emblem && <span className="shelf-book-emblem">{emblem}</span>}
        <span className="shelf-book-title">{book.title}</span>
      </div>
    </div>
  );
}

function ReadingRecap({ books, onClose }) {
  const { t, i18n } = useTranslation();
  useEscapeKey(onClose);

  const [mode, setMode] = useState('month');
  const [year, setYear] = useState(CURRENT_YEAR);
  const [month, setMonth] = useState(CURRENT_MONTH);
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareError, setShareError] = useState(null);
  const cardRef = useRef(null);

  const yearOptions = useMemo(() => getRecapYearOptions(books, CURRENT_YEAR), [books]);
  const monthLongLabels = t('dashboard.monthsLong', { returnObjects: true });

  const periodBooks = useMemo(
    () => getFinishedBooksInPeriod(books, mode, year, mode === 'month' ? month : null),
    [books, mode, year, month]
  );
  const { visible, overflowCount } = useMemo(() => splitForDisplay(periodBooks), [periodBooks]);

  const periodLabel = mode === 'month' ? `${monthLongLabels[month - 1]} ${year}` : String(year);
  const isEmpty = periodBooks.length === 0;

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setShareError(null);
  };

  const handleExport = async () => {
    if (!cardRef.current || isEmpty || isGenerating) return;
    setIsGenerating(true);
    setShareError(null);
    try {
      // skipFonts: trying to embed the remote Google Fonts stylesheet as
      // @font-face into the SVG fails to read cssRules due to CORS
      // (SecurityError) - this both pollutes the console and is slow enough
      // to blow past the "user gesture" window navigator.share requires,
      // causing a NotAllowedError. The custom font isn't critical on the card anyway.
      const blob = await toBlob(cardRef.current, { pixelRatio: 2, cacheBust: true, skipFonts: true });
      if (!blob) throw new Error('toBlob returned null');

      const filename = `${t('readingRecap.filenamePrefix')}-${mode === 'month' ? `${year}-${String(month).padStart(2, '0')}` : year}.png`;
      const shareText = t('readingRecap.shareText', { period: periodLabel, count: periodBooks.length });

      if (supportsNativeShare) {
        try {
          const file = new File([blob], filename, { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: t('readingRecap.shareTitle'), text: shareText });
            return;
          }
        } catch (shareErr) {
          // If the user canceled the native share sheet (AbortError), forcing
          // a download instead would be wrong - just stop silently.
          if (shareErr?.name === 'AbortError') return;
          // If sharing failed for another reason (e.g. NotAllowedError - the
          // browser considered the "user gesture" window expired), fall
          // through to download; the fallback below takes over.
        }
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setShareError(t('readingRecap.shareError'));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content recap-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="recap-modal-title">{t('readingRecap.title')}</span>
          <button type="button" className="close-modal-btn" onClick={onClose} aria-label={t('readingRecap.close')}>&times;</button>
        </div>

        <div className="modal-body recap-modal-body">
          <div className="recap-controls">
            <div className="dashboard-metric-toggle">
              <button type="button" className={mode === 'month' ? 'active' : ''} onClick={() => handleModeChange('month')}>
                {t('readingRecap.modeMonth')}
              </button>
              <button type="button" className={mode === 'year' ? 'active' : ''} onClick={() => handleModeChange('year')}>
                {t('readingRecap.modeYear')}
              </button>
            </div>

            {mode === 'month' && (
              <CustomSelect
                className="recap-select"
                ariaLabel={t('readingRecap.monthSelectLabel')}
                value={month}
                onChange={setMonth}
                options={monthLongLabels.map((label, i) => ({ value: i + 1, label }))}
              />
            )}

            <CustomSelect
              className="recap-select"
              ariaLabel={t('readingRecap.yearSelectLabel')}
              value={year}
              onChange={setYear}
              options={yearOptions.map((y) => ({ value: y, label: String(y) }))}
            />
          </div>

          <div className="recap-card" ref={cardRef}>
            <span className="recap-card-watermark">{t('app.name')}</span>
            <span className="recap-card-period">{periodLabel}</span>

            {isEmpty ? (
              <p className="recap-card-empty">{t('readingRecap.empty')}</p>
            ) : (
              <>
                <div className="recap-card-shelf">
                  {visible.map((book) => (
                    <RecapSpine key={book.id} book={book} language={i18n.language} />
                  ))}
                  {overflowCount > 0 && (
                    <div className="recap-overflow-badge">{t('readingRecap.overflowBadge', { count: overflowCount })}</div>
                  )}
                </div>
                <span className="recap-card-count">{t('readingRecap.bookCount', { count: periodBooks.length })}</span>
              </>
            )}
          </div>

          {shareError && <p className="recap-error">{shareError}</p>}

          <button
            type="button"
            className="btn-primary recap-action-btn"
            onClick={handleExport}
            disabled={isEmpty || isGenerating}
          >
            {supportsNativeShare ? <ShareIcon /> : <DownloadIcon />}
            {isGenerating ? t('readingRecap.generating') : t(supportsNativeShare ? 'readingRecap.share' : 'readingRecap.download')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReadingRecap;
