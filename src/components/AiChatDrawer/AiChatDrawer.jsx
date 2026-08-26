import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAiChat } from '../../hooks/useAiChat';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import './AiChatDrawer.css';

const SparkleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 3l1.8 4.9L19 9.5l-5.2 1.6L12 16l-1.8-4.9L5 9.5l5.2-1.6z" />
  </svg>
);
const SendIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
    <path d="M22 2 11 13" />
    <path d="M22 2 15 22l-4-9-9-4z" />
  </svg>
);

function AiChatDrawer({ userId, onClose }) {
  const { t } = useTranslation();
  useEscapeKey(onClose);
  const {
    conversations,
    activeConversationId,
    messages,
    isSending,
    error,
    selectConversation,
    startNewConversation,
    sendMessage,
  } = useAiChat(userId);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (text) => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;
    setInput('');
    sendMessage(trimmed);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSend(input);
  };

  const suggestions = [t('aiChat.suggestion1'), t('aiChat.suggestion2')];

  return (
    <div className="ai-chat-overlay" onClick={onClose}>
      <div className="ai-chat-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="ai-chat-header">
          <div className="ai-chat-title">
            <SparkleIcon /> {t('aiChat.title')}
          </div>
          <button type="button" className="ai-chat-close" onClick={onClose} title={t('aiChat.close')} aria-label={t('aiChat.close')}>×</button>
        </div>

        <div className="ai-chat-convo-bar">
          <select
            className="ai-chat-convo-select"
            aria-label={t('aiChat.conversationSelectLabel')}
            value={activeConversationId || ''}
            onChange={(e) => (e.target.value ? selectConversation(e.target.value) : startNewConversation())}
          >
            <option value="">{t('aiChat.newConversation')}</option>
            {conversations.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
          <button type="button" className="ai-chat-new-btn" onClick={startNewConversation}>
            + {t('aiChat.newChat')}
          </button>
        </div>

        <div className="ai-chat-messages">
          {messages.map((m) => (
            <div key={m.id} className={`ai-chat-msg-row ${m.role}`}>
              {m.role === 'assistant' && (
                <div className="ai-chat-avatar"><SparkleIcon /></div>
              )}
              <div className={`ai-chat-bubble ${m.role}`}>{m.content}</div>
            </div>
          ))}

          {messages.length === 0 && (
            <div className="ai-chat-suggestions">
              {suggestions.map((s) => (
                <button key={s} type="button" className="ai-chat-suggestion-chip" onClick={() => handleSend(s)}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {isSending && <div className="ai-chat-typing">{t('aiChat.typing')}</div>}
          {error && <p className="ai-chat-error">{t('aiChat.error')}</p>}
          <div ref={messagesEndRef} />
        </div>

        <form className="ai-chat-composer" onSubmit={handleSubmit}>
          <input
            className="ai-chat-composer-input"
            placeholder={t('aiChat.inputPlaceholder')}
            aria-label={t('aiChat.inputPlaceholder')}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" className="ai-chat-send-btn" disabled={isSending || !input.trim()} aria-label={t('aiChat.sendLabel')}>
            <SendIcon />
          </button>
        </form>
      </div>
    </div>
  );
}

export default AiChatDrawer;
