import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ImportPreviewModal from './ImportPreviewModal';

const HEADER =
  'Book Id,Title,Author,Author l-f,Additional Authors,ISBN,ISBN13,My Rating,' +
  'Average Rating,Publisher,Binding,Number of Pages,Year Published,' +
  'Original Publication Year,Date Read,Date Added,Bookshelves,' +
  'Bookshelves with positions,Exclusive Shelf,My Review,Spoiler,Private Notes,' +
  'Read Count,Recommended For,Recommended By,Owned Copies,Original Purchase Date,' +
  'Original Purchase Location,Condition,Condition Description,BCID';

// Bir satiri, dedup'i tetikleyecek sekilde mevcut bir kitapla (Fahrenheit 451
// / Ray Bradbury) eslesen "muhtemel cift kayit", digerini yeni bir kitap
// (1984 / George Orwell) olarak kuruyoruz.
const CSV_TEXT = [
  HEADER,
  '1,Fahrenheit 451,Ray Bradbury,"Bradbury, Ray",,,="9781451673319",5,4.0,Simon & Schuster,Paperback,256,1953,1953,2023/06/01,2023/05/01,,,read,,,,,1,,,0,,,,,',
  '2,1984,George Orwell,"Orwell, George",,,="9780451524935",4,4.2,Signet Classic,Paperback,328,1949,1949,2023/07/01,2023/05/01,,,read,,,,,1,,,0,,,,,',
].join('\n');

function buildFile(text = CSV_TEXT) {
  const file = new File([text], 'goodreads_library_export.csv', { type: 'text/csv' });
  // jsdom'da File.text() bazi surumlerde eksik olabiliyor - guvence altina aliyoruz.
  if (!file.text) {
    file.text = () => Promise.resolve(text);
  }
  return file;
}

function renderModal(overrides = {}) {
  const handlers = {
    books: [{ id: 'b1', title: 'Fahrenheit 451', author: 'Ray Bradbury' }],
    addBook: vi.fn().mockResolvedValue({}),
    libraries: [{ id: 'lib-1', name: 'Ana Kitaplık', isDefault: true }],
    onClose: vi.fn(),
    ...overrides,
  };
  render(<ImportPreviewModal {...handlers} />);
  return handlers;
}

async function uploadFile(file = buildFile()) {
  const input = document.querySelector('input[type="file"]');
  await fireEvent.change(input, { target: { files: [file] } });
}

