type LegalPageProps = {
  kind: 'support' | 'privacy' | 'terms' | 'notfound';
};

const content = {
  support: {
    title: 'Support',
    body: [
      'HELIX preview support: report issues at github.com/CupidAmorstore/helix-preview/issues.',
      '[TODO: Legal review required] Replace this section with official support commitments and response SLAs.'
    ]
  },
  privacy: {
    title: 'Privacy Policy',
    body: [
      'HELIX has no server and collects no personal data. Your paper account, alerts, watched addresses and the encrypted wallet vault stay on this device.',
      'The app talks directly to public data providers from your device (Coinbase, CoinGecko, Blockstream / mempool.space, Etherscan, Solana RPC, and GitHub Pages for research results). Like any website, they can see your IP address.',
      'On Android, app data is excluded from cloud backup and device transfer.',
      '[TODO: Legal review required] Replace this summary with a full privacy policy before launch.'
    ]
  },
  terms: {
    title: 'Terms of Service',
    body: [
      'HELIX provides live market data, paper trading with simulated money, a research-only trading bot that places no orders, and a self-custody wallet whose keys stay encrypted on your device.',
      'No real-money trading, no custody of your funds and no financial advice. In this private beta the wallet does not sign or broadcast any transaction.',
      'Simulated and backtested results are not earnings and do not predict future results.',
      '[TODO: Legal review required] Replace this summary with a full terms of service before launch.'
    ]
  },
  notfound: {
    title: 'Page Not Found',
    body: ['The page you requested does not exist in this build.']
  }
};

export default function LegalPage({ kind }: LegalPageProps) {
  const page = content[kind];
  return (
    <div className="space-y-6 fade-in">
      <header className="space-y-2">
        <p className="text-xs eyebrow text-slate-500">Legal</p>
        <h1 className="text-3xl font-semibold text-white">{page.title}</h1>
      </header>
      <div className="border-t border-ink-600 pt-5 text-sm text-slate-300 space-y-3">
        {page.body.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </div>
  );
}

