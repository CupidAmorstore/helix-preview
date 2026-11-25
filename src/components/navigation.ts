// Primary destinations: shown in the phone's bottom bar and the desktop sidebar.
export type NavIcon = 'home' | 'markets' | 'bot' | 'wallet' | 'more';

export const primaryNav: { label: string; path: string; icon: NavIcon }[] = [
  { label: 'Home', path: '/', icon: 'home' },
  { label: 'Markets', path: '/markets', icon: 'markets' },
  { label: 'Bot', path: '/bot', icon: 'bot' },
  { label: 'Wallet', path: '/wallet', icon: 'wallet' },
  { label: 'More', path: '/more', icon: 'more' }
];

// Secondary destinations: listed on the More page (and in the desktop sidebar).
export const secondaryNav = [
  { label: 'Paper orders', path: '/orders', description: 'Every simulated order, fill price, fee and refusal' },
  { label: 'Watched addresses', path: '/portfolio', description: 'Read-only balances of public addresses you follow' },
  { label: 'Price alerts', path: '/alerts', description: 'In-app alert when a coin crosses a price (while HELIX is open)' },
  { label: 'Connections & vault', path: '/connections', description: 'Vault password, watched addresses, API settings' },
  { label: 'Price & access', path: '/access', description: 'HELIX is free: no account, no subscription, no payment' }
];

export const legalItems = [
  { label: 'Support', path: '/support' },
  { label: 'Privacy', path: '/privacy' },
  { label: 'Terms', path: '/terms' }
];

// Paths that belong to each bottom tab (so nested pages keep their tab highlighted).
export function isActive(tabPath: string, pathname: string) {
  if (tabPath === '/') return pathname === '/';
  if (tabPath === '/more') return ['/more', '/portfolio', '/alerts', '/orders', '/connections', '/support', '/privacy', '/terms', '/access'].some((p) => pathname.startsWith(p));
  return pathname.startsWith(tabPath);
}
