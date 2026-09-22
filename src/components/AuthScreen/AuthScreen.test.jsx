import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AuthScreen from './AuthScreen';

function baseProps(overrides = {}) {
  return {
    onSignIn: vi.fn().mockResolvedValue(undefined),
    onSignUp: vi.fn().mockResolvedValue({ session: null }),
    redirectError: null,
    accountDeletedNotice: false,
    ...overrides,
  };
}

function renderScreen(overrides = {}) {
  const handlers = baseProps(overrides);
  render(<AuthScreen {...handlers} />);
  return handlers;
}

describe('AuthScreen', () => {
  it('shows the normal sign-in form when there is no redirect error (successful redirect / plain landing)', () => {
    renderScreen();
    expect(screen.queryByText(/doğrulama linki/i)).not.toBeInTheDocument();
  });

  it('shows an expired-link message when redirected back with an otp_expired error', () => {
    renderScreen({
      redirectError: {
        error: 'access_denied',
        errorCode: 'otp_expired',
        errorDescription: 'Email link is invalid or has expired',
      },
    });
    expect(screen.getByText('Doğrulama linkinin süresi dolmuş. Giriş yapmayı dene ya da tekrar kayıt olup yeni bir doğrulama e-postası iste.')).toBeInTheDocument();
  });

  it('shows a generic invalid-link message for other redirect error codes', () => {
    renderScreen({
      redirectError: {
        error: 'access_denied',
        errorCode: null,
        errorDescription: 'Something went wrong',
      },
    });
    expect(screen.getByText('Doğrulama linki geçersiz. Tekrar kayıt olup yeni bir doğrulama e-postası iste.')).toBeInTheDocument();
  });

  it('shows an account-deleted notice after the user deletes their account and is signed out here', () => {
    renderScreen({ accountDeletedNotice: true });
    expect(screen.getByText('Hesabın ve tüm verilerin kalıcı olarak silindi.')).toBeInTheDocument();
  });

  // Bug repro: if the user clicks an old verification link again in the same
  // tab while this screen is already open (e.g. after signing out), App
  // updates just the redirectError prop without remounting. AuthScreen must
  // pick that up by deriving directly from the prop rather than a lazy state
  // copy - the previous implementation returned the (still error-free) value
  // from mount time, so the message never appeared.
  it('shows the redirect-error message when the prop arrives AFTER the component already mounted with no error', () => {
    const props = baseProps();
    const { rerender } = render(<AuthScreen {...props} />);
    expect(screen.queryByText(/doğrulama linki/i)).not.toBeInTheDocument();

    rerender(
      <AuthScreen
        {...props}
        redirectError={{ error: 'access_denied', errorCode: 'otp_expired', errorDescription: 'expired' }}
      />
    );

    expect(screen.getByText('Doğrulama linkinin süresi dolmuş. Giriş yapmayı dene ya da tekrar kayıt olup yeni bir doğrulama e-postası iste.')).toBeInTheDocument();
  });

  // Bug repro: redirectError can stay in App's memory for this tab's entire
  // lifetime (e.g. user lands with an invalid link, then signs in and deletes
  // their account) - even if App forgets to clear it, AuthScreen ALONE must
  // not show two conflicting messages at once; the deletion notice should win.
  it('shows only the account-deleted notice, never the stale redirect-error message, when both are present', () => {
    renderScreen({
      accountDeletedNotice: true,
      redirectError: { error: 'access_denied', errorCode: 'otp_expired', errorDescription: 'expired' },
    });

    expect(screen.getByText('Hesabın ve tüm verilerin kalıcı olarak silindi.')).toBeInTheDocument();
    expect(screen.queryByText(/doğrulama linki/i)).not.toBeInTheDocument();
  });
});
