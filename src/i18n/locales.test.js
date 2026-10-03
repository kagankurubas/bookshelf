import { describe, it, expect } from 'vitest';
import tr from './locales/tr.json';
import en from './locales/en.json';

const keysOf = (node, prefix = '') => Object.entries(node).flatMap(([key, value]) => (
  value && typeof value === 'object' && !Array.isArray(value) ? keysOf(value, `${prefix}${key}.`) : [`${prefix}${key}`]
));

describe('locales', () => {
  it('define the same keys in Turkish and English', () => {
    expect(keysOf(en).sort()).toEqual(keysOf(tr).sort());
  });
});
