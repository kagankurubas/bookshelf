import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AiChatDrawer from './AiChatDrawer';
import { supabase } from '../../lib/supabaseClient';

// jsdom scrollIntoView'i implemente etmiyor - bilesen her mesaj listesi
// degisiminde bunu cagiriyor (bkz. AiChatDrawer.jsx).
Element.prototype.scrollIntoView = vi.fn();

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(function () { return this; }),
      eq: vi.fn(function () { return this; }),
      order: vi.fn(() => Promise.resolve({ data: [], error: null })),
    })),
    functions: { invoke: vi.fn() },
  },
}));

function sendMessage(text) {
  fireEvent.change(screen.getByPlaceholderText('Bir kitap hakkında soru sor...'), { target: { value: text } });
  fireEvent.click(screen.getByRole('button', { name: 'Gönder' }));
}

describe('AiChatDrawer', () => {
  it('shows a friendly, translated notice and disables the composer once the shared daily Gemini quota is used up', async () => {
    supabase.functions.invoke.mockResolvedValueOnce({
      data: { error: 'DAILY_LIMIT_REACHED' },
      error: null,
    });

    render(<AiChatDrawer userId="user-1" onClose={vi.fn()} />);
    sendMessage('Bilim kurgu onerir misin?');

    expect(await screen.findByText('Bugünkü Kitap Asistanı kullanım hakkın doldu, yarın tekrar deneyebilirsin.')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Gönder' })).toBeDisabled());
    expect(screen.getByPlaceholderText('Bugünkü Kitap Asistanı kullanım hakkın doldu, yarın tekrar deneyebilirsin.')).toBeDisabled();
  });

  it('shows the generic error message for any other failure, not the quota notice', async () => {
    supabase.functions.invoke.mockResolvedValueOnce({
      data: { error: 'Gemini API error: 500 internal error' },
      error: null,
    });

    render(<AiChatDrawer userId="user-1" onClose={vi.fn()} />);
    sendMessage('Merhaba');

    expect(await screen.findByText('Bir şeyler ters gitti, tekrar dener misin?')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Bir kitap hakkında soru sor...')).not.toBeDisabled();
  });
});
