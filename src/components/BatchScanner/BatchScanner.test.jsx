import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BatchScanner from './BatchScanner';
import { NoLibraryError } from '../../lib/saveErrors';
import { getBookByIsbn } from '../../lib/openLibrary';

// The camera scanner is replaced by two buttons that report a scan and end
// the scanning phase.
vi.mock('../BarcodeScanner/BarcodeScanner', () => ({
  default: ({ onScan, onFinish }) => (
    <div>
      <button type="button" onClick={() => onScan('9780441013593')}>scan</button>
      <button type="button" onClick={onFinish}>finish</button>
    </div>
  ),
}));

vi.mock('../../lib/openLibrary', () => ({
  getBookByIsbn: vi.fn(),
  openLibraryCoverUrl: (url) => url,
  coverCrossOrigin: () => undefined,
}));

describe('BatchScanner saving without a library', () => {
  it('shows its own save error, not connection advice, when the books have no library', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    getBookByIsbn.mockResolvedValue({ title: 'Dune', author: 'Frank Herbert', isbn: '9780441013593' });
    const addBook = vi.fn().mockRejectedValue(new NoLibraryError());
    render(
      <BatchScanner
        books={[]}
        activeLibraryId={null}
        addBook={addBook}
        isOnline
        onBatchSaved={vi.fn()}
        onClose={vi.fn()}
        onManualAddIsbn={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'scan' }));
    await screen.findByText('Dune');
    fireEvent.click(screen.getByRole('button', { name: 'finish' }));
    fireEvent.click(await screen.findByRole('button', { name: /Hepsini Kaydet/ }));

    const message = await screen.findByText('Kitaplar kaydedilirken bir hata oluştu. Bir kısmı zaten kaydedilmiş olabilir.');
    expect(message.textContent).not.toMatch(/bağlantı/i);
    expect(addBook).toHaveBeenCalledWith(expect.objectContaining({ libraryIds: [null] }));
  });
});
