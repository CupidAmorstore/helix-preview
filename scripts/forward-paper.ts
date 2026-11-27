// Forward paper-trading runner (PAPER ONLY). Evaluates every research/forward/registration*.json; a registration does
// nothing unless the owner set status 'active' with a startAt.
//   npx vite-node --config scripts/vite.node.config.ts scripts/forward-paper.ts            # evaluate (stored data)
//   npx vite-node --config scripts/vite.node.config.ts scripts/forward-paper.ts --refresh  # fetch new public daily bars first
//   npx vite-node --config scripts/vite.node.config.ts scripts/forward-paper.ts --hash     # print rules hashes
//
// P0 persistence (research/forward/ledger-<id>.json):
//   * append-only: each run recomputes deterministically from the registration start and REQUIRES the stored fills to
//     be a prefix of the recomputed fills. A mismatch (exchange revised history, code change) is reported as a
//     problem and the stored ledger is NOT overwritten — no silent rewriting of forward evidence.
//   * a lock file prevents two concurrent runs from interleaving writes; a stale lock (> 30 min) is taken over.
//   * the report always states the data's last completed bar; stale/gapped data refuses evaluation (fail closed).
import { existsSync, readFileSync, readdirSync, writeFileSync, unlinkSync, statSync } from 'node:fs';
import { gunzipSync, gzipSync } from 'node:zlib';
import { evaluateForward, registrationHash, type ForwardRegistration } from '../src/bot/forward';
import { COST_PRESETS } from '../src/bot/costs';
import type { Candle } from '../src/bot/types';
import { barsAgree } from '../src/bot/candles';

