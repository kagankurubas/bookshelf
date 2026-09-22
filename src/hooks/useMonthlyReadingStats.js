import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

// An empty 12-element array, index 0 = January.
const EMPTY_MONTHS = Array.from({ length: 12 }, (_, i) => ({
  month: i + 1,
  completedCount: 0,
  totalPages: 0,
}));

function mapRow(row) {
  return {
    month: Number(row.month),
    completedCount: Number(row.completed_count ?? 0),
    totalPages: Number(row.total_pages ?? 0),
  };
}

// Returns a library's month-by-month reading stats for a given year
// (get_monthly_reading_stats) - always 12 months, months with no data come
// back as 0. Based on the month a book was actually finished (date_finished).
export function useMonthlyReadingStats(libraryId, year) {
  const [months, setMonths] = useState(EMPTY_MONTHS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMonths = useCallback(async () => {
    if (!libraryId || !year) {
      setMonths(EMPTY_MONTHS);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: rpcError } = await supabase.rpc('get_monthly_reading_stats', {
      p_library_id: libraryId,
      p_year: year,
    });

    if (rpcError) {
      setError(rpcError);
    } else {
      setMonths((data || []).map(mapRow).sort((a, b) => a.month - b.month));
      setError(null);
    }
    setLoading(false);
  }, [libraryId, year]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMonths();
  }, [fetchMonths]);

  return { months, loading, error, refetchMonths: fetchMonths };
}
