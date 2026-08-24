import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
});
