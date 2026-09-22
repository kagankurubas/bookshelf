import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

function mapRow(row) {
  return {
    year: Number(row.year),
    completedCount: Number(row.completed_count ?? 0),
    totalPages: Number(row.total_pages ?? 0),
  };
}

// Returns a library's year-over-year reading trend
// (get_yearly_reading_stats) - unlike the monthly chart, not limited to a
// single year: one row per year with data (oldest to newest). Grouped by
// date_finished.
export function useYearlyReadingStats(libraryId) {
  const [yearlyStats, setYearlyStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchYearlyStats = useCallback(async () => {
    if (!libraryId) {
      setYearlyStats([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: rpcError } = await supabase.rpc('get_yearly_reading_stats', {
      p_library_id: libraryId,
    });

    if (rpcError) {
      setError(rpcError);
    } else {
      setYearlyStats((data || []).map(mapRow));
      setError(null);
    }
    setLoading(false);
  }, [libraryId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchYearlyStats();
  }, [fetchYearlyStats]);

  return { yearlyStats, loading, error, refetchYearlyStats: fetchYearlyStats };
}
