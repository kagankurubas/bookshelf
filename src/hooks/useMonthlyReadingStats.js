import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

// 12 elemanlı, index 0 = Ocak olacak şekilde boş bir dizi.
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

// Belirli bir yıl için kitaplığın ay bazlı okuma istatistiklerini
// (get_monthly_reading_stats) döner - her zaman 12 ay, veri olmayan aylar
// 0 olarak gelir. Kitabın gerçekten bitirildiği ay (date_finished) esas alınır.
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
