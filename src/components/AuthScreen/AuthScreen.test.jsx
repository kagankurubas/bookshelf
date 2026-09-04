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

  // Bug repro: kullanici bu ekran zaten acikken (ör. cikis yaptiktan sonra)
  // ayni sekmede eski bir dogrulama linkine tekrar tiklarsa, App yeniden
  // mount olmadan sadece redirectError prop'unu gunceller. AuthScreen bu
  // degisikligi bir lazy state kopyasi yerine dogrudan prop'tan tureterek
  // yakalamali - onceki implementasyon mount anindaki (henuz hatasiz) degeri
  // dondurdugunden mesaj hicbir zaman gorunmuyordu.
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
});
