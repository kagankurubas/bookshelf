import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import OfflineBanner from './OfflineBanner';
import i18n from '../../i18n/i18n';

describe('OfflineBanner', () => {
  it('shows nothing online when no book failed to send', () => {
    const { container } = render(<OfflineBanner isOnline queuedCount={2} failedCount={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('tells about unsent books while online, without saying they vanish on sign-out', () => {
    render(<OfflineBanner isOnline queuedCount={0} failedCount={2} />);

    const banner = screen.getByRole('status');
    expect(banner).toHaveTextContent('Bu cihazda 2 kitap gönderilemedi. Çıkış yaparak silebilirsin.');
    expect(banner.textContent).not.toMatch(/silinirler|İnternet bağlantın yok/);
    expect(banner).toHaveClass('offline-banner--failed');
  });

  it('adds the unsent books to the offline notice', () => {
    render(<OfflineBanner isOnline={false} queuedCount={1} failedCount={1} />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'İnternet bağlantın yok. Bazı özellikler çalışmayabilir. 1 kitap bağlantı gelince eklenecek. Bu cihazda 1 kitap gönderilemedi. Çıkış yaparak silebilirsin.'
    );
  });

  it('shows the online notice in English, singular and plural', async () => {
    await i18n.changeLanguage('en');
    try {
      const { rerender } = render(<OfflineBanner isOnline queuedCount={0} failedCount={1} />);
      expect(screen.getByRole('status')).toHaveTextContent("1 book on this device couldn't be sent. You can delete it by signing out.");

      rerender(<OfflineBanner isOnline queuedCount={0} failedCount={3} />);
      expect(screen.getByRole('status')).toHaveTextContent("3 books on this device couldn't be sent. You can delete them by signing out.");
    } finally {
      await i18n.changeLanguage('tr');
    }
  });
});
