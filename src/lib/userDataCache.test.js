import { describe, it, expect, vi, afterEach } from 'vitest';
import { clearUserDataCache, SUPABASE_REST_CACHE, supabaseRestCachePattern } from './userDataCache';

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

describe('supabaseRestCachePattern', () => {
  const base = 'https://example.supabase.co';
  const pattern = supabaseRestCachePattern(base);

  it.each([
    'books?select=id,title&user_id=eq.u1&order=created_at.asc',
    'libraries?select=*&user_id=eq.u1',
    'rpc/get_reading_stats?p_library_id=l1',
  ])('caches the offline-capable read %s', (path) => {
    expect(pattern.test(`${base}/rest/v1/${path}`)).toBe(true);
  });

  it.each([
    'rest/v1/ai_conversations?select=id,title,created_at&user_id=eq.u1',
    'rest/v1/ai_messages?select=id,role,content&conversation_id=eq.c1',
    'rest/v1/ai_messages',
    'auth/v1/user',
    'functions/v1/ai-chat',
  ])('never caches %s', (path) => {
    expect(pattern.test(`${base}/${path}`)).toBe(false);
  });

  it('matches only the configured Supabase host', () => {
    expect(pattern.test('https://example.supabase.co.evil.example/rest/v1/books')).toBe(false);
    expect(pattern.test('https://evil.example/https://example.supabase.co/rest/v1/books')).toBe(false);
    expect(pattern.test('https://exampleXsupabaseXco/rest/v1/books')).toBe(false);
  });

  it('matches nothing without a Supabase URL', () => {
    expect(supabaseRestCachePattern(undefined).test(`${base}/rest/v1/books`)).toBe(false);
  });
});

