import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { clearUserDataCache, syncUserDataCacheOwner } from '../lib/userDataCache';

export function useAuth() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      // Cached REST reads must not outlive the session on a shared device.
      if (event === 'SIGNED_OUT') {
        clearUserDataCache();
      } else if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && newSession?.user) {
        syncUserDataCacheOwner(newSession.user.id);
      }
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (email, password) => {
    // If we don't pass a redirect explicitly, Supabase falls back to the
    // Site URL in the Dashboard, which can be inconsistent between prod/dev
    // and send the user to a 404. window.location.origin is always correct
    // for the current environment (localhost, Netlify).
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
    if (error) throw error;
    return data;
  }, []);

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  return {
    session,
    user: session?.user ?? null,
    loading,
    signUp,
    signIn,
    signOut,
  };
}
