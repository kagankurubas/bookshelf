import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import App from './App';
import { useAuth } from './hooks/useAuth';
import { useOfflineBookQueue } from './hooks/useOfflineBookQueue';
import { supabase } from './lib/supabaseClient';

// useAuth/useOfflineBookQueue are mocked directly so each test controls
// auth/loading/online state without going through real Supabase auth
// timing or IndexedDB (both already have their own test coverage -
// useOnlineStatus.test.js, useAddOrQueueBook.test.js,
// useOfflineBookQueue.test.js). supabaseClient is still mocked because
// useReadingStats/useBooks/useLibraries import it at module load time
// regardless of which branch actually runs.
vi.mock('./hooks/useAuth');
vi.mock('./hooks/useOfflineBookQueue');
vi.mock('./lib/supabaseClient', () => ({
  supabase: {
    auth: { getSession: vi.fn(), onAuthStateChange: vi.fn(), signOut: vi.fn() },
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

// Mimics Supabase's chainable query builder (select().eq().order() etc),
// same pattern as useBooks.test.js - resolves to an empty, successful
// result regardless of which table is queried.
function emptyQueryResult() {
  const builder = {};
  const self = () => builder;
  builder.select = vi.fn(self);
  builder.eq = vi.fn(self);
  builder.order = vi.fn(self);
  builder.then = (resolve) => Promise.resolve({ data: [], error: null }).then(resolve);
  return builder;
}

// supabase.rpc(): awaited directly or via .single(), both resolving empty.
function emptyRpcResult() {
  return {
    single: () => Promise.resolve({ data: null, error: null }),
    then: (resolve) => Promise.resolve({ data: [], error: null }).then(resolve),
  };
}

function mockAuth({ user = null, loading = false } = {}) {
  useAuth.mockReturnValue({
    user,
    loading,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  });
}

function mockOnlineStatus({ isOnline = true, queuedCount = 0 } = {}) {
  useOfflineBookQueue.mockReturnValue({
    isOnline,
    queuedCount,
    addOrQueueBook: vi.fn(),
  });
}

const LOADING_TEXT = 'Yükleniyor...';
const SIGN_IN_TAB_TEXT = 'Giriş Yap';
const OFFLINE_BANNER_TEXT = 'İnternet bağlantın yok. Bazı özellikler çalışmayabilir.';

describe('App', () => {
  beforeEach(() => {
    supabase.from.mockReturnValue(emptyQueryResult());
  });

  it('shows the loading screen while auth is loading, not the auth screen or the logged-in app', () => {
    mockAuth({ loading: true });
    mockOnlineStatus({ isOnline: true });

    render(<App />);

    expect(screen.getByText(LOADING_TEXT)).toBeInTheDocument();
    expect(screen.queryAllByText(SIGN_IN_TAB_TEXT)).toHaveLength(0);
    expect(screen.queryByText(OFFLINE_BANNER_TEXT)).not.toBeInTheDocument();
  });

  it('shows the auth screen once auth has loaded and there is no user', () => {
    mockAuth({ loading: false, user: null });
    mockOnlineStatus({ isOnline: true });

    render(<App />);

    // Both the mode tab and the submit button read "Giriş Yap" in the
    // default sign-in mode.
    expect(screen.getAllByText(SIGN_IN_TAB_TEXT).length).toBeGreaterThan(0);
    expect(screen.queryByText(LOADING_TEXT)).not.toBeInTheDocument();
    expect(screen.queryByText(OFFLINE_BANNER_TEXT)).not.toBeInTheDocument();
  });

  it('shows the logged-in app once auth has loaded and a user is present', async () => {
    mockAuth({ loading: false, user: { id: 'u1', email: 'test@example.com' } });
    mockOnlineStatus({ isOnline: true });

    render(<App />);

    await waitFor(() => expect(screen.getByText('test@example.com')).toBeInTheDocument());
    expect(screen.queryAllByText(SIGN_IN_TAB_TEXT)).toHaveLength(0);
    expect(screen.queryByText(OFFLINE_BANNER_TEXT)).not.toBeInTheDocument();
  });

  it('shows the offline banner while auth is loading', () => {
    mockAuth({ loading: true });
    mockOnlineStatus({ isOnline: false });

    render(<App />);

    expect(screen.getByText(OFFLINE_BANNER_TEXT)).toBeInTheDocument();
  });

  it('shows the offline banner on top of the auth screen', () => {
    mockAuth({ loading: false, user: null });
    mockOnlineStatus({ isOnline: false });

    render(<App />);

    expect(screen.getByText(OFFLINE_BANNER_TEXT)).toBeInTheDocument();
  });

  it('shows the offline banner on top of the logged-in app', async () => {
    mockAuth({ loading: false, user: { id: 'u1', email: 'test@example.com' } });
    mockOnlineStatus({ isOnline: false });

    render(<App />);

    await waitFor(() => expect(screen.getByText('test@example.com')).toBeInTheDocument());
    expect(screen.getByText(OFFLINE_BANNER_TEXT)).toBeInTheDocument();
  });

  it('adds the queued-book count to the offline banner text when books are queued', () => {
    mockAuth({ loading: false, user: null });
    mockOnlineStatus({ isOnline: false, queuedCount: 3 });

    const { container } = render(<App />);

    expect(container.querySelector('.offline-banner').textContent).toContain(
      '3 kitap bağlantı gelince eklenecek.'
    );
  });

  it('opens the lazy-loaded Dashboard, Settings and AI chat from the logged-in app', async () => {
    supabase.rpc.mockImplementation(emptyRpcResult);
    // jsdom has no scrollIntoView; AiChatDrawer calls it on render.
    Element.prototype.scrollIntoView = vi.fn();
    mockAuth({ loading: false, user: { id: 'u1', email: 'test@example.com' } });
    mockOnlineStatus({ isOnline: true });

    render(<App />);
    await screen.findByText('test@example.com');

    fireEvent.click(screen.getByRole('button', { name: 'İstatistikler' }));
    expect(await screen.findByRole('heading', { name: 'İstatistikler' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ayarlar' }));
    expect(await screen.findByRole('heading', { name: 'Ayarlar' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Kitap Asistanı' }));
    expect(await screen.findByRole('textbox', { name: 'Bir kitap hakkında soru sor...' })).toBeInTheDocument();
  });
});
