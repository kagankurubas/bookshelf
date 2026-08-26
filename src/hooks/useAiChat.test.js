import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAiChat } from './useAiChat';
import { supabase } from '../lib/supabaseClient';

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    functions: { invoke: vi.fn() },
  },
}));

// Supabase'in zincirlenebilir (select().eq().order() gibi) sorgu builder'ini taklit eder.
function queryResult(result) {
  const builder = {};
  const self = () => builder;
  builder.select = vi.fn(self);
  builder.eq = vi.fn(self);
  builder.order = vi.fn(() => Promise.resolve(result));
  return builder;
}

describe('useAiChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not query supabase and keeps an empty conversation list when there is no authenticated user', () => {
    const { result } = renderHook(() => useAiChat(undefined));

    expect(supabase.from).not.toHaveBeenCalled();
    expect(result.current.conversations).toEqual([]);
  });

  it('fetches the conversation list for the given user', async () => {
    supabase.from.mockReturnValueOnce(
      queryResult({ data: [{ id: 'c1', title: 'Bilim kurgu onerileri' }], error: null })
    );

    const { result } = renderHook(() => useAiChat('user-1'));

    await waitFor(() => expect(result.current.conversations).toHaveLength(1));
    expect(supabase.from).toHaveBeenCalledWith('ai_conversations');
  });

  it('sends a message and appends the assistant reply on success', async () => {
    supabase.from.mockReturnValue(queryResult({ data: [], error: null }));
    supabase.functions.invoke.mockResolvedValueOnce({
      data: { conversationId: 'c1', reply: 'Sana "Dune"u onerebilirim.' },
      error: null,
    });

    const { result } = renderHook(() => useAiChat('user-1'));
    await waitFor(() => expect(result.current.conversations).toEqual([]));

    await act(async () => result.current.sendMessage('Bilim kurgu onerir misin?'));

    expect(result.current.error).toBeNull();
    expect(result.current.isSending).toBe(false);
    expect(result.current.activeConversationId).toBe('c1');
    expect(result.current.messages.map((m) => m.role)).toEqual(['user', 'assistant']);
    expect(result.current.messages[1].content).toBe('Sana "Dune"u onerebilirim.');
  });

  it('sets the error state and drops the reply when the edge function call is unauthorized', async () => {
    supabase.from.mockReturnValue(queryResult({ data: [], error: null }));
    supabase.functions.invoke.mockResolvedValueOnce({
      data: null,
      error: new Error('Unauthorized'),
    });

    const { result } = renderHook(() => useAiChat('user-1'));
    await waitFor(() => expect(result.current.conversations).toEqual([]));

    await act(async () => result.current.sendMessage('Merhaba'));

    expect(result.current.error).toBeTruthy();
    expect(result.current.isSending).toBe(false);
    // Optimistic user mesaji kalir, ama asistan yaniti eklenmez.
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].role).toBe('user');
  });

  it('sets the error state when the edge function responds 200 but with a structured API error', async () => {
    supabase.from.mockReturnValue(queryResult({ data: [], error: null }));
    supabase.functions.invoke.mockResolvedValueOnce({
      data: { error: 'Gemini API error: 500 internal error' },
      error: null,
    });

    const { result } = renderHook(() => useAiChat('user-1'));
    await waitFor(() => expect(result.current.conversations).toEqual([]));

    await act(async () => result.current.sendMessage('Merhaba'));

    expect(result.current.error).toBeTruthy();
    expect(result.current.error.message).toBe('Gemini API error: 500 internal error');
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.activeConversationId).toBeNull();
  });
});
