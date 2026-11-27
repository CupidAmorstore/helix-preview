import { Link } from 'react-router-dom';
import { PageHeader } from '../components/ui';

/** There is no paid plan and no payment flow; this page says so instead of offering a checkout that cannot work. */
export default function AccessPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader title="Access" back />
      <section className="space-y-3 border-t border-ink-600 pt-5">
        <p className="text-[15px] leading-relaxed text-slate-300">
          This HELIX preview is free. There is no subscription, no payment and no account to create. Paper trading, markets and the research results are
          available to everyone who opens the app.
        </p>
        <p className="text-sm text-slate-400">
          If paid features are ever offered, they will appear here only once a working, tested payment provider is connected.
        </p>
      </section>
      <section className="space-y-2 border-t border-ink-600 pt-5">
        <h2 className="eyebrow text-slate-400">Questions or problems</h2>
        <a className="inline-flex min-h-[44px] items-center text-sm text-helix-400 underline underline-offset-4" href="https://github.com/CupidAmorstore/helix-preview/issues" target="_blank" rel="noreferrer">
          Report an issue on GitHub
        </a>
        <p className="text-xs text-slate-500">
          See also <Link className="underline" to="/terms">Terms</Link> and <Link className="underline" to="/privacy">Privacy</Link>.
        </p>
      </section>
    </div>
  );
}
