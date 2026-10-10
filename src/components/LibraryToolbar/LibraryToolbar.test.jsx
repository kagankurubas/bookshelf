import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LibraryToolbar from './LibraryToolbar';
import '../../i18n/i18n';

describe('LibraryToolbar library select', () => {
  it('lists libraries by name only, without a row count', () => {
    render(
      <LibraryToolbar
        libraries={[
          { id: 'a', name: 'Kitaplığım', shelfCount: 1, isDefault: true },
          { id: 'b', name: 'Yazlık', shelfCount: 3, isDefault: false },
        ]}
        activeLibraryId="a" onChangeActiveLibrary={vi.fn()}
        isAddingLibrary={false} onStartAddingLibrary={vi.fn()} onCancelAddingLibrary={vi.fn()}
        newLibraryName="" onNewLibraryNameChange={vi.fn()} newLibraryNameError={null}
        onCreateLibrary={vi.fn()} onDeleteLibrary={vi.fn()} onOpenAddBook={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('combobox'));

    expect(screen.getAllByRole('option').map((o) => o.textContent.trim())).toEqual(['Kitaplığım', 'Yazlık']);
  });
});
