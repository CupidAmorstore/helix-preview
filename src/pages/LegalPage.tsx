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

export default function LegalPage({ kind }: LegalPageProps) {
  const page = content[kind];
  return (
    <div className="mx-auto max-w-xl space-y-6 fade-in">
      <header className="space-y-2">
        <p className="text-xs eyebrow text-slate-500">{page.eyebrow}</p>
        <h1 className="text-3xl font-semibold text-white">{page.title}</h1>
        {page.updated && <p className="text-xs text-slate-500">Updated {page.updated}</p>}
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
            Report an issue
          </a>
        )}
      </div>
    </div>
  );
}
