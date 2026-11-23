// Primary destinations: shown in the phone's bottom bar and the desktop sidebar.
export type NavIcon = 'markets' | 'bot' | 'portfolio' | 'wallet' | 'more';

export const primaryNav: { label: string; path: string; icon: NavIcon }[] = [
  { label: 'Markets', path: '/', icon: 'markets' },
  { label: 'Bot', path: '/bot', icon: 'bot' },
  { label: 'Portfolio', path: '/portfolio', icon: 'portfolio' },
  { label: 'Wallet', path: '/wallet', icon: 'wallet' },
  { label: 'More', path: '/more', icon: 'more' }
];

// Secondary destinations: listed on the More page (and in the desktop sidebar).
export const secondaryNav = [
  { label: 'Price alerts', path: '/alerts', description: 'Get told when a coin crosses a price' },
  { label: 'Connections & vault', path: '/connections', description: 'Vault password, watched addresses, API settings' }
];

export const legalItems = [
  { label: 'Support', path: '/support' },
  { label: 'Privacy', path: '/privacy' },
  { label: 'Terms', path: '/terms' }
];

// Paths that belong to each bottom tab (so nested pages keep their tab highlighted).
export function isActive(tabPath: string, pathname: string) {
  if (tabPath === '/') return pathname === '/';
  if (tabPath === '/more') return ['/more', '/alerts', '/connections', '/support', '/privacy', '/terms', '/access'].some((p) => pathname.startsWith(p));
  return pathname.startsWith(tabPath);
}
