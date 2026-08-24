import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

function mapLibraryRow(row) {
  return {
    id: row.id,
    name: row.name,
    shelfCount: row.shelf_count,
    isDefault: row.is_default,
  };
}

export function useLibraries() {
  const [libraries, setLibraries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLibraries = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from('libraries')
      .select('*')
      .order('created_at', { ascending: true });

    if (fetchError) {
      setError(fetchError);
    } else {
      setLibraries(data.map(mapLibraryRow));
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // Supabase'den ilk veri çekişi (mount'ta fetch) - standart veri senkronizasyon deseni.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLibraries();
  }, [fetchLibraries]);

  const createLibrary = useCallback(async ({ name, shelfCount = 2, isDefault = false }) => {
    const { data, error: insertError } = await supabase
      .from('libraries')
      .insert({ name, shelf_count: shelfCount, is_default: isDefault })
      .select()
      .single();
    if (insertError) throw insertError;

    const newLibrary = mapLibraryRow(data);
    setLibraries((prev) => [...prev, newLibrary]);
    return newLibrary;
  }, []);

  const updateLibrary = useCallback(async (id, updates) => {
    const columns = {};
    if (updates.name !== undefined) columns.name = updates.name;
    if (updates.shelfCount !== undefined) columns.shelf_count = updates.shelfCount;
    if (updates.isDefault !== undefined) columns.is_default = updates.isDefault;

    const { data, error: updateError } = await supabase
      .from('libraries')
      .update(columns)
      .eq('id', id)
      .select()
      .single();
    if (updateError) throw updateError;

    const updatedLibrary = mapLibraryRow(data);
    setLibraries((prev) => prev.map((lib) => (lib.id === id ? updatedLibrary : lib)));
    return updatedLibrary;
  }, []);

  const deleteLibrary = useCallback(async (id) => {
    const { error: deleteError } = await supabase.from('libraries').delete().eq('id', id);
    if (deleteError) throw deleteError;
    setLibraries((prev) => prev.filter((lib) => lib.id !== id));
  }, []);

  return {
    libraries,
    loading,
    error,
    createLibrary,
    updateLibrary,
    deleteLibrary,
    refetchLibraries: fetchLibraries,
  };
}
