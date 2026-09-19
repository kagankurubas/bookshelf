import { describe, it, expect } from 'vitest';
import { parseAiChatError, AI_CHAT_ERROR_CODES } from './aiChatErrors';

describe('parseAiChatError', () => {
  it('maps the shared daily-quota wire error to a daily_limit code', () => {
    const result = parseAiChatError(new Error('DAILY_LIMIT_REACHED'));
    expect(result).toEqual({ code: AI_CHAT_ERROR_CODES.DAILY_LIMIT, message: 'DAILY_LIMIT_REACHED' });
  });

  it('maps any other error to an unknown code, preserving the original message', () => {
    const result = parseAiChatError(new Error('Gemini API error: 500 internal error'));
    expect(result).toEqual({ code: AI_CHAT_ERROR_CODES.UNKNOWN, message: 'Gemini API error: 500 internal error' });
  });
});
