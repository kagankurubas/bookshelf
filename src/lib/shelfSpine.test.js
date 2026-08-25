import { describe, it, expect } from 'vitest';
import { hashString, getSpineSize, getSpineFilter, getCategoryEmblem, chunkIntoLines } from './shelfSpine';

describe('hashString', () => {
  it('is deterministic for the same input', () => {
    expect(hashString('abc-123')).toBe(hashString('abc-123'));
  });

  it('returns a non-negative number', () => {
    expect(hashString('some-book-id')).toBeGreaterThanOrEqual(0);
  });
});

describe('getSpineSize', () => {
  it('is deterministic for the same id', () => {
    const a = getSpineSize('book-1');
    const b = getSpineSize('book-1');
    expect(a).toEqual(b);
  });

  it('keeps width within the expected 46-62px range', () => {
    for (const id of ['a', 'b', 'c', 'some-uuid-1234', '']) {
      const { width } = getSpineSize(id);
      expect(width).toBeGreaterThanOrEqual(46);
      expect(width).toBeLessThanOrEqual(62);
    }
  });

  it('keeps height within the expected 138-172px range', () => {
    for (const id of ['a', 'b', 'c', 'some-uuid-1234', '']) {
      const { height } = getSpineSize(id);
      expect(height).toBeGreaterThanOrEqual(138);
      expect(height).toBeLessThanOrEqual(172);
    }
  });

  it('coerces non-string ids (e.g. numbers) without throwing', () => {
    expect(() => getSpineSize(42)).not.toThrow();
  });
});

describe('getSpineFilter', () => {
  it('is deterministic for the same id', () => {
    expect(getSpineFilter('book-1')).toBe(getSpineFilter('book-1'));
  });

  it('produces different filters for different ids (varied, not monotone)', () => {
    const ids = ['a', 'b', 'c', 'd', 'e'];
    const filters = new Set(ids.map(getSpineFilter));
    expect(filters.size).toBeGreaterThan(1);
  });

  it('returns a hue-rotate/saturate/brightness CSS filter string', () => {
    expect(getSpineFilter('some-uuid-1234')).toMatch(
      /^hue-rotate\(-?\d+deg\) saturate\([\d.]+\) brightness\([\d.]+\)$/
    );
  });
});

describe('getCategoryEmblem', () => {
  it('returns the known 3-letter abbreviation for a mapped category', () => {
    expect(getCategoryEmblem('Bilim Kurgu')).toBe('BLK');
  });

  it('falls back to the first 3 uppercased letters for an unmapped category', () => {
    expect(getCategoryEmblem('Kurgu Dışı')).toBe('KUR');
  });

  it('returns an empty string for no category', () => {
    expect(getCategoryEmblem('')).toBe('');
    expect(getCategoryEmblem(undefined)).toBe('');
  });
});

describe('chunkIntoLines', () => {
  const books = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];

  it('returns a single line when no width constraint is given', () => {
    expect(chunkIntoLines(books, 0)).toEqual([books]);
  });

  it('returns an empty array for no books', () => {
    expect(chunkIntoLines([], 500)).toEqual([]);
  });

  it('puts every book in its own line when the width only fits one at a time', () => {
    const lines = chunkIntoLines(books, 50);
    expect(lines.length).toBe(books.length);
    lines.forEach((line) => expect(line.length).toBe(1));
  });

  it('fits everything on one line when the width is generous', () => {
    expect(chunkIntoLines(books, 10000)).toEqual([books]);
  });

  it('preserves book order across all lines', () => {
    const lines = chunkIntoLines(books, 120);
    const flattened = lines.flat();
    expect(flattened.map((b) => b.id)).toEqual(books.map((b) => b.id));
  });
});
