import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import CardsView from './CardsView';

const renderStars = () => null;

describe('CardsView', () => {
  it('shows the empty-state message when there are no books', () => {
    render(<CardsView books={[]} onOpenBook={vi.fn()} onDeleteBook={vi.fn()} renderStars={renderStars} />);
    expect(screen.getByText('Bu kitaplıkta henüz kitap yok.')).toBeInTheDocument();
  });

  it('renders a card per book with translated category/status labels', () => {
    const books = [
      { id: '1', title: 'Dune', author: 'Frank Herbert', publisher: '', rating: 0, category: 'Bilim Kurgu', status: 'Okunuyor', coverImage: '' },
    ];
    render(<CardsView books={books} onOpenBook={vi.fn()} onDeleteBook={vi.fn()} renderStars={renderStars} />);

    expect(screen.getByText('Dune')).toBeInTheDocument();
    expect(screen.getByText('Bilim Kurgu')).toBeInTheDocument();
    expect(screen.getByText('Okunuyor')).toBeInTheDocument();
  });

  it('calls onOpenBook when a card is clicked', () => {
    const onOpenBook = vi.fn();
    const books = [{ id: '1', title: 'Dune', author: 'Frank Herbert', publisher: '', rating: 0, category: '', status: 'Okunuyor', coverImage: '' }];
    render(<CardsView books={books} onOpenBook={onOpenBook} onDeleteBook={vi.fn()} renderStars={renderStars} />);

    fireEvent.click(screen.getByText('Dune'));
    expect(onOpenBook).toHaveBeenCalledWith(books[0]);
  });

  it('calls onDeleteBook with the event and the book id when the delete button is clicked', () => {
    const onDeleteBook = vi.fn();
    const books = [{ id: '1', title: 'Dune', author: 'Frank Herbert', publisher: '', rating: 0, category: '', status: 'Okunuyor', coverImage: '' }];
    render(<CardsView books={books} onOpenBook={vi.fn()} onDeleteBook={onDeleteBook} renderStars={renderStars} />);

    fireEvent.click(screen.getByText('Kitabı Sil'));
    expect(onDeleteBook).toHaveBeenCalledTimes(1);
    expect(onDeleteBook.mock.calls[0][1]).toBe('1');
  });

  it('lazy-loads an Open Library cover and falls back to the placeholder when it fails to load', () => {
    const books = [{ id: '1', title: 'Dune', author: 'Frank Herbert', publisher: '', rating: 0, category: '', status: 'Okunuyor', coverImage: 'https://covers.openlibrary.org/b/isbn/9780000000000-L.jpg' }];
    render(<CardsView books={books} onOpenBook={vi.fn()} onDeleteBook={vi.fn()} renderStars={renderStars} />);

    const img = screen.getByRole('img', { name: 'Dune' });
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveAttribute('src', 'https://covers.openlibrary.org/b/isbn/9780000000000-L.jpg?default=false');

    // Stands in for Open Library's 404 on a book without a cover.
    fireEvent.error(img);

    expect(screen.queryByRole('img', { name: 'Dune' })).not.toBeInTheDocument();
    expect(screen.getByText('Kapak Ekle')).toBeInTheDocument();
  });

  it('retries failed covers when the connection comes back', () => {
    const books = [{ id: '1', title: 'Dune', author: 'Frank Herbert', publisher: '', rating: 0, category: '', status: 'Okunuyor', coverImage: 'https://covers.openlibrary.org/b/id/1-L.jpg' }];
    render(<CardsView books={books} onOpenBook={vi.fn()} onDeleteBook={vi.fn()} renderStars={renderStars} />);

    fireEvent.error(screen.getByRole('img', { name: 'Dune' }));
    expect(screen.queryByRole('img', { name: 'Dune' })).not.toBeInTheDocument();

    act(() => { window.dispatchEvent(new Event('online')); });

    expect(screen.getByRole('img', { name: 'Dune' })).toBeInTheDocument();
  });
});
