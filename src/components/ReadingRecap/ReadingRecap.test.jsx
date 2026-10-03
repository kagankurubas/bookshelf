import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import { toBlob } from 'html-to-image';
import ReadingRecap from './ReadingRecap';
import { clearCoverDataUrlCache, COVER_FETCH_TIMEOUT_MS } from '../../lib/coverDataUrl';
import { resizeImageBlob } from '../../lib/imageResize';
import i18n from '../../i18n/i18n';

vi.mock('html-to-image', () => ({ toBlob: vi.fn() }));
// jsdom has no image decoding; the resize step passes the blob through.
vi.mock('../../lib/imageResize', () => ({ resizeImageBlob: vi.fn() }));

const completed = (id, dateStarted, dateFinished, extra = {}) => ({
  id, title: `Book ${id}`, category: 'Kurgu', status: 'Tamamlandı', rating: 4, dateStarted, dateFinished, coverImage: '', isbn: '', ...extra,
});

// Plain response objects: jsdom's FileReader only reads jsdom's own Blob.
const imageResponse = () => ({ ok: true, blob: async () => new Blob(['img'], { type: 'image/jpeg' }) });
const notFound = () => ({ ok: false, blob: async () => new Blob([]) });

const renderRecap = (books) => render(<ReadingRecap books={books} onClose={() => {}} />);
const switchToCalendar = () => fireEvent.click(screen.getByRole('button', { name: 'Takvim' }));
const shareButton = () => screen.getByRole('button', { name: /İndir|Görsel hazırlanıyor/ });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 2, 12, 0));
  clearCoverDataUrlCache();
  vi.mocked(toBlob).mockReset().mockResolvedValue(new Blob(['png'], { type: 'image/png' }));
  vi.mocked(resizeImageBlob).mockReset().mockImplementation(async (blob) => blob);
  globalThis.fetch = vi.fn(async () => imageResponse());
  URL.createObjectURL = vi.fn(() => 'blob:recap');
  URL.revokeObjectURL = vi.fn();
});

