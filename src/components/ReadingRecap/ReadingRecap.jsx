import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toBlob } from 'html-to-image';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { getFinishedBooksInPeriod, getRecapYearOptions, splitForDisplay } from '../../lib/readingRecap';
import {
  buildReadingCalendar,
  countBooksSkippedForDates,
  getCalendarYearOptions,
  resolveCalendarCoverUrl,
} from '../../lib/readingCalendar';
import { loadCoverDataUrl } from '../../lib/coverDataUrl';
import { toLocalIsoDate } from '../../lib/localDate';
import { getSpineSize, getSpineFilter, getCategoryEmblem, getCategoryColorClass } from '../../lib/shelfSpine';
import CustomSelect from '../CustomSelect/CustomSelect';
import CalendarCard from './CalendarCard';
import { ShareIcon, DownloadIcon } from '../icons/Icons';
import './ReadingRecap.css';

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

// Resolves every cover shown in the calendar to a data URL (or null) before
// the card can be exported. `ready` turns true once all of them have settled.
function useCalendarCovers(urls) {
  const [loaded, setLoaded] = useState(() => new Map());
  const key = urls.join('\n');

  useEffect(() => {
    let cancelled = false;
    Promise.all(urls.map((url) => loadCoverDataUrl(url).then((dataUrl) => [url, dataUrl]))).then((entries) => {
      if (!cancelled) setLoaded(new Map(entries));
    });
    return () => {
      cancelled = true;
    };
    // urls is rebuilt every render; key captures its contents.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { covers: loaded, ready: urls.every((url) => loaded.has(url)) };
}

function ReadingRecap({ books, onClose }) {
  const { t, i18n } = useTranslation();
  useEscapeKey(onClose);

  const [today] = useState(() => toLocalIsoDate());
  const currentYear = Number(today.slice(0, 4));
  const currentMonth = Number(today.slice(5, 7));

  const [style, setStyle] = useState('shelf');
  const [mode, setMode] = useState('month');
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareError, setShareError] = useState(null);
  const cardRef = useRef(null);

  const isCalendar = style === 'calendar';
  const isMonthly = isCalendar || mode === 'month';

  const shelfYearOptions = useMemo(() => getRecapYearOptions(books, currentYear), [books, currentYear]);
  const calendarYearOptions = useMemo(() => getCalendarYearOptions(books, currentYear), [books, currentYear]);
  const yearOptions = isCalendar ? calendarYearOptions : shelfYearOptions;
  const monthLongLabels = t('dashboard.monthsLong', { returnObjects: true });
  // The calendar can't show a month that hasn't started yet.
  const selectableMonths = isCalendar && year === currentYear ? currentMonth : 12;

  const periodBooks = useMemo(
    () => getFinishedBooksInPeriod(books, mode, year, mode === 'month' ? month : null),
    [books, mode, year, month]
  );
  const { visible, overflowCount } = useMemo(() => splitForDisplay(periodBooks), [periodBooks]);

  const calendar = useMemo(
    () => (isCalendar ? buildReadingCalendar({ books, year, month, today }) : null),
    [isCalendar, books, year, month, today]
  );
  const readDays = useMemo(
    () => (calendar ? calendar.weeks.flat().filter((cell) => cell.type === 'read') : []),
    [calendar]
  );
  const skippedCount = useMemo(() => (isCalendar ? countBooksSkippedForDates(books) : 0), [isCalendar, books]);

  const coverUrlByBookId = useMemo(() => {
    const map = new Map();
    readDays.forEach((cell) => cell.books.slice(0, 2).forEach(({ book }) => {
      const url = resolveCalendarCoverUrl(book);
      if (url) map.set(book.id, url);
    }));
    return map;
  }, [readDays]);
  const coverUrls = useMemo(() => Array.from(new Set(coverUrlByBookId.values())), [coverUrlByBookId]);
  const { covers, ready: coversReady } = useCalendarCovers(coverUrls);
  const coverFor = (book) => covers.get(coverUrlByBookId.get(book.id)) ?? null;

  const periodLabel = isCalendar
    ? new Intl.DateTimeFormat(i18n.language, { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1))
    : mode === 'month' ? `${monthLongLabels[month - 1]} ${year}` : String(year);
  const isEmpty = isCalendar ? readDays.length === 0 : periodBooks.length === 0;
  const isPreparing = isCalendar && !coversReady;

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setShareError(null);
  };

  const handleStyleChange = (newStyle) => {
    setStyle(newStyle);
    setShareError(null);
    if (newStyle === 'calendar') {
      if (year > currentYear || (year === currentYear && month > currentMonth)) {
        setYear(currentYear);
        setMonth(currentMonth);
      }
    } else if (!shelfYearOptions.includes(year)) {
      setYear(currentYear);
    }
  };

  const handleYearChange = (newYear) => {
    setYear(newYear);
    if (isCalendar && newYear === currentYear && month > currentMonth) setMonth(currentMonth);
  };

  const handleExport = async () => {
    if (!cardRef.current || isEmpty || isGenerating || isPreparing) return;
    setIsGenerating(true);
    setShareError(null);
    try {
      // skipFonts: trying to embed the remote Google Fonts stylesheet as
      // @font-face into the SVG fails to read cssRules due to CORS
      // (SecurityError) - this both pollutes the console and is slow enough
      // to blow past the "user gesture" window navigator.share requires,
      // causing a NotAllowedError. The custom font isn't critical on the card anyway.
      // The calendar card holds only data URLs, so it needs no cacheBust.
      const blob = await toBlob(cardRef.current, { pixelRatio: 2, cacheBust: !isCalendar, skipFonts: true });
      if (!blob) throw new Error('toBlob returned null');

      const period = isMonthly ? `${year}-${String(month).padStart(2, '0')}` : year;
      const filename = `${t('readingRecap.filenamePrefix')}-${isCalendar ? 'calendar-' : ''}${period}.png`;
      const shareText = isCalendar
        ? t('readingRecap.calendarShareText', { period: periodLabel, count: readDays.length })
        : t('readingRecap.shareText', { period: periodLabel, count: periodBooks.length });

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
            <div className="dashboard-metric-toggle" role="group" aria-label={t('readingRecap.styleLabel')}>
              <button type="button" className={style === 'shelf' ? 'active' : ''} aria-pressed={style === 'shelf'} onClick={() => handleStyleChange('shelf')}>
                {t('readingRecap.styleShelf')}
              </button>
              <button type="button" className={isCalendar ? 'active' : ''} aria-pressed={isCalendar} onClick={() => handleStyleChange('calendar')}>
                {t('readingRecap.styleCalendar')}
              </button>
            </div>

            {!isCalendar && (
              <div className="dashboard-metric-toggle">
                <button type="button" className={mode === 'month' ? 'active' : ''} onClick={() => handleModeChange('month')}>
                  {t('readingRecap.modeMonth')}
                </button>
                <button type="button" className={mode === 'year' ? 'active' : ''} onClick={() => handleModeChange('year')}>
                  {t('readingRecap.modeYear')}
                </button>
              </div>
            )}

            {isMonthly && (
              <CustomSelect
                className="recap-select"
                ariaLabel={t('readingRecap.monthSelectLabel')}
                value={month}
                onChange={setMonth}
                options={monthLongLabels.slice(0, selectableMonths).map((label, i) => ({ value: i + 1, label }))}
              />
            )}

            <CustomSelect
              className="recap-select"
              ariaLabel={t('readingRecap.yearSelectLabel')}
              value={year}
              onChange={handleYearChange}
              options={yearOptions.map((y) => ({ value: y, label: String(y) }))}
            />
          </div>

          {skippedCount > 0 && (
            <p className="recap-skipped-note">{t('readingRecap.calendarSkipped', { count: skippedCount })}</p>
          )}

          {isCalendar ? (
            <CalendarCard cardRef={cardRef} calendar={calendar} periodLabel={periodLabel} isEmpty={isEmpty} coverFor={coverFor} />
          ) : (
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
          )}

          {shareError && <p className="recap-error">{shareError}</p>}

          <button
            type="button"
            className="btn-primary recap-action-btn"
            onClick={handleExport}
            disabled={isEmpty || isGenerating || isPreparing}
          >
            {supportsNativeShare ? <ShareIcon /> : <DownloadIcon />}
            {isGenerating || isPreparing ? t('readingRecap.generating') : t(supportsNativeShare ? 'readingRecap.share' : 'readingRecap.download')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReadingRecap;
