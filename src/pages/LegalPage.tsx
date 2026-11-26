import { useLang } from '../i18n';

type LegalPageProps = {
  kind: 'support' | 'privacy' | 'terms' | 'notfound';
};

type Section = { h?: string; p: string[] };
type Page = { title: string; eyebrow: string; sections: Section[]; updated?: string };

const ISSUES = 'https://github.com/CupidAmorstore/helix-preview/issues';
const REVIEW_NOTE = 'Plain-language summary of how this preview actually works. It has not yet been reviewed by a lawyer.';

// Every statement below describes verified behaviour of this build (audit 2026-11-25). Keep it that way.
const content: Record<LegalPageProps['kind'], Page> = {
  support: {
    title: 'Support',
    eyebrow: 'Help',
    sections: [
      { p: ['HELIX is an independent preview built by one developer. There is no company help desk, no account to recover and no phone support.'] },
      {
        h: 'Report a problem',
        p: [
          `Open an issue at ${ISSUES.replace('https://', '')}. Include your Android version, what you tapped and what you expected.`,
          'Never post your recovery phrase, vault password, private keys or API keys anywhere — no one from HELIX will ever ask for them.'
        ]
      },
      { h: 'Response', p: ['Issues are read on a best-effort basis; there is no guaranteed response time during the preview.'] },
      {
        h: 'Lost access',
        p: [
          'Paper accounts and the wallet vault live only on your device. If you forget your vault password or uninstall the app, HELIX cannot restore them. Your coins stay on the blockchain and can be recovered with your written recovery phrase in any compatible wallet.'
        ]
      }
    ]
  },
  privacy: {
    title: 'Privacy Policy',
    eyebrow: 'Legal',
    updated: '2026-11-26',
    sections: [
      { p: [REVIEW_NOTE] },
      {
        h: 'What HELIX collects',
        p: [
          'Nothing is sent to a HELIX server — there is none. No account, no analytics, no advertising identifiers, no tracking.',
          'On your device HELIX stores: your paper account and order history, price alerts, your watchlist, public addresses you choose to watch, research data, and — encrypted with your vault password — your wallet recovery phrase and any API keys you enter.'
        ]
      },
      {
        h: 'Who your device talks to',
        p: [
          'To show prices and balances, the app connects directly to public services: Coinbase, CoinGecko, Kraken and Gemini (price checks in the Research Lab), Blockstream and mempool.space (Bitcoin), Etherscan (Ethereum, only with your own key), public Ethereum and Solana network endpoints (PublicNode, Cloudflare, Solana), and GitHub (research results). Like any website, these services can see your IP address and the public data you request (for example a watched address). Their own privacy policies apply.'
        ]
      },
      {
        h: 'Backups and deletion',
        p: [
          'On Android, app data is excluded from cloud backup and device transfer. Uninstalling the app, or deleting the wallet in Wallet, erases this data from the device. You can export your paper orders as CSV from Paper orders.'
        ]
      },
      {
        h: 'Your rights and contact',
        p: [
          `Because HELIX holds no personal information about you on any server, there is nothing to access or correct remotely. Questions about privacy: ${ISSUES.replace('https://', '')}.`
        ]
      }
    ]
  },
  terms: {
    title: 'Terms of Use',
    eyebrow: 'Legal',
    updated: '2026-11-26',
    sections: [
      { p: [REVIEW_NOTE] },
      {
        h: 'What HELIX is',
        p: [
          'A free preview app with live market data, paper trading with simulated money, a research tool that tests trading strategies, and a self-custody wallet whose keys stay encrypted on your device.',
          'HELIX does not trade real money, does not hold your funds, and in this preview the wallet does not sign or send any transaction.'
        ]
      },
      {
        h: 'Not financial advice',
        p: [
          'Nothing in HELIX is a recommendation to buy or sell. Simulated and backtested results are not earnings and do not predict future results. The trading bot reports how its tests went; it does not promise any return.'
        ]
      },
      {
        h: 'Risks',
        p: [
          'Crypto prices are very volatile; you can lose all of the money you invest. Fees matter most for small amounts: a buy and a sell at a 0.60% fee costs about 1.2% of the trade.',
          'If you lose your recovery phrase, nobody — including HELIX — can recover your coins. Test networks (testnet, Sepolia, devnet) use coins with no value.'
        ]
      },
      {
        h: 'Preview software',
        p: [
          'The app is provided as is, without warranty, and may contain errors. Market data comes from third parties and can be delayed or unavailable; the app shows when it is.'
        ]
      }
    ]
  },
  notfound: {
    title: 'Page not found',
    eyebrow: 'Error',
    sections: [{ p: ['The page you requested does not exist in this build.'] }]
  }
};

