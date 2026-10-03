import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { toBlob } from 'html-to-image';
import ReadingRecap from './ReadingRecap';
import { clearCoverDataUrlCache } from '../../lib/coverDataUrl';

vi.mock('html-to-image', () => ({ toBlob: vi.fn() }));

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
  vi.mocked(toBlob).mockResolvedValue(new Blob(['png'], { type: 'image/png' }));
  globalThis.fetch = vi.fn(async () => imageResponse());
  URL.createObjectURL = vi.fn(() => 'blob:recap');
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
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
  });
});
