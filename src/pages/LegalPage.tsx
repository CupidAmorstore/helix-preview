type LegalPageProps = {
  kind: 'support' | 'privacy' | 'terms' | 'notfound';
};

const content = {
  support: {
    title: 'Support',
    body: [
      'HELIX (Apex App) preview support is available via support@helix.app.',
      '[TODO: Legal review required] Replace this section with official support commitments and response SLAs.'
    ]
  },
  privacy: {
    title: 'Privacy Policy',
    body: [
      'HELIX (Apex App) does not collect private keys, seed phrases, or financial data on any server.',
      'This preview build stores settings locally in your browser (IndexedDB).',
      '[TODO: Legal review required] Replace this summary with a full privacy policy before launch.'
    ]
  },
  terms: {
    title: 'Terms of Service',
    body: [
      'HELIX (Apex App) provides market intelligence and read-only portfolio tracking only.',
      'No custody, no trading, and no financial advice is provided.',
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
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Legal</p>
        <h1 className="text-3xl font-semibold text-white">{page.title}</h1>
      </header>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300 space-y-3">
        {page.body.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </div>
  );
}