const REVIEW_FR = 'Résumé en langage clair du fonctionnement réel de cette préversion. Il n’a pas encore été revu par un avocat.';
const ISSUES_FR = ISSUES.replace('https://', '');

const contentFr: Record<LegalPageProps['kind'], Page> = {
  support: {
    title: 'Aide',
    eyebrow: 'Aide',
    sections: [
      { p: ['HELIX est une préversion indépendante créée par un seul développeur. Il n’y a pas de service d’assistance d’entreprise, pas de compte à récupérer et pas de soutien téléphonique.'] },
      {
        h: 'Signaler un problème',
        p: [
          `Ouvrez un signalement à ${ISSUES_FR}. Indiquez votre version d’Android, ce que vous avez touché et ce à quoi vous vous attendiez.`,
          'Ne publiez jamais votre phrase de récupération, votre mot de passe de coffre, vos clés privées ou vos clés API — personne de HELIX ne vous les demandera.'
        ]
      },
      { h: 'Réponse', p: ['Les signalements sont lus au mieux; aucun délai de réponse n’est garanti pendant la préversion.'] },
      {
        h: 'Accès perdu',
        p: [
          'Les comptes fictifs et le coffre du portefeuille existent seulement sur votre appareil. Si vous oubliez le mot de passe du coffre ou désinstallez l’application, HELIX ne peut pas les restaurer. Vos cryptos restent sur la blockchain et peuvent être récupérées avec votre phrase de récupération écrite dans tout portefeuille compatible.'
        ]
      }
    ]
  },
  privacy: {
    title: 'Politique de confidentialité',
    eyebrow: 'Mentions légales',
    updated: '2026-11-26',
    sections: [
      { p: [REVIEW_FR] },
      {
        h: 'Ce que HELIX recueille',
        p: [
          'Rien n’est envoyé à un serveur HELIX — il n’y en a pas. Aucun compte, aucune analyse, aucun identifiant publicitaire, aucun suivi.',
          'Sur votre appareil, HELIX conserve : votre compte fictif et l’historique des ordres, les alertes de prix, votre liste de suivi, les adresses publiques que vous choisissez de suivre, les données de recherche et — chiffrées avec le mot de passe de votre coffre — votre phrase de récupération et les clés API que vous entrez.'
        ]
      },
      {
        h: 'Avec qui votre appareil communique',
        p: [
          'Pour afficher les prix et les soldes, l’application se connecte directement à des services publics : Coinbase, CoinGecko, Kraken et Gemini (vérifications de prix dans le Labo de recherche), Blockstream et mempool.space (Bitcoin), Etherscan (Ethereum, seulement avec votre propre clé), des points d’accès publics Ethereum et Solana (PublicNode, Cloudflare, Solana) et GitHub (résultats de recherche). Comme tout site Web, ces services peuvent voir votre adresse IP et les données publiques demandées (par exemple une adresse suivie). Leurs propres politiques de confidentialité s’appliquent.'
        ]
      },
      {
        h: 'Sauvegardes et suppression',
        p: [
          'Sur Android, les données de l’application sont exclues de la sauvegarde infonuagique et du transfert d’appareil. Désinstaller l’application, ou supprimer le portefeuille dans Portefeuille, efface ces données de l’appareil. Vous pouvez exporter vos ordres fictifs en CSV depuis Ordres fictifs.'
        ]
      },
      {
        h: 'Vos droits et contact',
        p: [
          `Comme HELIX ne détient aucun renseignement personnel vous concernant sur un serveur, il n’y a rien à consulter ou à corriger à distance. Questions sur la confidentialité : ${ISSUES_FR}.`
        ]
      }
    ]
  },
  terms: {
    title: 'Conditions d’utilisation',
    eyebrow: 'Mentions légales',
    updated: '2026-11-26',
    sections: [
      { p: [REVIEW_FR] },
      {
        h: 'Ce qu’est HELIX',
        p: [
          'Une préversion gratuite avec des données de marché en direct, du trading fictif avec de l’argent simulé, un outil de recherche qui teste des stratégies et un portefeuille autonome dont les clés restent chiffrées sur votre appareil.',
          'HELIX ne négocie pas d’argent réel, ne détient pas vos fonds et, dans cette préversion, le portefeuille ne signe ni n’envoie aucune transaction.'
        ]
      },
      {
        h: 'Pas un conseil financier',
        p: [
          'Rien dans HELIX n’est une recommandation d’acheter ou de vendre. Les résultats simulés et rétrospectifs ne sont pas des gains et ne prédisent pas les résultats futurs. Le robot de trading rapporte le résultat de ses tests; il ne promet aucun rendement.'
        ]
      },
      {
        h: 'Risques',
        p: [
          'Le prix des cryptos est très volatil; vous pouvez perdre tout l’argent investi. Les frais comptent surtout pour les petits montants : un achat et une vente à 0,60 % de frais coûtent environ 1,2 % de la transaction.',
          'Si vous perdez votre phrase de récupération, personne — y compris HELIX — ne peut récupérer vos cryptos. Les réseaux de test (testnet, Sepolia, devnet) utilisent des cryptos sans valeur.'
        ]
      },
      {
        h: 'Logiciel en préversion',
        p: [
          'L’application est fournie telle quelle, sans garantie, et peut contenir des erreurs. Les données de marché proviennent de tiers et peuvent être retardées ou indisponibles; l’application l’indique lorsque c’est le cas.'
        ]
      }
    ]
  },
  notfound: {
    title: 'Page introuvable',
    eyebrow: 'Erreur',
    sections: [{ p: ['La page demandée n’existe pas dans cette version.'] }]
  }
};

