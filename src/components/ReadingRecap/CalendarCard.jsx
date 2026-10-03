import { useTranslation } from 'react-i18next';
import { getCategoryColorClass } from '../../lib/shelfSpine';

const MAX_COVERS_PER_DAY = 2;

function Stars({ rating }) {
  return (
    <span className="calendar-stars" aria-hidden="true">
      {Array.from({ length: rating }, (_, i) => (
        <svg key={i} viewBox="0 0 24 24" width="11" height="11"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" fill="#ffd36b" /></svg>
      ))}
    </span>
  );
}

function CalendarCover({ book, dataUrl }) {
  return (
    <div className="calendar-cover">
      {dataUrl ? (
        <img src={dataUrl} alt="" />
      ) : (
        <div className={`calendar-tile ${getCategoryColorClass(book.category)}`}>
          <span>{book.title}</span>
        </div>
      )}
    </div>
  );
}

function cellLabel(cell, t, formatDay) {
  const date = formatDay(cell.date);
  if (cell.type === 'empty') return t('readingRecap.calendarCellEmpty', { date });
  if (cell.type === 'future') return t('readingRecap.calendarCellFuture', { date });
  const titles = cell.books.map(({ book, rating }) => (
    rating ? t('readingRecap.calendarCellRated', { title: book.title, count: rating }) : book.title
  ));
  return t('readingRecap.calendarCellRead', { date, titles: titles.join(', ') });
}

function CalendarDay({ cell, coverFor, t, formatDay }) {
  if (cell.type === 'outside') return <div className="calendar-cell calendar-cell--outside" aria-hidden="true" />;
  const label = cellLabel(cell, t, formatDay);
  if (cell.type !== 'read') {
    return (
      <div className={`calendar-cell calendar-cell--${cell.type}`} role="img" aria-label={label}>
        <span className="calendar-day-number" aria-hidden="true">{cell.day}</span>
      </div>
    );
  }
  const shown = cell.books.slice(0, MAX_COVERS_PER_DAY);
  const hidden = cell.books.length - shown.length;
  // Finished books sort first, so the first rated entry is the one shown.
  const rating = cell.books.find((entry) => entry.rating)?.rating;
  return (
    <div className={`calendar-cell calendar-cell--read calendar-cell--covers-${shown.length}`} role="img" aria-label={label}>
      {shown.map((entry) => (
        <CalendarCover key={entry.book.id} book={entry.book} dataUrl={coverFor(entry.book)} />
      ))}
      <span className="calendar-day-number">{cell.day}</span>
      {hidden > 0 && <span className="calendar-more">{t('readingRecap.calendarMoreBadge', { count: hidden })}</span>}
      {rating && <Stars rating={rating} />}
    </div>
  );
}

// The exported calendar card: renders only data URLs or colored tiles, never a
// remote image, so a broken cover can't make the export fail.
function CalendarCard({ cardRef, calendar, periodLabel, isEmpty, coverFor }) {
  const { t, i18n } = useTranslation();
  const weekdays = t('readingRecap.weekdaysShort', { returnObjects: true });
  const dayFormat = new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'long' });
  const formatDay = (date) => {
    const [year, month, day] = date.split('-').map(Number);
    return dayFormat.format(new Date(year, month - 1, day));
  };

  return (
    <div className="recap-card recap-card--calendar" ref={cardRef}>
      <span className="recap-card-watermark">{t('app.name')}</span>
      <span className="recap-card-period">{periodLabel}</span>
      {isEmpty ? (
        <p className="recap-card-empty">{t('readingRecap.calendarEmpty')}</p>
      ) : (
        <div className="calendar-grid" style={{ gridTemplateRows: `auto repeat(${calendar.weeks.length}, 1fr)` }}>
          {weekdays.map((label) => (
            <span key={label} className="calendar-weekday" aria-hidden="true">{label}</span>
          ))}
          {calendar.weeks.flat().map((cell, i) => (
            <CalendarDay key={cell.date ?? `outside-${i}`} cell={cell} coverFor={coverFor} t={t} formatDay={formatDay} />
          ))}
        </div>
      )}
    </div>
  );
}

export default CalendarCard;
