import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

// Returns the years a library actually has finished books in
// (date_finished set), newest first - used to populate the year picker's
// options.
export function useReadingYears(libraryId) {
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchYears = useCallback(async () => {
    if (!libraryId) {
      setYears([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: rpcError } = await supabase.rpc('get_reading_years', { p_library_id: libraryId });
    if (rpcError) {
      setError(rpcError);
    } else {
      setYears(data.map((row) => Number(row.year)));
      setError(null);
    }
    setLoading(false);
  }, [libraryId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchYears();
  }, [fetchYears]);

  return { years, loading, error, refetchYears: fetchYears };
}
