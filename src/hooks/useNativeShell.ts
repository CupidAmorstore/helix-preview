// Android shell behaviour (Capacitor). No-ops in the browser.
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

/** What the hardware back button should do, given the current screen. Pure for testing. */
export function backAction(state: { dialogOpen: boolean; pathname: string; canGoBack: boolean }): 'close-dialog' | 'back' | 'home' | 'exit' {
  if (state.dialogOpen) return 'close-dialog';
  if (state.pathname !== '/') return state.canGoBack ? 'back' : 'home';
  return 'exit';
}

/** External links: a target=_blank link does nothing in the Android WebView, so hand it to the system browser. */
export function externalHref(a: HTMLAnchorElement | null, origin: string): string | null {
  if (!a || !a.href) return null;
  try {
    const u = new URL(a.href, origin);
    if (u.protocol === 'mailto:' || u.protocol === 'tel:') return u.href;
    return (u.protocol === 'http:' || u.protocol === 'https:') && u.origin !== origin ? u.href : null;
  } catch {
    return null;
  }
}

export function useNativeShell() {
  const nav = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;
    const sub = App.addListener('backButton', ({ canGoBack }) => {
      const dialogOpen = !!document.querySelector('[role=dialog][aria-modal=true]');
      const a = backAction({ dialogOpen, pathname: window.location.pathname, canGoBack: canGoBack || window.history.length > 1 });
      if (a === 'close-dialog') window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      else if (a === 'back') nav(-1);
      else if (a === 'home') nav('/', { replace: true });
      else void App.exitApp();
    });
    const onClick = (e: MouseEvent) => {
      const url = externalHref((e.target as HTMLElement | null)?.closest?.('a') ?? null, window.location.origin);
      if (!url) return;
      e.preventDefault();
      // Capacitor opens navigations to other hosts in the system browser instead of the app WebView.
      window.location.href = url;
    };
    document.addEventListener('click', onClick, true);
    return () => {
      void sub.then((s) => s.remove());
      document.removeEventListener('click', onClick, true);
    };
  }, [nav]);

  // new screen starts at the top (WebView keeps scroll position otherwise)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
}
