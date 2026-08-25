import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const EMPTY_STATS = { completedCount: 0, totalPages: 0, averageRating: null };

function mapStatsRow(row) {
  return {
    completedCount: row?.completed_count ?? 0,
    totalPages: row?.total_pages ?? 0,
    averageRating: row?.average_rating != null ? Number(row.average_rating) : null,
  };
}

// Bir kitaplığın okuma istatistiklerini (tamamlanan kitap sayısı, toplam
// sayfa, ortalama puan) hesaplar. Tüm kitapları çekip client'ta toplamak
// yerine tek bir Postgres fonksiyonu (get_reading_stats, bkz.
// supabase/migrations/008_page_count_and_reading_stats.sql) DB tarafında
// agregasyon yapar - kitaplık büyüdükçe ölçeklenir, tek round-trip.
export function useReadingStats(libraryId) {
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
    const { data, error: rpcError } = await supabase
      .rpc('get_reading_stats', { p_library_id: libraryId })
      .single();

    if (rpcError) {
      setError(rpcError);
    } else {
      setStats(mapStatsRow(data));
      setError(null);
    }
    setLoading(false);
  }, [libraryId]);

  useEffect(() => {
    // Kitaplık değiştiğinde veriyi yeniden çek - standart senkronizasyon deseni.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStats();
  }, [fetchStats]);

  return { ...stats, loading, error, refetchStats: fetchStats };
}
