// Plain-language summaries of the bundled research results, shared by Home and the Bot page.
import type { BotSummary, CandidateRow } from './summary';
import type { Regime } from './watchbot';
import { getLang, tr } from '../i18n';

export function allCandidates(s: BotSummary): (CandidateRow & { scope: string; intervalMs: number })[] {
  return s.runs.flatMap((r) => {
    const iv = r.markets[0]?.intervalMs ?? 0;
    return [
      ...r.markets.flatMap((m) => m.candidates.map((c) => ({ ...c, scope: m.symbol, intervalMs: m.intervalMs }))),
      ...(r.pooled ?? []).map((c) => ({ ...c, scope: `Universe (${c.markets?.length ?? 0})`, intervalMs: iv }))
    ];
  });
}

/** Rejection reasons rewritten for people, grouped and counted (most common first). */
export function plainReasons(s: BotSummary, n = 3): { text: string; count: number }[] {
  const rules: [RegExp, string][] = [
    [/trades \d+ < \d+|out-of-sample trades/, tr('Too few test trades to trust the result', 'Trop peu de transactions de test pour se fier au résultat')],
    [/not profitable after costs/, tr('Lost money after trading fees', 'Perte après les frais de transaction')],
    [/(validation|test) net return <= 0/, tr('Lost money on data it had not seen', 'Perte sur des données jamais vues')],
    [/walk-forward unstable/, tr('Profitable in too few periods when re-tested step by step', 'Rentable sur trop peu de périodes lors du retest pas à pas')],
    [/walk-forward/, tr('Lost money when re-tested step by step', 'Perte lors du retest pas à pas')],
    [/drawdown/, tr('Losses from a peak were too deep', 'Baisse depuis un sommet trop profonde')],
    [/2x cost stress/, tr('Fails if fees are a bit higher', 'Échoue si les frais sont un peu plus élevés')],
    [/delay stress/, tr('Fails if orders fill a little late', 'Échoue si les ordres s’exécutent un peu en retard')],
    [/neighbours unstable/, tr('Only works with one exact setting', 'Ne fonctionne qu’avec un seul réglage précis')],
    [/bootstrap/, tr('Result could be luck', 'Le résultat pourrait être dû au hasard')],
    [/profit factor/, tr('Losing trades outweigh winners', 'Les pertes l’emportent sur les gains')]
  ];
  const counts = new Map<string, number>();
  for (const c of allCandidates(s)) {
    const seen = new Set<string>();
    for (const r of c.rejectionReasons) {
      const hit = rules.find(([re]) => re.test(r));
      const text = hit ? hit[1] : r;
      if (seen.has(text)) continue;
      seen.add(text);
      counts.set(text, (counts.get(text) ?? 0) + 1);
    }
  }
  return [...counts.entries()].map(([text, count]) => ({ text, count })).sort((a, b) => b.count - a.count).slice(0, n);
}

export function botHeadline(s: BotSummary) {
  const c = allCandidates(s);
  const qualified = c.filter((x) => x.status === 'qualified_paper_strategy').length;
  const reachedTest = c.filter((x) => x.test).length;
  return { tested: c.length, qualified, reachedTest, holdingCash: qualified === 0 };
}

export function dailyRegimes(s: BotSummary): { base: string; regime: Regime }[] {
  return s.runs
    .flatMap((r) => r.markets)
    .filter((m) => m.intervalMs === 86_400_000 && m.regime)
    .map((m) => ({ base: m.base, regime: m.regime as Regime }));
}

export function snapshotAgeHours(s: BotSummary, now = Date.now()) {
  return Math.max(0, (now - new Date(s.generatedAt).getTime()) / 3_600_000);
}

