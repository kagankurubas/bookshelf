import { describe, it, expect, afterEach, vi } from 'vitest';
import { toLocalIsoDate } from './localDate';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('toLocalIsoDate', () => {
  it('returns the local day, not the UTC day, just after midnight ahead of UTC', () => {
    vi.stubEnv('TZ', 'Europe/Istanbul');
    const justAfterMidnight = new Date(2026, 9, 2, 0, 30);

    expect(justAfterMidnight.toISOString().slice(0, 10)).toBe('2026-10-01');
    expect(toLocalIsoDate(justAfterMidnight)).toBe('2026-10-02');
  });

  it('returns the local day just before midnight behind UTC', () => {
    vi.stubEnv('TZ', 'America/New_York');
    expect(toLocalIsoDate(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });
});
