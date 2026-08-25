import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

// Bir kitaplıkta gerçekten kitap bitirilmiş (date_finished dolu) yılların
// listesini döner (en yeniden en eskiye) - yıl seçicinin seçeneklerini
// doldurmak için kullanılır.
export function useReadingYears(libraryId) {
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchYears = useCallback(async () => {
    if (!libraryId) {
      setYears([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.rpc('get_reading_years', { p_library_id: libraryId });
    if (!error && data) {
      setYears(data.map((row) => Number(row.year)));
    }
    setLoading(false);
  }, [libraryId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchYears();
  }, [fetchYears]);

  return { years, loading, refetchYears: fetchYears };
}
