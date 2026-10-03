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

// Name of the partial unique index that allows one default library per user.
// It ships in a later migration; until then this error simply never occurs.
export const DEFAULT_LIBRARY_INDEX = 'libraries_one_default_per_user_idx';

function isSecondDefaultLibraryError(error) {
  return error?.code === '23505' && (error.message || '').includes(DEFAULT_LIBRARY_INDEX);
}

export function useLibraries(userId) {
  const [libraries, setLibraries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const readLibraries = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from('libraries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    if (fetchError) throw fetchError;
    return data.map(mapLibraryRow);
  }, [userId]);

  const fetchLibraries = useCallback(async () => {
    if (!userId) {
      setLibraries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setLibraries(await readLibraries());
      setError(null);
    } catch (fetchError) {
      setError(fetchError);
    }
    setLoading(false);
  }, [userId, readLibraries]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLibraries();
  }, [fetchLibraries]);

  const insertLibrary = useCallback(async ({ name, shelfCount, isDefault }) => {
    const { data, error: insertError } = await supabase
      .from('libraries')
      .insert({ name, shelf_count: shelfCount, is_default: isDefault, user_id: userId })
      .select()
      .single();
    if (insertError) throw insertError;
    return mapLibraryRow(data);
  }, [userId]);

  // The user's first library becomes their default (undeletable) one. If
  // another tab or device created that first library in the meantime, the
  // database refuses a second default: the list is re-read without the
  // loading state (which would unmount open dialogs), then `ifDefaultExists`
  // either returns the existing default ('useExisting') or still creates
  // this library as a regular one ('createRegular').
  const createLibrary = useCallback(async ({ name, shelfCount = 2, ifDefaultExists = 'createRegular' }) => {
    let newLibrary;
    try {
      newLibrary = await insertLibrary({ name, shelfCount, isDefault: libraries.length === 0 });
    } catch (insertError) {
      if (!isSecondDefaultLibraryError(insertError)) throw insertError;

      const current = await readLibraries();
      setLibraries(current);
      if (ifDefaultExists === 'useExisting') {
        const existingDefault = current.find((lib) => lib.isDefault);
        if (!existingDefault) throw insertError;
        return existingDefault;
      }
      newLibrary = await insertLibrary({ name, shelfCount, isDefault: false });
    }

    setLibraries((prev) => [...prev, newLibrary]);
    return newLibrary;
  }, [libraries.length, insertLibrary, readLibraries]);

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
    // The UI already hides the delete button for the default library, but
    // this also guards against the default library (and its books) being
    // deleted by accident if this function is ever called another way.
    const target = libraries.find((lib) => lib.id === id);
    if (target?.isDefault) {
      throw new Error('Ana kitaplık silinemez.');
    }
    const { error: deleteError } = await supabase.from('libraries').delete().eq('id', id);
    if (deleteError) throw deleteError;
    setLibraries((prev) => prev.filter((lib) => lib.id !== id));
  }, [libraries]);

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
