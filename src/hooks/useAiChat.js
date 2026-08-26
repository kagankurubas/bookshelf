import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabaseClient';

export function useAiChat(userId) {
  const { i18n } = useTranslation();
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);

  const fetchConversations = useCallback(async () => {
    if (!userId) {
      setConversations([]);
      return;
    }
    const { data, error: fetchError } = await supabase
      .from('ai_conversations')
      .select('id, title, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (!fetchError) setConversations(data);
  }, [userId]);

  useEffect(() => {
    // Kullanici degistiginde sohbet listesini yeniden cek - standart senkronizasyon deseni.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchConversations();
  }, [fetchConversations]);

  const fetchMessages = useCallback(async (conversationId) => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    const { data, error: fetchError } = await supabase
      .from('ai_messages')
      .select('id, role, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    if (!fetchError) setMessages(data);
  }, []);

  const selectConversation = useCallback(
    (conversationId) => {
      setActiveConversationId(conversationId);
      fetchMessages(conversationId);
    },
    [fetchMessages]
  );

  const startNewConversation = useCallback(() => {
    setActiveConversationId(null);
    setMessages([]);
    setError(null);
  }, []);

  const sendMessage = useCallback(
    async (text) => {
      setIsSending(true);
      setError(null);
      setMessages((prev) => [...prev, { id: `temp-${Date.now()}`, role: 'user', content: text }]);

      try {
        const { data, error: invokeError } = await supabase.functions.invoke('ai-chat', {
          body: { conversationId: activeConversationId, message: text, language: i18n.language },
        });
        if (invokeError) throw invokeError;
        if (data?.error) throw new Error(data.error);

        if (!activeConversationId) {
          setActiveConversationId(data.conversationId);
          fetchConversations();
        }
        setMessages((prev) => [...prev, { id: `reply-${Date.now()}`, role: 'assistant', content: data.reply }]);
      } catch (err) {
        console.error(err);
        setError(err);
      } finally {
        setIsSending(false);
      }
    },
    [activeConversationId, fetchConversations, i18n.language]
  );

  return {
    conversations,
    activeConversationId,
    messages,
    isSending,
    error,
    selectConversation,
    startNewConversation,
    sendMessage,
  };
}