afterEach(async () => {
  await act(() => i18n.changeLanguage('tr'));
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('ReadingRecap calendar style', () => {
  it('hides the month/year mode toggle in the calendar style and brings it back for the shelf', () => {
    renderRecap([]);
    expect(screen.getByRole('button', { name: 'Yıl' })).toBeInTheDocument();

    switchToCalendar();
    expect(screen.queryByRole('button', { name: 'Yıl' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Raf' }));
    expect(screen.getByRole('button', { name: 'Yıl' })).toBeInTheDocument();
  });

  it('opens on the current month, titled with the month name, and offers no future months', () => {
    renderRecap([]);
    switchToCalendar();

    expect(screen.getByText('Ekim 2026')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('combobox', { name: 'Ay seç' }));
    const months = screen.getAllByRole('option').map((option) => option.textContent);
    expect(months.at(-1)).toBe('Ekim');
    expect(months).not.toContain('Kasım');
  });

  it('shows the empty message and disables sharing for a month with no reading days', () => {
    renderRecap([completed('a', '2026-09-01', '2026-09-03')]);
    switchToCalendar();

    expect(screen.getByText('Bu ay için kayıtlı okuma günü yok.')).toBeInTheDocument();
    expect(shareButton()).toBeDisabled();
  });

  it('notes books skipped for missing dates outside the exported card', () => {
    const { container } = renderRecap([completed('a', '', '2026-10-01'), completed('b', '2026-10-01', '2026-10-02')]);
    switchToCalendar();

    const note = screen.getByText('Tarihi eksik ya da hatalı 1 kitap takvimde gösterilmiyor.');
    expect(container.querySelector('.recap-card').contains(note)).toBe(false);
  });

  it('shows no skipped note when every book has usable dates', () => {
    renderRecap([completed('a', '2026-10-01', '2026-10-02')]);
    switchToCalendar();
    expect(screen.queryByText(/takvimde gösterilmiyor/)).not.toBeInTheDocument();
  });

  it('embeds covers as data URLs, falls back to a tile for a cover that fails, and exports without cacheBust', async () => {
    globalThis.fetch = vi.fn(async (url) => (url.includes('broken') ? notFound() : imageResponse()));
    const books = [
      completed('a', '2026-10-01', '2026-10-01', { coverImage: 'https://covers.openlibrary.org/b/id/1-L.jpg' }),
      completed('b', '2026-10-02', '2026-10-02', { coverImage: 'https://example.com/broken.jpg' }),
    ];
    const { container } = renderRecap(books);
    switchToCalendar();

    await waitFor(() => expect(shareButton()).toBeEnabled());
    const card = container.querySelector('.recap-card');
    const images = card.querySelectorAll('img');
    expect(images).toHaveLength(1);
    expect(images[0].getAttribute('src')).toMatch(/^data:image\/jpeg;base64,/);
    expect(within(card).getByText('Book b')).toBeInTheDocument();
    expect(resizeImageBlob).toHaveBeenCalledTimes(1);

    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    fireEvent.click(shareButton());
    await waitFor(() => expect(click).toHaveBeenCalled());

    expect(toBlob).toHaveBeenCalledWith(card, expect.objectContaining({ cacheBust: false }));
    expect(click.mock.contexts[0].download).toBe('okuma-ozeti-calendar-2026-10.png');
  });

  it('fetches each cover only once across month changes', async () => {
    const coverImage = 'https://covers.openlibrary.org/b/id/1-L.jpg';
    const books = [
      completed('a', '2026-09-28', '2026-10-01', { coverImage }),
    ];
    renderRecap(books);
    switchToCalendar();
    await waitFor(() => expect(shareButton()).toBeEnabled());

    fireEvent.click(screen.getByRole('combobox', { name: 'Ay seç' }));
    fireEvent.click(screen.getByRole('option', { name: 'Eylül' }));
    await waitFor(() => expect(screen.getByText('Eylül 2026')).toBeInTheDocument());
    await waitFor(() => expect(shareButton()).toBeEnabled());

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(resizeImageBlob).toHaveBeenCalledTimes(1);
    expect(resizeImageBlob).toHaveBeenCalledWith(expect.any(Blob), 200);
  });

  it('labels each day for screen readers with the date, titles and finish-day rating', async () => {
    renderRecap([completed('a', '2026-10-01', '2026-10-01', { title: 'Dune', rating: 5 })]);
    switchToCalendar();

    expect(screen.getByRole('img', { name: '1 Ekim: Dune (5 yıldız)' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '2 Ekim: okuma yok' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '3 Ekim: henüz gelmedi' })).toBeInTheDocument();
  });

  it('switches the calendar texts, title and weekdays to English with the app language', async () => {
    renderRecap([completed('a', '', '2026-10-01'), completed('b', '', '2026-10-02'), completed('c', '2026-10-01', '2026-10-01')]);
    switchToCalendar();
    await act(() => i18n.changeLanguage('en'));

    expect(screen.getByRole('button', { name: 'Calendar' })).toBeInTheDocument();
    expect(screen.getByText('October 2026')).toBeInTheDocument();
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Sun')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'October 1: Book c (4 stars)' })).toBeInTheDocument();
    expect(screen.getByText("2 books with missing or invalid dates aren't shown on the calendar.")).toBeInTheDocument();
  });

  it('gives up on a stalled cover after the timeout, shows a tile and enables sharing', async () => {
    const timeout = new AbortController();
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(timeout.signal);
    globalThis.fetch = vi.fn((url, { signal }) => new Promise((_, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason));
    }));
    const { container } = renderRecap([
      completed('a', '2026-10-01', '2026-10-01', { title: 'Stalled', coverImage: 'https://covers.openlibrary.org/b/id/1-L.jpg' }),
    ]);
    switchToCalendar();

    expect(shareButton()).toBeDisabled();
    expect(timeoutSpy).toHaveBeenCalledWith(COVER_FETCH_TIMEOUT_MS);
    expect(COVER_FETCH_TIMEOUT_MS).toBe(15000);

    await act(async () => timeout.abort(new DOMException('timed out', 'TimeoutError')));
    await waitFor(() => expect(shareButton()).toBeEnabled());
    expect(within(container.querySelector('.recap-card')).getByText('Stalled')).toBeInTheDocument();
  });

  it('falls back to a tile when the cover fetch itself fails (CORS or network error)', async () => {
    globalThis.fetch = vi.fn(async () => { throw new TypeError('Failed to fetch'); });
    const { container } = renderRecap([
      completed('a', '2026-10-01', '2026-10-01', { title: 'No CORS', coverImage: 'https://example.com/cover.jpg' }),
    ]);
    switchToCalendar();

    await waitFor(() => expect(shareButton()).toBeEnabled());
    const card = container.querySelector('.recap-card');
    expect(card.querySelectorAll('img')).toHaveLength(0);
    expect(within(card).getByText('No CORS')).toBeInTheDocument();
  });

  it('keeps sharing disabled while covers are still being prepared', async () => {
    let finishFetch;
    globalThis.fetch = vi.fn(() => new Promise((resolve) => { finishFetch = () => resolve(imageResponse()); }));
    renderRecap([completed('a', '2026-10-01', '2026-10-01', { coverImage: 'https://covers.openlibrary.org/b/id/1-L.jpg' })]);
    switchToCalendar();

    expect(shareButton()).toBeDisabled();
    expect(shareButton()).toHaveTextContent('Görsel hazırlanıyor...');
    fireEvent.click(shareButton());
    expect(toBlob).not.toHaveBeenCalled();

    await act(async () => finishFetch());
    await waitFor(() => expect(shareButton()).toBeEnabled());
  });
});
