import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TableView from './TableView';
import '../../i18n/i18n';

const FOUR_AUTHORS = 'Fyodor Dostoyevski, Lev Tolstoy, Anton Çehov, Ivan Turgenyev';

describe('TableView author cell', () => {
  it('keeps the full author list in the cell title while the text is clamped', () => {
    render(
      <TableView
        books={[{ id: 'b1', title: 'Kitap', author: FOUR_AUTHORS, status: 'Okunacak', rating: 0, tags: [] }]}
        categories={[]} uniqueAuthors={[]} uniqueTags={[]}
        searchQuery="" onSearchQueryChange={vi.fn()}
        selectedCategory="Tümü" onSelectedCategoryChange={vi.fn()}
        selectedAuthor="Tümü" onSelectedAuthorChange={vi.fn()}
        selectedTag="Tümü" onSelectedTagChange={vi.fn()}
        filterStatus="Tümü" onFilterStatusChange={vi.fn()}
        onOpenBook={vi.fn()} onDeleteBook={vi.fn()} renderStars={() => null}
      />,
    );

    const cell = screen.getByRole('cell', { name: FOUR_AUTHORS });
    expect(cell).toHaveAttribute('title', FOUR_AUTHORS);
    expect(cell.querySelector('.table-author')).toHaveTextContent(FOUR_AUTHORS);
  });
});