const DIR = 'research/forward';
const DAY = 86_400_000;
const regs = readdirSync(DIR).filter((f) => /^registration.*\.json$/.test(f)).sort().map((f) => ({ f, reg: JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8')) as ForwardRegistration }));
if (process.argv.includes('--hash')) { for (const r of regs) console.log(r.f, registrationHash(r.reg)); process.exit(0); }

const lock = `${DIR}/.lock`;
if (existsSync(lock) && Date.now() - statSync(lock).mtimeMs < 30 * 60_000) { console.error('another forward run holds the lock'); process.exit(2); }
writeFileSync(lock, String(process.pid));
const release = () => { try { unlinkSync(lock); } catch { /* already gone */ } };
process.on('exit', release);

const file = (sym: string, iv: number) => `research/data/coinbase_${sym}_${iv === DAY ? '1d' : '1h'}.csv.gz`;
const parse = (p: string): Candle[] => (existsSync(p) ? gunzipSync(readFileSync(p)).toString().trim().split('\n').slice(1).map((l) => { const [t, o, h, lo, c, v] = l.split(',').map(Number); return { t, o, h, l: lo, c, v }; }) : []);

/** Append newly COMPLETED daily bars from the public Coinbase candles endpoint; never rewrites stored bars. */
async function refresh(sym: string, nowMs: number): Promise<string> {
  const p = file(sym, DAY);
  const have = parse(p);
  const lastT = have.length ? have[have.length - 1].t : 0;
  const res = await fetch(`https://api.exchange.coinbase.com/products/${sym}/candles?granularity=86400`);
  if (!res.ok) return `${sym}: refresh failed HTTP ${res.status}`;
  const rows = (await res.json()) as number[][];
  const fresh = rows.map(([t, l, h, o, c, v]) => ({ t: t * 1000, o, h, l, c, v })).filter((k) => k.t > lastT && k.t + DAY <= nowMs).sort((a, b) => a.t - b.t);
  // a stored bar that the venue now reports differently is a revision: report it, keep the stored value
  const byT = new Map(rows.map(([t, , , , c]) => [t * 1000, c]));
  const revBps = have.slice(-30).filter((k) => byT.has(k.t)).map((k) => ({ day: new Date(k.t).toISOString().slice(0, 10), bps: (byT.get(k.t)! / k.c - 1) * 1e4 })).filter((x) => Math.abs(x.bps) > 0.01);
  const revised = revBps.length;
  if (revised) writeFileSync(`${DIR}/revisions.jsonl`, (existsSync(`${DIR}/revisions.jsonl`) ? readFileSync(`${DIR}/revisions.jsonl`, 'utf8') : '') + JSON.stringify({ checkedAt: new Date(nowMs).toISOString(), symbol: sym, revisions: revBps.map((x) => ({ ...x, bps: +x.bps.toFixed(3) })) }) + '\n');
  // P0 D-10: the unranged endpoint has returned inconsistent rows (2026-11-27: BTC 2026-11-13 close off by -604 bps vs
  // the ranged endpoint and the stored bar). A new bar is appended only if an independent RANGED query agrees within
  // tolerance (`barsAgree`); any disagreement stops the append at that bar (no gaps are created, nothing is guessed).
  const accepted: Candle[] = [];
  let rejectedNote = '';
  if (fresh.length) {
    const q = `start=${new Date(fresh[0].t).toISOString()}&end=${new Date(fresh[fresh.length - 1].t).toISOString()}`;
    const r2 = await fetch(`https://api.exchange.coinbase.com/products/${sym}/candles?granularity=86400&${q}`);
    const confirm = r2.ok ? new Map(((await r2.json()) as number[][]).map(([t, l, h, o, c]) => [t * 1000, [o, h, l, c]])) : new Map<number, number[]>();
    for (const k of fresh) {
      const c2 = confirm.get(k.t);
      if (!c2 || !barsAgree(k, { o: c2[0], h: c2[1], l: c2[2], c: c2[3] })) { rejectedNote = `; bar ${new Date(k.t).toISOString().slice(0, 10)} NOT appended (ranged re-query disagrees${r2.ok ? '' : `: HTTP ${r2.status}`})`; break; }
      accepted.push(k);
    }
  }
  if (accepted.length) writeFileSync(p, gzipSync('t,o,h,l,c,v\n' + [...have, ...accepted].map((k) => [k.t, k.o, k.h, k.l, k.c, k.v].join(',')).join('\n') + '\n'));
  return `${sym}: +${accepted.length} bars${rejectedNote}${revised ? `, ${revised} recent stored bars differ from venue (max ${Math.max(...revBps.map((x) => Math.abs(x.bps))).toFixed(1)} bps; kept stored, logged)` : ''}`;
}

const now = Date.now();
if (process.argv.includes('--refresh')) {
  const syms = [...new Set(regs.flatMap((r) => r.reg.rules.flatMap((x) => x.markets)))];
  for (const s of syms) console.log(await refresh(s, now).catch((e) => `${s}: refresh error ${String(e)}`));
}

for (const { reg } of regs) {
  const cost = COST_PRESETS[reg.costPreset];
  if (!cost) { console.log(reg.id, `unknown cost preset ${reg.costPreset}`); continue; }
  const data: Record<string, Candle[]> = {};
  for (const r of reg.rules) for (const m of r.markets) data[m] ??= parse(file(m, r.intervalMs));
  const rep = evaluateForward(reg, data, cost, now);
  const ledgerFile = `${DIR}/ledger-${reg.id}.json`;
  const stored = existsSync(ledgerFile) ? JSON.parse(readFileSync(ledgerFile, 'utf8')) : { registrationId: reg.id, rules: {} as Record<string, Record<string, unknown[]>> };
  let revision = false;
  for (const r of rep.results) for (const m of r.ledger ?? []) {
    const fills = m.events.filter((e) => e.kind === 'fill' || e.kind === 'rejected' || e.kind === 'failed');
    const prev = (stored.rules[r.ruleId]?.[m.market] ?? []) as unknown[];
    if (JSON.stringify(fills.slice(0, prev.length)) !== JSON.stringify(prev)) { revision = true; rep.problems.push(`${r.ruleId}/${m.market}: recomputed history differs from the stored ledger (data revision or code change) — stored ledger kept, investigate`); continue; }
    (stored.rules[r.ruleId] ??= {})[m.market] = fills;
  }
  if (!revision && rep.results.length) writeFileSync(ledgerFile, JSON.stringify({ ...stored, updatedAt: new Date(now).toISOString() }, null, 1));
  const lastBar = Math.max(0, ...Object.values(data).map((c) => (c.length ? c[c.length - 1].t + DAY : 0)));
  const out = { ...rep, dataThrough: lastBar ? new Date(lastBar).toISOString() : null, results: rep.results.map(({ equity, ledger, ...x }) => ({ ...x, equityPoints: equity.length, lastEquity: equity.length ? equity[equity.length - 1] : null, markets: ledger?.length ?? null })) };
  writeFileSync(`${DIR}/report-${reg.id}.json`, JSON.stringify(out, null, 1));
  if (reg.id === 'forward-2026-11-25-a') writeFileSync(`${DIR}/report.json`, JSON.stringify(out, null, 1)); // legacy path read by the app
  console.log(reg.id, rep.state, rep.problems.join(' | '), rep.results.map((r) => `${r.ruleId}: ${r.status}, ${r.forwardMonths} complete months, net ${(r.netReturn * 100).toFixed(2)}%`).join('; '));
}
release();
