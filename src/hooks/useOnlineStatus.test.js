import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOnlineStatus } from './useOnlineStatus';

function setNavigatorOnline(value) {
  Object.defineProperty(window.navigator, 'onLine', { value, configurable: true });
}

afterEach(() => {
  setNavigatorOnline(true);
});

describe('useOnlineStatus', () => {
  it('reflects navigator.onLine at mount', () => {
    setNavigatorOnline(false);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(false);
  });

  it('updates on online/offline events even without an onOnline callback (regression)', () => {
    setNavigatorOnline(true);
    const { result } = renderHook(() => useOnlineStatus());

    act(() => window.dispatchEvent(new Event('offline')));
    expect(result.current).toBe(false);

    act(() => window.dispatchEvent(new Event('online')));
    expect(result.current).toBe(true);
  });

  it('does not call onOnline at mount when already online (no transition happened)', () => {
    setNavigatorOnline(true);
    const onOnline = vi.fn();
    renderHook(() => useOnlineStatus(onOnline));

    expect(onOnline).not.toHaveBeenCalled();
  });

  it('calls onOnline exactly once on an offline->online transition', () => {
    setNavigatorOnline(false);
    const onOnline = vi.fn();
    const { result } = renderHook(() => useOnlineStatus(onOnline));
    expect(result.current).toBe(false);

    act(() => window.dispatchEvent(new Event('online')));

    expect(result.current).toBe(true);
    expect(onOnline).toHaveBeenCalledTimes(1);
  });

  it('does not call onOnline again on subsequent offline events (only on the online transition)', () => {
    setNavigatorOnline(false);
    const onOnline = vi.fn();
    renderHook(() => useOnlineStatus(onOnline));

    act(() => window.dispatchEvent(new Event('offline')));

    expect(onOnline).not.toHaveBeenCalled();
  });

  // Stale-closure regression test: App.jsx passes a new onOnline closure
  // (capturing that render's current state/library) on every render. Since
  // the hook registers the event listener once at mount, it must call the
  // LATEST callback via a ref - not the first (stale) one registered at
  // mount.
  it('always invokes the latest onOnline passed on the most recent render, not a stale one from mount', () => {
    setNavigatorOnline(false);
    const firstOnOnline = vi.fn();
    const secondOnOnline = vi.fn();

    const { rerender } = renderHook(({ onOnline }) => useOnlineStatus(onOnline), {
      initialProps: { onOnline: firstOnOnline },
    });

    rerender({ onOnline: secondOnOnline });

    act(() => window.dispatchEvent(new Event('online')));

    expect(firstOnOnline).not.toHaveBeenCalled();
    expect(secondOnOnline).toHaveBeenCalledTimes(1);
  });
});
