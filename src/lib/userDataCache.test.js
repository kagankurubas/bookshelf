import { describe, it, expect, vi, afterEach } from 'vitest';
import { clearUserDataCache, SUPABASE_REST_CACHE } from './userDataCache';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('clearUserDataCache', () => {
  it('deletes the Supabase REST cache', async () => {
    const remove = vi.fn().mockResolvedValue(true);
    vi.stubGlobal('caches', { delete: remove });

    await clearUserDataCache();

    expect(remove).toHaveBeenCalledWith(SUPABASE_REST_CACHE);
    expect(SUPABASE_REST_CACHE).toBe('supabase-rest-cache');
  });

  it('does nothing and does not throw without Cache Storage', async () => {
    vi.stubGlobal('caches', undefined);
    await expect(clearUserDataCache()).resolves.toBeUndefined();
  });

  it('does not throw when deleting the cache fails', async () => {
    vi.stubGlobal('caches', { delete: vi.fn().mockRejectedValue(new Error('SecurityError')) });
    await expect(clearUserDataCache()).resolves.toBeUndefined();
  });
});
