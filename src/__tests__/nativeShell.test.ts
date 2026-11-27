import { describe, expect, it } from 'vitest';
import { backAction, externalHref } from '../hooks/useNativeShell';

describe('Android back button', () => {
  it('closes an open sheet first', () => expect(backAction({ dialogOpen: true, pathname: '/markets/BTC', canGoBack: true })).toBe('close-dialog'));
  it('goes back inside the app', () => expect(backAction({ dialogOpen: false, pathname: '/markets/BTC', canGoBack: true })).toBe('back'));
  it('deep link with no history returns Home instead of exiting', () => expect(backAction({ dialogOpen: false, pathname: '/bot', canGoBack: false })).toBe('home'));
  it('exits only from Home', () => expect(backAction({ dialogOpen: false, pathname: '/', canGoBack: true })).toBe('exit'));
});

describe('external links', () => {
  const origin = 'https://localhost';
  const a = (href: string) => ({ href: new URL(href, origin).href }) as HTMLAnchorElement;
  it('hands other sites to the system browser', () => expect(externalHref(a('https://mempool.space/tx/1'), origin)).toBe('https://mempool.space/tx/1'));
  it('keeps in-app links in the app', () => expect(externalHref(a('/markets/BTC'), origin)).toBeNull());
  it('mailto goes to the system', () => expect(externalHref(a('mailto:x@example.com'), origin)).toBe('mailto:x@example.com'));
  it('ignores missing anchors', () => expect(externalHref(null, origin)).toBeNull());
});
