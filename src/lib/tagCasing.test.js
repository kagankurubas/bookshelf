import { describe, it, expect } from 'vitest';
import { resolveTagCasing } from './tagCasing';

describe('resolveTagCasing', () => {
  it('reuses the existing casing when a case-insensitive match is found', () => {
    expect(resolveTagCasing('favori', ['Favori', 'Yeniden Okunacak'])).toBe('Favori');
  });

  it('returns the typed value unchanged when it already matches exactly', () => {
    expect(resolveTagCasing('Favori', ['Favori', 'Yeniden Okunacak'])).toBe('Favori');
  });

  it('returns the typed value unchanged when there is no match at all', () => {
    expect(resolveTagCasing('ödünç aldım', ['Favori'])).toBe('ödünç aldım');
  });

  it('returns the typed value unchanged when the existing tag list is empty', () => {
    expect(resolveTagCasing('favori', [])).toBe('favori');
  });
});
