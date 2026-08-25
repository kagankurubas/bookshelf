import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

function mapRow(row) {
  return {
    year: Number(row.year),
    completedCount: Number(row.completed_count ?? 0),
    totalPages: Number(row.total_pages ?? 0),
  };
}

// Kitaplığın yıllara göre okuma trendini (get_yearly_reading_stats) döner -
// aylık grafiğin aksine tek bir yılla sınırlı değil, veri bulunan her yıl
// için bir satır (eskiden yeniye). date_finished'a göre gruplanır.
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