describe('ImportPreviewModal', () => {
  it('shows Goodreads as the platform choice and a file picker initially', () => {
    renderModal();
    expect(screen.getByRole('button', { name: 'Goodreads' })).toBeInTheDocument();
    expect(document.querySelector('input[type="file"]')).toBeInTheDocument();
  });

  it('lets the user select StoryGraph as the import platform (ticket 04)', () => {
    renderModal();
    expect(screen.getByRole('button', { name: 'StoryGraph' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'StoryGraph' }));
    expect(screen.getByRole('button', { name: 'StoryGraph' })).toHaveClass('active');
    expect(screen.getByRole('button', { name: 'Goodreads' })).not.toHaveClass('active');
  });

  it('parses the uploaded file and shows a preview with the duplicate row unchecked by default', async () => {
    renderModal();
    await uploadFile();

    await waitFor(() => expect(screen.getByText('Fahrenheit 451')).toBeInTheDocument());
    expect(screen.getByText('1984')).toBeInTheDocument();
    expect(screen.getByText('Muhtemel çift kayıt')).toBeInTheDocument();

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(2);
    // Ilk satir (Fahrenheit 451) cift kayit oldugu icin varsayilan olarak secimsiz.
    expect(checkboxes[0]).not.toBeChecked();
    // Ikinci satir (1984) yeni bir kitap oldugu icin varsayilan olarak secili.
    expect(checkboxes[1]).toBeChecked();
  });

  it('imports only the selected rows via addBook, targeting the default library, and shows a summary', async () => {
    const { addBook } = renderModal();
    await uploadFile();
    await waitFor(() => expect(screen.getByText('1984')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /1 kitabı içe aktar/ }));

    await waitFor(() => expect(screen.getByText('1 kitap eklendi.')).toBeInTheDocument());
    expect(addBook).toHaveBeenCalledTimes(1);
    expect(addBook).toHaveBeenCalledWith(
      expect.objectContaining({ title: '1984', libraryIds: ['lib-1'] })
    );
    expect(screen.getByText(/Ana Kitaplık/)).toBeInTheDocument();
    expect(screen.getByText(/1 satır, mevcut kitaplarınızla eşleştiği için/)).toBeInTheDocument();
  });

  it('lets the user re-select a possible-duplicate row and import it anyway', async () => {
    const { addBook } = renderModal();
    await uploadFile();
    await waitFor(() => expect(screen.getByText('Fahrenheit 451')).toBeInTheDocument());

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);

    fireEvent.click(screen.getByRole('button', { name: /2 kitabı içe aktar/ }));

    await waitFor(() => expect(screen.getByText('2 kitap eklendi.')).toBeInTheDocument());
    expect(addBook).toHaveBeenCalledTimes(2);
  });

  it('shows a plain-language error for a file that does not match the selected platform', async () => {
    renderModal();
    await uploadFile(buildFile('Name,Email\nAlice,alice@example.com'));

    await waitFor(() =>
      expect(
        screen.getByText('Bu dosya seçtiğin formatla eşleşmiyor. Lütfen platformu ve dosyayı kontrol edip tekrar dene.')
      ).toBeInTheDocument()
    );
  });

  it('shows a plain-language error for an oversized file without attempting to parse it', async () => {
    renderModal();
    const hugeSize = 6 * 1024 * 1024;
    const file = buildFile();
    Object.defineProperty(file, 'size', { value: hugeSize });

    await uploadFile(file);

    await waitFor(() =>
      expect(
        screen.getByText('Bu dosya içe aktarmak için çok büyük (en fazla 5 MB veya 5000 satır). Lütfen daha küçük dosyalara böl.')
      ).toBeInTheDocument()
    );
  });

  it('imports a StoryGraph file and reports the rounded-rating count in the summary', async () => {
    const storygraphHeader =
      'Title,Authors,Contributors,ISBN/UID,Format,Read Status,Date Added,' +
      'Last Date Read,Dates Read,Read Count,Moods,Pace,' +
      'Character- or Plot-Driven?,Strong Character Development?,Loveable Characters?,' +
      'Diverse Characters?,Flawed Characters?,Star Rating,Review,Content Warnings,' +
      'Content Warning Description,Tags,Owned?';
    const storygraphRow = [
      'The Fifth Season', 'N.K. Jemisin', '', '9780316229296', 'Physical Book', 'read',
      '2023/01/01', '2023/02/01', '2023/01/15-2023/02/01', '1', '', '', '', '', '', '', '',
      '4.25', '', '', '', '', '',
    ].join(',');
    const storygraphCsv = [storygraphHeader, storygraphRow].join('\n');

    renderModal({ books: [] });
    fireEvent.click(screen.getByRole('button', { name: 'StoryGraph' }));
    await uploadFile(buildFile(storygraphCsv));

    await waitFor(() => expect(screen.getByText('The Fifth Season')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /1 kitabı içe aktar/ }));

    await waitFor(() => expect(screen.getByText('1 kitap eklendi.')).toBeInTheDocument());
    expect(screen.getByText('1 kitabın puanı en yakın tam sayıya yuvarlandı.')).toBeInTheDocument();
  });

  it('skips a row with a missing title and reports it in the preview and summary', async () => {
    const missingTitleCsv = [
      HEADER,
      ',,George Orwell,,,,,,,,,,,,,,,,,read,,,,,,,,,,,',
      '2,1984,George Orwell,"Orwell, George",,,="9780451524935",4,4.2,Signet Classic,Paperback,328,1949,1949,2023/07/01,2023/05/01,,,read,,,,,1,,,0,,,,,',
    ].join('\n');

    renderModal();
    await uploadFile(buildFile(missingTitleCsv));

    await waitFor(() => expect(screen.getByText('1984')).toBeInTheDocument());
    expect(screen.getByText('1 satır başlık eksik olduğu için atlandı.')).toBeInTheDocument();
  });
});
