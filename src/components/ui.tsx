// HELIX shared UI primitives (design system v1). Dark-first, 44–56 px touch targets, numbers in mono.
import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';

export function PageHeader({ title, back, action, subtitle }: { title: string; back?: boolean; action?: ReactNode; subtitle?: ReactNode }) {
  const nav = useNavigate();
  return (
    <div className="flex items-center gap-2">
      {back && (
        <button type="button" onClick={() => nav(-1)} aria-label="Back" className="-ml-2 grid h-11 w-11 place-items-center rounded-xl text-2xl text-slate-200">
          ‹
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[26px] font-semibold leading-tight tracking-tight text-white">{title}</h1>
        {subtitle && <div className="text-xs text-slate-400">{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}

export function Panel({ title, action, children, className = '' }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`space-y-3 border-t border-ink-600 pt-4 ${className}`}>
      {(title || action) && (
        <div className="flex min-h-[28px] items-center justify-between gap-3">
          {title && <h2 className="eyebrow text-slate-400">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** Signed, arrowed change: never colour alone. */
export function Change({ pct, abs, className = '' }: { pct: number | null | undefined; abs?: number | null; className?: string }) {
  if (pct === null || pct === undefined || !Number.isFinite(pct)) return <span className={`text-slate-500 ${className}`}>—</span>;
  const up = pct >= 0;
  return (
    <span className={`font-mono tabular-nums ${up ? 'text-up' : 'text-down'} ${className}`}>
      {up ? '▲ +' : '▼ −'}
      {abs !== undefined && abs !== null ? `$${Math.abs(abs).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (` : ''}
      {Math.abs(pct).toFixed(2)}%{abs !== undefined && abs !== null ? ')' : ''}
    </span>
  );
}

export function Money({ v, className = '' }: { v: number | null | undefined; className?: string }) {
  if (v === null || v === undefined || !Number.isFinite(v)) return <span className={className}>—</span>;
  const neg = v < 0;
  return (
    <span className={`font-mono tabular-nums ${className}`}>
      {neg ? '−' : ''}$
      {v !== 0 && Math.abs(v) < 0.01
        ? Math.abs(v).toLocaleString(undefined, { maximumSignificantDigits: 4 })
        : Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: Math.abs(v) < 1 && v !== 0 ? 4 : 2 })}
    </span>
  );
}

const COIN_COLOR: Record<string, string> = {
  BTC: '#F7A440', ETH: '#8A93F5', SOL: '#4BE3B4', LINK: '#5B8DEF', XRP: '#C9D3E0', DOGE: '#E6C35C', ADA: '#5AA7F0', AVAX: '#F07C7C'
};

export function CoinBadge({ symbol, image, size = 36 }: { symbol: string; image?: string; size?: number }) {
  if (image) return <img src={image} alt="" width={size} height={size} className="shrink-0 rounded-full bg-ink-700" loading="lazy" />;
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full text-[10px] font-bold text-ink-900"
      style={{ width: size, height: size, background: COIN_COLOR[symbol] ?? '#C9D3E0' }}
      aria-hidden="true"
    >
      {symbol.slice(0, 4)}
    </span>
  );
}

export function Button({
  children, onClick, kind = 'secondary', disabled, type = 'button', className = '', ...rest
}: { children: ReactNode; onClick?: () => void; kind?: 'primary' | 'secondary' | 'danger' | 'ghost'; disabled?: boolean; type?: 'button' | 'submit'; className?: string } & Record<string, unknown>) {
  const k = {
    primary: 'bg-white text-ink-900 font-semibold',
    secondary: 'border border-ink-500 text-white font-semibold',
    danger: 'bg-down/15 text-[#F7A3A3] font-semibold',
    ghost: 'text-helix-400 font-medium'
  }[kind];
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`min-h-[48px] rounded-full px-5 text-sm transition active:scale-[0.98] disabled:opacity-40 ${k} ${className}`} {...rest}>
      {children}
    </button>
  );
}

/** Accessible bottom sheet: focus moves in, Escape and the backdrop close it. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  // Portal to <body>: page containers use transform animations, which would trap a fixed sheet
  // below the bottom navigation (the nav bar then covered the sheet's confirm buttons).
  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative mx-auto max-h-[90vh] w-full max-w-xl space-y-4 overflow-y-auto overscroll-contain rounded-t-3xl border border-ink-600 bg-ink-800 px-4 pt-3 outline-none"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)' }}
      >
        <div className="mx-auto h-1 w-10 rounded-full bg-ink-600" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {children}
      </div>
    </div>,
    document.body
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-5 border-b border-ink-600">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`-mb-px min-h-[44px] border-b-2 text-sm ${value === o.value ? 'border-white font-semibold text-white' : 'border-transparent text-slate-400'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Note({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'warn' | 'paper' }) {
  const c = { muted: 'text-slate-500', warn: 'text-amber-400', paper: 'text-paper' }[tone];
  return <p className={`text-xs ${c}`}>{children}</p>;
}