export default function LegalPage({ kind }: LegalPageProps) {
  const lang = useLang();
  const page = (lang === 'fr' ? contentFr : content)[kind];
  return (
    <div className="mx-auto max-w-xl space-y-6 fade-in">
      <header className="space-y-2">
        <p className="text-xs eyebrow text-slate-500">{page.eyebrow}</p>
        <h1 className="text-3xl font-semibold text-white">{page.title}</h1>
        {page.updated && <p className="text-xs text-slate-500">{lang === 'fr' ? 'Mise à jour' : 'Updated'} {page.updated}</p>}
      </header>
      <div className="space-y-5 border-t border-ink-600 pt-5 text-sm text-slate-300">
        {page.sections.map((s, i) => (
          <section key={i} className="space-y-2">
            {s.h && <h2 className="text-sm font-semibold text-white">{s.h}</h2>}
            {s.p.map((line) => (
              <p key={line} className="leading-relaxed">{line}</p>
            ))}
          </section>
        ))}
        {kind === 'support' && (
          <a className="inline-flex min-h-[48px] items-center rounded-full bg-white px-5 text-sm font-semibold text-ink-900" href={ISSUES} target="_blank" rel="noreferrer">
            {lang === 'fr' ? 'Signaler un problème' : 'Report an issue'}
          </a>
        )}
      </div>
    </div>
  );
}
