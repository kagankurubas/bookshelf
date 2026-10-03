import { describe, it, expect } from 'vitest';
import { findDefaultLibrary } from './defaultLibrary';

describe('findDefaultLibrary', () => {
  it('picks the library marked default', () => {
    const libraries = [{ id: 'lib-old', isDefault: false }, { id: 'lib-main', isDefault: true }];
    expect(findDefaultLibrary(libraries)).toEqual({ id: 'lib-main', isDefault: true });
  });

  it('falls back to the first library when none is marked default', () => {
    const libraries = [{ id: 'lib-old', isDefault: false }, { id: 'lib-new', isDefault: false }];
    expect(findDefaultLibrary(libraries)).toEqual({ id: 'lib-old', isDefault: false });
  });

  it('has no default without libraries', () => {
    expect(findDefaultLibrary([])).toBeNull();
    expect(findDefaultLibrary(undefined)).toBeNull();
  });
});
