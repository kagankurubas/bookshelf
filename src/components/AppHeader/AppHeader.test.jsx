import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import AppHeader from './AppHeader';
import i18n from '../../i18n/i18n';

function renderHeader(activeView = 'cards') {
  render(<AppHeader activeView={activeView} onChangeView={vi.fn()} userEmail="test@example.com" onSignOut={vi.fn()} onOpenSettings={vi.fn()} />);
}

const tabs = () => within(screen.getByRole('navigation')).getAllByRole('button');

describe('AppHeader tabs', () => {
  it('gives every tab a short name for phones while keeping the full name as its accessible name and tooltip', () => {
    renderHeader();

    expect(tabs().map((tab) => [
      tab.getAttribute('aria-label'),
      tab.getAttribute('title'),
      tab.querySelector('.tab-label-short').textContent,
    ])).toEqual([
      ['Kitaplar', 'Kitaplar', 'Kitaplar'],
      ['Tablo', 'Tablo', 'Tablo'],
      ['Kitaplık Rafı', 'Kitaplık Rafı', 'Raf'],
      ['İstatistikler', 'İstatistikler', 'İstatistik'],
      ['Keşfet (yakında)', 'Çok yakında: kitap arkadaşların ve topluluk', 'Keşfet'],
    ]);
  });

  it('keeps the short names out of the accessible names', () => {
    renderHeader();

    for (const tab of tabs()) {
      expect(tab.querySelector('.tab-label-short')).toHaveAttribute('aria-hidden', 'true');
    }
    expect(screen.getByRole('button', { name: 'Kitaplık Rafı' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Raf' })).not.toBeInTheDocument();
  });

  it('says Explore is coming soon in its accessible name, since the badge is hidden on phones', () => {
    renderHeader();

    const explore = screen.getByRole('button', { name: 'Keşfet (yakında)' });
    expect(explore).toBeDisabled();
  });

  it('uses the English short names for an English interface', async () => {
    await i18n.changeLanguage('en');
    try {
      renderHeader('dashboard');

      expect(tabs().map((tab) => tab.querySelector('.tab-label-short').textContent))
        .toEqual(['Books', 'Table', 'Shelf', 'Stats', 'Explore']);
      expect(screen.getByRole('button', { name: 'Statistics' })).toHaveAttribute('aria-current', 'page');
      expect(screen.getByRole('button', { name: 'Explore (coming soon)' })).toBeInTheDocument();
    } finally {
      await i18n.changeLanguage('tr');
    }
  });
});
