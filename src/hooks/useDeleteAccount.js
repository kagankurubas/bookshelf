import { useCallback, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// Sifreyle onaylama secildiginde signInWithPassword basarisiz olursa bu
// hatayi firlatiyoruz - boylece cagiran taraf (DeleteAccountModal) "sifre
// yanlis" mesajini genel hata mesajindan ayirt edebiliyor.
export class WrongPasswordError extends Error {}

// Hesap silme, service-role anahtari gerektiren auth.admin.deleteUser
// cagrisina ihtiyac duyar - bu yuzden client'tan direkt yapilamaz, ai-chat
// hook'undaki gibi bir Edge Function'a (delete-account) delege edilir.
export function useDeleteAccount() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);

  const deleteAccount = useCallback(async (email, { password } = {}) => {
    setIsDeleting(true);
    setError(null);
    try {
      // Kullanici sifreyle onaylamayi sectiyse, hesabi silmeden once bunu
      // gercekten dogru bildigini teyit ediyoruz.
      if (password) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw new WrongPasswordError('Incorrect password');
      }

      const { data, error: invokeError } = await supabase.functions.invoke('delete-account');
      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(data.error);

      // Edge Function auth.users satirini siler; libraries/books/notes/
      // ai_conversations/ai_messages tumu ON DELETE CASCADE ile buna bagli
      // (bkz. supabase/schema.sql) - burada ayrica silme yapmaya gerek yok.
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
