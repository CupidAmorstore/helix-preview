import { useEffect, useState } from 'react';

export default function AccessPage() {
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [status, setStatus] = useState('Checking Stripe status...');
  const [email, setEmail] = useState('');
  const [plan, setPlan] = useState<'monthly' | 'annual'>('monthly');

  useEffect(() => {
    fetch('/api/stripe-status')
      .then((res) => (res.ok ? res.json() : { enabled: false }))
      .then((data) => {
        setStripeEnabled(Boolean(data.enabled));
        setStatus(data.enabled ? 'Stripe checkout available.' : 'Stripe not configured. Manual access only.');
      })
      .catch(() => setStatus('Stripe status unavailable. Manual access only.'));
  }, []);

  const startCheckout = async () => {
    setStatus('Launching Stripe checkout...');
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, email })
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.message || 'Checkout unavailable');
      window.location.href = data.url;
    } catch (err: any) {
      setStatus(err.message || 'Checkout failed. Manual access only.');
    }
  };

  return (
    <div className="space-y-8 slide-up">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Access</p>
        <h1 className="text-3xl font-semibold text-white">Request Research Access</h1>
        <p className="text-sm text-slate-400">
          HELIX access is manually reviewed. If Stripe is configured, you can start checkout, otherwise request access by email.
        </p>
      </header>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
        <div className="text-sm text-slate-300">{status}</div>
        <div className="grid gap-3 md:grid-cols-3">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm text-slate-200"
          />
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value as 'monthly' | 'annual')}
            className="rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm text-slate-200"
          >
            <option value="monthly" className="text-black">Monthly</option>
            <option value="annual" className="text-black">Annual</option>
          </select>
          <button
            type="button"
            onClick={startCheckout}
            disabled={!stripeEnabled}
            className={`rounded-lg border px-4 py-2 text-sm ${stripeEnabled ? 'border-mint-500/50 text-mint-300' : 'border-white/10 text-slate-500'}`}
          >
            Proceed to Stripe
          </button>
        </div>
        <div className="text-xs text-slate-500">
          If Stripe is disabled, email <a className="text-mint-300" href="mailto:support@helix.app">support@helix.app</a> to request access.
        </div>
      </section>
    </div>
  );
}