/** Run ids look like run-2026-11-24T19-36-41-194Z-1d; returns the timestamp in ms (NaN if not parseable). */
export function runIdTime(runId: string): number {
  const m = runId.match(/run-(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z/);
  return m ? Date.parse(`${m[1]}T${m[2]}:${m[3]}:${m[4]}.${m[5]}Z`) : NaN;
}

/** When strategies were last tested (NOT when prices/paper accounts were last refreshed). */
export function researchRunAt(s: BotSummary): number {
  if (s.lastResearchRunAt && Number.isFinite(Date.parse(s.lastResearchRunAt))) return Date.parse(s.lastResearchRunAt);
  const t = s.runs.map((r) => runIdTime(r.runId)).filter(Number.isFinite);
  return t.length ? Math.max(...t) : new Date(s.generatedAt).getTime();
}

export function researchAgeHours(s: BotSummary, now = Date.now()) {
  return Math.max(0, (now - researchRunAt(s)) / 3_600_000);
}

/** English plural, or French when the app is in French and French forms are given (French: 0 and 1 are singular). */
export const plural = (n: number, one: string, many = `${one}s`, frOne?: string, frMany?: string) => {
  if (getLang() === 'fr' && frOne) return `${n.toLocaleString('fr-CA')} ${n <= 1 ? frOne : frMany ?? `${frOne}s`}`;
  return `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;
};

const PARAM_WORDS: Record<string, string> = {
  fast: 'fast', slow: 'slow', entry: 'entry', exit: 'exit', lookback: 'look-back', threshold: 'threshold', filter: 'trend filter',
  n: 'window', k: 'band width', maxHold: 'max hold', lo: 'buy below', hi: 'sell above', pct: 'quietest', trend: 'trend', vol: 'volatility',
  er: 'efficiency window', erTrend: 'trend threshold', period: 'every'
};
const PARAM_WORDS_FR: Record<string, string> = {
  fast: 'rapide', slow: 'lente', entry: 'entrée', exit: 'sortie', lookback: 'période', threshold: 'seuil', filter: 'filtre de tendance',
  n: 'fenêtre', k: 'largeur de bande', maxHold: 'détention max.', lo: 'achat sous', hi: 'vente au-dessus de', pct: 'plus calme', trend: 'tendance', vol: 'volatilité',
  er: 'fenêtre d’efficacité', erTrend: 'seuil de tendance', period: 'tous les'
};
/** 'sma_cross(fast=10,slow=100)' → { name: 'Trend following (moving averages)', params: 'fast 10 · slow 100' } */
export function plainSpec(key: string): { name: string; params: string } {
  const m = key.replace(/^POOLED:/, '').match(/^(\w+)\((.*)\)$/);
  if (!m) return { name: key, params: '' };
  const info = STRATEGIES.find((x) => x.family === m[1]);
  const params = m[2].split(',').filter(Boolean).map((kv) => {
    const [k, v] = kv.split('=');
    const fr = getLang() === 'fr';
    if (k === 'period') return fr ? `tous les ${v} jours` : `every ${v} days`;
    return `${(fr ? PARAM_WORDS_FR[k] : PARAM_WORDS[k]) ?? k} ${v}`;
  }).join(' · ');
  return { name: info ? stratName(info) : m[1].replace(/_/g, ' '), params };
}

/** 'BTC-USD|86400000|sma_cross(fast=10,slow=100)' → 'BTC daily · Trend following (moving averages)' */
export function plainAccountLabel(id: string): { title: string; params: string } {
  const [sym, iv, key] = id.split('|');
  const ps = plainSpec(key ?? '');
  return { title: `${(sym ?? '').replace('-USD', '')} ${Number(iv) === 86_400_000 ? tr('daily', 'quotidien') : tr('hourly', 'horaire')} · ${ps.name}`, params: ps.params };
}

// ---------------------------------------------------------------- strategy catalogue (plain language)
export type StrategyInfo = { family: string; name: string; objective: string; risk: 'Medium' | 'Medium-high' | 'High'; style: string };

// French catalogue, keyed by family (English stays the source of truth; tests and research keys use it).
const STRATEGIES_FR: Record<string, { name: string; objective: string; style: string }> = {
  sma_cross: { name: 'Suivi de tendance (moyennes mobiles)', objective: 'Garder une cryptomonnaie tant que sa moyenne courte est au-dessus de sa moyenne longue.', style: 'Tendance' },
  trend_filtered_momentum: { name: 'Momentum avec filtre de tendance', objective: 'Acheter la force récente, seulement quand la tendance longue est haussière.', style: 'Tendance' },
  ts_momentum: { name: 'Momentum', objective: 'Garder une cryptomonnaie après une hausse sur une période récente.', style: 'Tendance' },
  donchian_breakout: { name: 'Cassure', objective: 'Acheter quand le prix sort par le haut de sa fourchette récente; vendre quand il sort par le bas.', style: 'Tendance' },
  vol_compression_breakout: { name: 'Cassure après une période calme', objective: 'Acheter une cassure qui suit une période inhabituellement calme.', style: 'Volatilité' },
  bollinger_reversion: { name: 'Achat sur repli (bandes de Bollinger)', objective: 'Acheter après une baisse inhabituellement forte et vendre au retour à la moyenne.', style: 'Retour à la moyenne' },
  rsi_reversion: { name: 'Rebond de survente (RSI)', objective: 'Acheter quand le RSI indique une survente; vendre au rétablissement.', style: 'Retour à la moyenne' },
  vol_filtered_trend: { name: 'Tendance en marché calme', objective: 'Suivre la tendance seulement quand la volatilité est sous son niveau habituel; rester en liquidités en marché agité.', style: 'Tendance avec gestion du risque' },
  xs_momentum: { name: 'Rotation des plus fortes', objective: 'Chaque semaine, garder les 1 à 3 cryptomonnaies qui ont le plus monté récemment; liquidités si aucune n’a monté.', style: 'Momentum relatif' },
  regime_switch: { name: 'Changement de régime', objective: 'Suivre la tendance quand le marché est directionnel et acheter les replis quand il évolue latéralement.', style: 'Hybride' },
  weekly_trend: { name: 'Tendance hebdomadaire', objective: 'Une fois par semaine, garder une cryptomonnaie seulement si elle est au-dessus de sa moyenne longue; sinon liquidités. Peu de transactions, donc les frais pèsent moins.', style: 'Tendance sur plusieurs semaines' },
  monthly_momentum: { name: 'Momentum sur 4 semaines', objective: 'Tous les 28 jours (cycle fixe, pas les mois civils), garder une cryptomonnaie seulement si elle a monté sur les 3 à 6 derniers mois.', style: 'Momentum sur plusieurs mois' }
};
const RISK_FR: Record<StrategyInfo['risk'], string> = { Medium: 'moyen', 'Medium-high': 'moyen à élevé', High: 'élevé' };
const fr = (info: StrategyInfo) => (getLang() === 'fr' ? STRATEGIES_FR[info.family] : undefined);
export const stratName = (info: StrategyInfo) => fr(info)?.name ?? info.name;
export const stratObjective = (info: StrategyInfo) => fr(info)?.objective ?? info.objective;
export const stratStyle = (info: StrategyInfo) => fr(info)?.style ?? info.style;
/** 'Medium risk' / 'risque moyen' */
export const stratRisk = (info: StrategyInfo) => (getLang() === 'fr' ? `risque ${RISK_FR[info.risk]}` : `${info.risk} risk`);
/** Data labels are written in English by the research script; swap a known strategy name for its French name. */
export function localizeLabel(label: string): string {
  if (getLang() !== 'fr') return label;
  let out = label;
  for (const s of STRATEGIES) if (out.includes(s.name)) out = out.replace(s.name, STRATEGIES_FR[s.family].name);
  return out.replace(/(\d+) coins/g, '$1 cryptomonnaies').replace(/checked weekly/g, 'vérifiée chaque semaine').replace(/(\d+)-day average/g, 'moyenne sur $1 jours').replace(/(\d+)-day look-back/g, 'période de $1 jours').replace(/top (\d+)/g, '$1 meilleures').replace(/rebalanced weekly/g, 'rééquilibrée chaque semaine');
}

export const STRATEGIES: StrategyInfo[] = [
  { family: 'sma_cross', name: 'Trend following (moving averages)', objective: 'Hold a coin while its short-term average is above its long-term average.', risk: 'Medium', style: 'Trend' },
  { family: 'trend_filtered_momentum', name: 'Momentum with trend filter', objective: 'Buy recent strength, but only when the long-term trend is up.', risk: 'Medium', style: 'Trend' },
  { family: 'ts_momentum', name: 'Momentum', objective: 'Hold a coin after it has risen over a recent period.', risk: 'Medium-high', style: 'Trend' },
  { family: 'donchian_breakout', name: 'Breakout', objective: 'Buy when price breaks above its recent range; exit when it breaks below.', risk: 'Medium-high', style: 'Trend' },
  { family: 'vol_compression_breakout', name: 'Calm-before-the-move breakout', objective: 'Buy a breakout that follows an unusually quiet period.', risk: 'Medium-high', style: 'Volatility' },
  { family: 'bollinger_reversion', name: 'Buy the dip (Bollinger bands)', objective: 'Buy after an unusually sharp drop and sell when price returns to average.', risk: 'High', style: 'Mean reversion' },
  { family: 'rsi_reversion', name: 'Oversold bounce (RSI)', objective: 'Buy when the RSI says a coin is oversold; sell when it recovers.', risk: 'High', style: 'Mean reversion' },
  { family: 'vol_filtered_trend', name: 'Calm-market trend', objective: 'Follow the trend only while volatility is below its usual level; stay in cash in turbulent markets.', risk: 'Medium', style: 'Risk-managed trend' },
  { family: 'xs_momentum', name: 'Strongest coins rotation', objective: 'Each week hold the 1–3 coins that rose most over recent weeks; hold cash if none rose.', risk: 'Medium-high', style: 'Cross-sectional momentum' },
  { family: 'regime_switch', name: 'Regime switcher', objective: 'Use trend following when the market trends and dip-buying when it moves sideways.', risk: 'Medium-high', style: 'Hybrid' },
  { family: 'weekly_trend', name: 'Weekly trend check', objective: 'Once a week, hold a coin only if it is above its long-term average; otherwise cash. Few trades, so fees matter less.', risk: 'Medium', style: 'Multi-week trend' },
  { family: 'monthly_momentum', name: '4-week momentum', objective: 'Every 28 days (a fixed cycle, not calendar months), hold a coin only if it rose over the past 3–6 months.', risk: 'Medium-high', style: 'Multi-month momentum' }
];

export type StrategyEvidence = {
  info: StrategyInfo;
  tested: number;
  reachedTest: number;
  qualified: number;
  /** one rule across all coins on daily bars: the most robust single summary */
  pooledDaily?: { trainNet: number; valNet: number; valTrades: number; testNet?: number; testTrades?: number; reasons: string[] };
  reasons: { text: string; count: number }[];
};

export function strategyEvidence(s: BotSummary): StrategyEvidence[] {
  const all = allCandidates(s);
  return STRATEGIES.map((info) => {
    const mine = all.filter((c) => c.family === info.family);
    const pooled = mine.find((c) => c.key.startsWith('POOLED:') && c.intervalMs === 86_400_000);
    const sub: BotSummary = { ...s, runs: s.runs.map((r) => ({ ...r, markets: r.markets.map((m) => ({ ...m, candidates: m.candidates.filter((c) => c.family === info.family) })), pooled: (r.pooled ?? []).filter((c) => c.family === info.family) })) };
    return {
      info,
      tested: mine.length,
      reachedTest: mine.filter((c) => c.test).length,
      qualified: mine.filter((c) => c.status === 'qualified_paper_strategy').length,
      pooledDaily: pooled && pooled.validation
        ? { trainNet: pooled.train.netReturn, valNet: pooled.validation.netReturn, valTrades: pooled.validation.trades, testNet: pooled.test?.netReturn, testTrades: pooled.test?.trades, reasons: pooled.rejectionReasons }
        : undefined,
      reasons: plainReasons(sub, 3)
    };
  });
}
