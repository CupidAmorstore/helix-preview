// Primary destinations: shown in the phone's bottom bar and the desktop sidebar.
export type NavIcon = 'home' | 'markets' | 'bot' | 'wallet' | 'more';

export const primaryNav: { label: string; fr: string; path: string; icon: NavIcon }[] = [
  { label: 'Home', fr: 'Accueil', path: '/', icon: 'home' },
  { label: 'Markets', fr: 'Marchés', path: '/markets', icon: 'markets' },
  { label: 'Bot', fr: 'Robot', path: '/bot', icon: 'bot' },
  { label: 'Wallet', fr: 'Portefeuille', path: '/wallet', icon: 'wallet' },
  { label: 'More', fr: 'Plus', path: '/more', icon: 'more' }
];

// Secondary destinations: listed on the More page (and in the desktop sidebar).
export const secondaryNav = [
  { label: 'Paper orders', fr: 'Ordres fictifs', path: '/orders', description: 'Every simulated order, fill price, fee and refusal', descFr: 'Chaque ordre simulé, prix d’exécution, frais et refus' },
  { label: 'Watched addresses', fr: 'Adresses suivies', path: '/portfolio', description: 'Read-only balances of public addresses you follow', descFr: 'Soldes en lecture seule des adresses publiques que vous suivez' },
  { label: 'Price alerts', fr: 'Alertes de prix', path: '/alerts', description: 'In-app alert when a coin crosses a price (while HELIX is open)', descFr: 'Alerte dans l’app quand une crypto franchit un prix (si HELIX est ouvert)' },
  { label: 'Connections & vault', fr: 'Connexions et coffre', path: '/connections', description: 'Vault password, watched addresses, API settings', descFr: 'Mot de passe du coffre, adresses suivies, réglages API' },
  { label: 'Price & access', fr: 'Prix et accès', path: '/access', description: 'HELIX is free: no account, no subscription, no payment', descFr: 'HELIX est gratuit : aucun compte, aucun abonnement, aucun paiement' }
];

export const legalItems = [
  { label: 'Support', fr: 'Aide', path: '/support' },
  { label: 'Privacy', fr: 'Confidentialité', path: '/privacy' },
  { label: 'Terms', fr: 'Conditions', path: '/terms' }
];

// Paths that belong to each bottom tab (so nested pages keep their tab highlighted).
export function isActive(tabPath: string, pathname: string) {
  if (tabPath === '/') return pathname === '/';
  if (tabPath === '/more') return ['/more', '/portfolio', '/alerts', '/orders', '/connections', '/support', '/privacy', '/terms', '/access'].some((p) => pathname.startsWith(p));
  return pathname.startsWith(tabPath);
}
