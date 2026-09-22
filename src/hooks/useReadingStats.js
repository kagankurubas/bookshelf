import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const EMPTY_STATS = { completedCount: 0, totalPages: 0, averageRating: null };

function mapStatsRow(row) {
  // Postgres bigint results can come back as strings from supabase-js (to
  // avoid exceeding JS's number precision) - safe to convert with Number()
  // since a personal library's values will always be in a safe range.
  return {
    completedCount: Number(row?.completed_count ?? 0),
    totalPages: Number(row?.total_pages ?? 0),
    averageRating: row?.average_rating != null ? Number(row.average_rating) : null,
  };
}

// Computes a library's reading stats (completed book count, total pages,
// average rating). Instead of fetching all books and summing client-side,
// a single Postgres function (get_reading_stats, see
// supabase/migrations/009_dashboard_stats.sql) aggregates on the DB side -
// scales as the library grows, one round-trip.
// Without year (undefined/null): all-time total; with year: only books
// finished that year (by date_finished) are counted.
export function useReadingStats(libraryId, year = null) {
  const [stats, setStats] = useState(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    if (!libraryId) {
      setStats(EMPTY_STATS);
      setLoading(false);
      return;
    }
    setLoading(true);
    // { get: true } turns the call into a GET (the function is marked
    // 'stable' in migrations/009, and PostgREST allows GET for read-only
    // RPCs) - so vite.config.js's Supabase NetworkFirst runtime-caching
    // rule also catches this request and can return the last known value
    // offline (POST requests never hit Workbox's routes, so this stat used
    // to always come back 0/empty offline).
    // The key is omitted entirely when p_year is null, so it doesn't go
    // into the query string as the literal string "null" (a Postgres int
    // parameter rejects that) - the function's own `default null` takes over.
    const args = { p_library_id: libraryId };
    if (year != null) args.p_year = year;
    const { data, error: rpcError } = await supabase
      .rpc('get_reading_stats', args, { get: true })
      .single();

    if (rpcError) {
      setError(rpcError);
    } else {
      setStats(mapStatsRow(data));
      setError(null);
    }
    setLoading(false);
  }, [libraryId, year]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStats();
  }, [fetchStats]);

  return { ...stats, loading, error, refetchStats: fetchStats };
}
