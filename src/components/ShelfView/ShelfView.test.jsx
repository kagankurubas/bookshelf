import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ShelfView from './ShelfView';
import i18n from '../../i18n/i18n';

const shelfDnd = {
  draggedBookId: null, dragOverTarget: null, pickedBookId: null,
  getSlotInteractionProps: () => ({}),
  handleDragEnd: vi.fn(), handleAddShelfRow: vi.fn(), handleRemoveShelfRow: vi.fn(), cancelPick: vi.fn(), handlePickBook: vi.fn(),
};

afterEach(() => i18n.changeLanguage('tr'));

describe('ShelfView row count', () => {
  it.each([
    ['tr', 1, '1 kat'],
    ['tr', 3, '3 kat'],
    ['en', 1, '1 row'],
    ['en', 3, '3 rows'],
  ])('shows the number of rows next to the row buttons (%s, %i)', async (lang, shelfCount, expected) => {
    await i18n.changeLanguage(lang);
    const { container } = render(<ShelfView books={[]} shelfCount={shelfCount} shelfDnd={shelfDnd} onOpenBook={vi.fn()} />);

    expect(container.querySelector('.shelf-row-count')).toHaveTextContent(new RegExp(`^${expected}$`));
  });

  it('names the row buttons as rows in both languages', async () => {
    const { rerender } = render(<ShelfView books={[]} shelfCount={2} shelfDnd={shelfDnd} onOpenBook={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Kat Ekle/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Kat Sil/ })).toBeInTheDocument();

    await i18n.changeLanguage('en');
    rerender(<ShelfView books={[]} shelfCount={2} shelfDnd={shelfDnd} onOpenBook={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Add row/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Remove row/ })).toBeInTheDocument();
  });
});
