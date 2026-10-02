import { describe, it, expect, afterEach } from 'vitest';
import { toLocalDateString } from './localDate';

const originalTz = process.env.TZ;

afterEach(() => {
  process.env.TZ = originalTz;
});

describe('toLocalDateString', () => {
  it('returns the local day, not the UTC day, just after midnight ahead of UTC', () => {
    process.env.TZ = 'Europe/Istanbul';
    const justAfterMidnight = new Date(2026, 9, 2, 0, 30);

    expect(justAfterMidnight.toISOString().slice(0, 10)).toBe('2026-10-01');
    expect(toLocalDateString(justAfterMidnight)).toBe('2026-10-02');
  });

  it('returns the local day just before midnight behind UTC', () => {
    process.env.TZ = 'America/New_York';
    expect(toLocalDateString(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });
});
