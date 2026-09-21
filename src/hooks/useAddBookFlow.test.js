import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useAddBookFlow } from './useAddBookFlow';
import { getBookByIsbn } from '../lib/openLibrary';

vi.mock('../lib/openLibrary', () => ({
  getBookByIsbn: vi.fn(),
}));

describe('useAddBookFlow.handleBarcodeScanned offline fallback', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('falls back to the manual-add flow (prefilled with the scanned isbn) when the lookup fails while offline', async () => {
    getBookByIsbn.mockRejectedValue(new Error('network fail'));
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    const { result } = renderHook(() => useAddBookFlow(null, false));

    await act(async () => {
      await result.current.handleBarcodeScanned('9780553804577');
    });

    await waitFor(() => expect(result.current.isLookingUpIsbn).toBe(false));

    expect(alertSpy).not.toHaveBeenCalled();
    expect(result.current.prefillBook).toEqual({ isbn: '9780553804577' });
    expect(result.current.selectedBook).toBeNull();
    expect(result.current.isModalOpen).toBe(true);
    expect(result.current.isAddChoiceOpen).toBe(false);
  });

  it('still shows the isbnLookup error alert when the lookup fails while online (regression: unchanged today-behavior)', async () => {
    getBookByIsbn.mockRejectedValue(new Error('OpenLibrary getBookByIsbn: HTTP 500'));
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    const { result } = renderHook(() => useAddBookFlow(null, true));

    await act(async () => {
      await result.current.handleBarcodeScanned('9780553804577');
    });

    await waitFor(() => expect(result.current.isLookingUpIsbn).toBe(false));

    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(result.current.isAddChoiceOpen).toBe(true);
    expect(result.current.isModalOpen).toBe(false);
    expect(result.current.prefillBook).toBeNull();
  });
});
