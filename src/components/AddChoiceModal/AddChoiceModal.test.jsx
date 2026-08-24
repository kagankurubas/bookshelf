import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AddChoiceModal from './AddChoiceModal';

function renderModal(overrides = {}) {
  const handlers = {
    onClose: vi.fn(),
    onBarcodeAdd: vi.fn(),
    onSearchAdd: vi.fn(),
    onBatchAdd: vi.fn(),
    onManualAdd: vi.fn(),
    ...overrides,
  };
  render(<AddChoiceModal {...handlers} />);
  return handlers;
}

describe('AddChoiceModal', () => {
  it('renders all four ways to add a book', () => {
    renderModal();
    expect(screen.getByText('Barkod ile Ekle')).toBeInTheDocument();
    expect(screen.getByText('Ara ve Ekle')).toBeInTheDocument();
    expect(screen.getByText('Toplu Tarama')).toBeInTheDocument();
    expect(screen.getByText('Manuel Ekle')).toBeInTheDocument();
  });

  it('calls onBarcodeAdd when the barcode option is clicked', () => {
    const handlers = renderModal();
    fireEvent.click(screen.getByText('Barkod ile Ekle'));
    expect(handlers.onBarcodeAdd).toHaveBeenCalledTimes(1);
    expect(handlers.onSearchAdd).not.toHaveBeenCalled();
  });

  it('calls onManualAdd when the manual option is clicked', () => {
    const handlers = renderModal();
    fireEvent.click(screen.getByText('Manuel Ekle'));
    expect(handlers.onManualAdd).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the cancel button is clicked', () => {
    const handlers = renderModal();
    fireEvent.click(screen.getByText('İptal'));
    expect(handlers.onClose).toHaveBeenCalledTimes(1);
  });
});
