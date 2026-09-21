import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useReadingStats } from './useReadingStats';
import { supabase } from '../lib/supabaseClient';

vi.mock('../lib/supabaseClient', () => ({
  supabase: { rpc: vi.fn() },
}));

function mockRpcResult(data, error = null) {
  const single = vi.fn().mockResolvedValue({ data, error });
  supabase.rpc.mockReturnValue({ single });
  return single;
}

describe('useReadingStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls get_reading_stats with { get: true } (GET mode) so the offline runtime-caching rule can intercept it', async () => {
    mockRpcResult({ completed_count: 5, total_pages: 1200, average_rating: 4.2 });

    renderHook(() => useReadingStats('lib-1'));

    await waitFor(() => expect(supabase.rpc).toHaveBeenCalled());
    expect(supabase.rpc).toHaveBeenCalledWith(
      'get_reading_stats',
      { p_library_id: 'lib-1' },
      { get: true }
    );
  });

  it('omits p_year entirely when year is null, instead of sending a literal "null" (GET query-string args cannot express SQL NULL for an int param)', async () => {
    mockRpcResult({ completed_count: 0, total_pages: 0, average_rating: null });

    renderHook(() => useReadingStats('lib-1', null));

    await waitFor(() => expect(supabase.rpc).toHaveBeenCalled());
    const [, args] = supabase.rpc.mock.calls[0];
    expect(args).not.toHaveProperty('p_year');
  });

  it('includes p_year when a real year is given', async () => {
    mockRpcResult({ completed_count: 2, total_pages: 400, average_rating: 5 });

    renderHook(() => useReadingStats('lib-1', 2024));

    await waitFor(() => expect(supabase.rpc).toHaveBeenCalled());
    expect(supabase.rpc).toHaveBeenCalledWith(
      'get_reading_stats',
      { p_library_id: 'lib-1', p_year: 2024 },
      { get: true }
    );
  });

  it('still maps a successful response to the app stats shape (regression: GET switch does not change response handling)', async () => {
    mockRpcResult({ completed_count: '5', total_pages: '1200', average_rating: '4.2' });

    const { result } = renderHook(() => useReadingStats('lib-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.completedCount).toBe(5);
    expect(result.current.totalPages).toBe(1200);
    expect(result.current.averageRating).toBe(4.2);
    expect(result.current.error).toBeNull();
  });

  it('still surfaces an RPC error the same way as before', async () => {
    mockRpcResult(null, new Error('boom'));

    const { result } = renderHook(() => useReadingStats('lib-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toEqual(new Error('boom'));
  });
});
