import { describe, it, expect } from 'vitest';
import { normalizeTitleAuthor, markPossibleDuplicates } from './importDedup';

describe('normalizeTitleAuthor', () => {
  it('normalizes case and surrounding whitespace so trivial differences match', () => {
    expect(normalizeTitleAuthor('Fahrenheit 451', 'Ray Bradbury')).toBe(
      normalizeTitleAuthor(' fahrenheit 451 ', ' RAY BRADBURY ')
    );
  });

  it('treats different titles or authors as distinct', () => {
    expect(normalizeTitleAuthor('Book A', 'Author')).not.toBe(normalizeTitleAuthor('Book B', 'Author'));
  });
});

describe('markPossibleDuplicates', () => {
  const existingBooks = [{ title: 'Fahrenheit 451', author: 'Ray Bradbury' }];

  it('flags a row matching an existing book by normalized title+author', () => {
    const [flagged] = markPossibleDuplicates(
      [{ title: ' fahrenheit 451 ', author: 'ray bradbury' }],
      existingBooks
    );
    expect(flagged.isPossibleDuplicate).toBe(true);
  });

  it('does not flag a row with no matching existing book', () => {
    const [flagged] = markPossibleDuplicates([{ title: 'A New Book', author: 'Someone' }], existingBooks);
    expect(flagged.isPossibleDuplicate).toBe(false);
  });

  it('does not mutate the original bookFields objects', () => {
    const input = [{ title: 'Fahrenheit 451', author: 'Ray Bradbury' }];
    markPossibleDuplicates(input, existingBooks);
    expect(input[0].isPossibleDuplicate).toBeUndefined();
  });

  it('handles an empty existing-books list without flagging anything', () => {
    const [flagged] = markPossibleDuplicates([{ title: 'Any Book', author: 'Any Author' }], []);
    expect(flagged.isPossibleDuplicate).toBe(false);
  });
});
