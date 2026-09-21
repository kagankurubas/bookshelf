import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const EMPTY_STATS = { completedCount: 0, totalPages: 0, averageRating: null };

function mapStatsRow(row) {
  // Postgres bigint sonuçları supabase-js'de string olarak dönebiliyor
  // (JS number hassasiyet sınırını aşmamak için) - kişisel bir kitaplık
  // için bu değerler her zaman güvenli aralıkta olacağından Number()'a
  // çevirmek sorunsuz.
  return {
    completedCount: Number(row?.completed_count ?? 0),
    totalPages: Number(row?.total_pages ?? 0),
    averageRating: row?.average_rating != null ? Number(row.average_rating) : null,
  };
}

// Bir kitaplığın okuma istatistiklerini (tamamlanan kitap sayısı, toplam
// sayfa, ortalama puan) hesaplar. Tüm kitapları çekip client'ta toplamak
// yerine tek bir Postgres fonksiyonu (get_reading_stats, bkz.
// supabase/migrations/009_dashboard_stats.sql) DB tarafında agregasyon
// yapar - kitaplık büyüdükçe ölçeklenir, tek round-trip.
// year verilmezse (undefined/null) tüm-zamanlar toplamı döner; verilirse
// sadece o yılda bitirilen (date_finished'a göre) kitaplar sayılır.
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
    // { get: true } cagriyi GET'e cevirir (fonksiyon migrations/009'da
    // 'stable' isaretli, PostgREST bunu salt-okunur RPC'ler icin GET'e
    // izin veriyor) - boylece vite.config.js'teki Supabase NetworkFirst
    // runtime-caching kurali bu istegi de yakalayip offline'da son bilinen
    // degeri dondurebiliyor (POST istekleri Workbox'in route'larina hic
    // girmiyordu, bu yuzden bu istatistik offline'da hep 0/bos donuyordu).
    // p_year null'ken query-string'e literal "null" string'i olarak
    // gitmesin diye (Postgres int parametresi bunu kabul etmez) anahtar
    // tamamen atlaniyor - fonksiyonun kendi `default null`'u devreye girer.
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
    // Kitaplık veya yıl değiştiğinde veriyi yeniden çek - standart senkronizasyon deseni.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStats();
  }, [fetchStats]);

  return { ...stats, loading, error, refetchStats: fetchStats };
}
