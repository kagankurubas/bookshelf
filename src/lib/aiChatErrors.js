// ai-chat Edge Function (supabase/functions/ai-chat/index.ts) icin
// makine-okunabilir hata kodlari. Fonksiyon Supabase Dashboard'a manuel
// yapistirilarak deploy ediliyor (bkz. index.ts basindaki yorum) - repo
// icinden import edemiyor, bu yuzden asagidaki 'DAILY_LIMIT_REACHED' tel
// (wire) degeri index.ts'teki literal ile elle senkron tutulmali.
export const AI_CHAT_WIRE_ERRORS = {
  DAILY_LIMIT_REACHED: 'DAILY_LIMIT_REACHED',
};

export const AI_CHAT_ERROR_CODES = {
  DAILY_LIMIT: 'daily_limit',
  UNKNOWN: 'unknown',
};

// useAiChat'in catch bloguna duselen her hata (invokeError ya da
// data.error'dan uretilen Error) buradan geciyor - cagiran, ham hata
// mesajini tekrar string-sniffing yapmak yerine .code'a bakiyor.
export function parseAiChatError(err) {
  const message = err?.message ?? String(err);
  if (message === AI_CHAT_WIRE_ERRORS.DAILY_LIMIT_REACHED) {
    return { code: AI_CHAT_ERROR_CODES.DAILY_LIMIT, message };
  }
  return { code: AI_CHAT_ERROR_CODES.UNKNOWN, message };
}
