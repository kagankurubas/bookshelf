import { useCallback, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// Thrown when signInWithPassword fails during password confirmation, so the
// caller (DeleteAccountModal) can distinguish a "wrong password" message
// from the generic error message.
export class WrongPasswordError extends Error {}

// Account deletion needs auth.admin.deleteUser, which requires the
// service-role key - it can't be done directly from the client, so it's
// delegated to an Edge Function (delete-account), same as the ai-chat hook.
export function useDeleteAccount() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);

  const deleteAccount = useCallback(async (email, { password } = {}) => {
    setIsDeleting(true);
    setError(null);
    try {
      // If the user chose to confirm with a password, verify they actually
      // know it before deleting the account.
      if (password) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw new WrongPasswordError('Incorrect password');
      }

      const { data, error: invokeError } = await supabase.functions.invoke('delete-account');
      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(data.error);

      // The Edge Function deletes the auth.users row; libraries/books/notes/
      // ai_conversations/ai_messages are all tied to it via ON DELETE
      // CASCADE (see supabase/schema.sql) - no extra deletion needed here.
      await supabase.auth.signOut();
      return data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setIsDeleting(false);
    }
  }, []);

  return { deleteAccount, isDeleting, error };
}
