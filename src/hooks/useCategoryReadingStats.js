import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

function mapRow(row) {
  return {
    category: row.category,
    completedCount: Number(row.completed_count ?? 0),
    totalPages: Number(row.total_pages ?? 0),
  };
}

// Returns a library's completed-book breakdown by category
// (get_category_reading_stats), sorted by descending book count.
// Without year: all-time; with year: only books finished that year.
export function useCategoryReadingStats(libraryId, year = null) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCategories = useCallback(async () => {
    if (!libraryId) {
      setCategories([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: rpcError } = await supabase.rpc('get_category_reading_stats', {
      p_library_id: libraryId,
      p_year: year,
    });

    if (rpcError) {
      setError(rpcError);
    } else {
      setCategories((data || []).map(mapRow));
      setError(null);
    }
    setLoading(false);
  }, [libraryId, year]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCategories();
  }, [fetchCategories]);

  return { categories, loading, error, refetchCategories: fetchCategories };
}
