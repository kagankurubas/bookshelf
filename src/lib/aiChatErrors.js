// Machine-readable error codes for the ai-chat Edge Function
// (supabase/functions/ai-chat/index.ts). That function is deployed by
// pasting into the Supabase Dashboard (see the comment at the top of
// index.ts) and can't import from the repo, so the wire values below must be
// kept manually in sync with the literals in index.ts.
export const AI_CHAT_WIRE_ERRORS = {
  DAILY_LIMIT_REACHED: 'DAILY_LIMIT_REACHED',
  // Gemini stayed busy (503/429) through the retries; the quota was refunded.
  AI_BUSY: 'AI_BUSY',
};

export const AI_CHAT_ERROR_CODES = {
  DAILY_LIMIT: 'daily_limit',
  BUSY: 'busy',
  UNKNOWN: 'unknown',
};

// Every error that falls into useAiChat's catch block (invokeError or an
// Error built from data.error) passes through here, so callers can check
// .code instead of string-sniffing the raw error message.
export function parseAiChatError(err) {
  const message = err?.message ?? String(err);
  if (message === AI_CHAT_WIRE_ERRORS.DAILY_LIMIT_REACHED) {
    return { code: AI_CHAT_ERROR_CODES.DAILY_LIMIT, message };
  }
  if (message === AI_CHAT_WIRE_ERRORS.AI_BUSY) {
    return { code: AI_CHAT_ERROR_CODES.BUSY, message };
  }
  return { code: AI_CHAT_ERROR_CODES.UNKNOWN, message };
}
