#!/usr/bin/env python3
"""P0 independent reproduction of the prior audit claims, written separately from the TypeScript engine.

Reads only research/data/*.csv.gz and research/registry.json. Writes research/p0/claims-reproduction.json.
    python3 -I scripts/p0/reproduce_claims.py
"""
import gzip, hashlib, json, os, statistics as st
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
D = os.path.join(ROOT, 'research', 'data')
MARKETS = ['BTC-USD', 'ETH-USD', 'SOL-USD', 'XRP-USD', 'DOGE-USD', 'ADA-USD', 'AVAX-USD', 'LINK-USD', 'LTC-USD', 'DOT-USD']


def load(sym, iv):
    p = os.path.join(D, f'coinbase_{sym}_{iv}.csv.gz')
    raw = gzip.open(p).read()
    rows = [l.split(',') for l in raw.decode().strip().split('\n')[1:]]
    a = np.array([[float(x) for x in r] for r in rows])
    return a, hashlib.sha256(raw).hexdigest()


def integrity(a, step):
    t = a[:, 0]
    d = np.diff(t)
    o, h, l, c = a[:, 1], a[:, 2], a[:, 3], a[:, 4]
    return {
        'bars': int(len(a)), 'first': int(t[0]), 'last': int(t[-1]),
        'duplicates': int((d == 0).sum()), 'outOfOrder': int((d < 0).sum()), 'gaps': int((d > step).sum()),
        'misaligned': int((t % step != 0).sum()),
        'invalidOhlc': int(((h < np.maximum(o, c) - 1e-12) | (l > np.minimum(o, c) + 1e-12) | (l <= 0)).sum()),
        'zeroVolumeBars': int((a[:, 5] <= 0).sum()),
        # open[i+1] vs close[i]: validates the next-open fill proxy for a 24/7 market
        'openVsPrevCloseBps': {'median': float(np.median(np.abs(o[1:] / c[:-1] - 1)) * 1e4), 'p99': float(np.percentile(np.abs(o[1:] / c[:-1] - 1), 99) * 1e4)},
    }


def main():
    out = {'generatedBy': 'scripts/p0/reproduce_claims.py', 'datasets': {}, 'claims': {}}
    hourly_med = {}
    daily = {}
    for m in MARKETS:
        h, hh = load(m, '1h')
        d, dh = load(m, '1d')
        out['datasets'][m] = {'1h': {'sha256': hh, **integrity(h, 3_600_000)}, '1d': {'sha256': dh, **integrity(d, 86_400_000)}}
        hourly_med[m] = float(np.median(np.abs(h[1:, 4] / h[:-1, 4] - 1)))
        daily[m] = dict(zip(d[:, 0].astype(np.int64), d[:, 4]))
    med = st.median(hourly_med.values())
    out['claims']['medianHourlyAbsMove'] = {'claimed': 0.0030, 'reproduced': med, 'perMarket': hourly_med, 'verdict': 'confirmed' if abs(med - 0.003) < 0.0005 else 'differs'}

    common = sorted(set.intersection(*[set(v) for v in daily.values()]))
    px = np.array([[daily[m][t] for m in MARKETS] for t in common])
    r = np.diff(np.log(px), axis=0)
    C = np.corrcoef(r.T)
    iu = np.triu_indices(len(MARKETS), 1)
    ev = np.sort(np.linalg.eigvalsh(C))[::-1]
    mean_pw = float(C[iu].mean())
    out['claims']['pairwiseDailyCorrelation'] = {
        'claimed': 0.70, 'reproduced': mean_pw, 'commonDays': len(common), 'from': int(common[0]),
        'firstEigenShare': float(ev[0] / ev.sum()), 'effectiveIndependentAssets': float(ev.sum() ** 2 / (ev ** 2).sum()),
        'verdict': 'confirmed' if abs(mean_pw - 0.70) < 0.03 else 'differs'}

    # horizon moves vs round-trip cost under the legacy and the verified/secondary fee evidence
    rt = {'legacy_coinbase_60bps': 2 * (60 + 5) / 1e4, 'kraken_verified_80bps': 2 * (80 + 5) / 1e4, 'coinbase_us_secondary_90bps': 2 * (90 + 5) / 1e4}
    horizons = {'1h': ('1h', 1), '4h': ('1h', 4), '12h': ('1h', 12), '1d': ('1d', 1), '1w': ('1d', 7), '1m': ('1d', 30)}
    table = {}
    for name, (iv, k) in horizons.items():
        meds = []
        for m in MARKETS:
            a, _ = load(m, iv)
            c = a[:, 4]
            meds.append(float(np.median(np.abs(c[k:] / c[:-k] - 1))))
        mv = st.median(meds)
        table[name] = {'medianAbsMove': mv, **{f'moveOver_{key}': mv / v for key, v in rt.items()}}
    out['claims']['roundTripCost'] = {'claimed': 0.013, 'legacyReproduced': rt['legacy_coinbase_60bps'], 'scenarios': rt}
    out['claims']['horizonTable'] = table

    reg = json.load(open(os.path.join(ROOT, 'research', 'registry.json')))
    statuses = {}
    for v in reg.values():
        statuses[v['status']] = statuses.get(v['status'], 0) + 1
    out['claims']['registry'] = {'claimedCandidates': 199, 'claimedQualified': 0, 'candidates': len(reg), 'statuses': statuses,
                                 'verdict': 'confirmed' if len(reg) == 199 and 'qualified_paper_strategy' not in statuses else 'differs'}
    os.makedirs(os.path.join(ROOT, 'research', 'p0'), exist_ok=True)
    json.dump(out, open(os.path.join(ROOT, 'research', 'p0', 'claims-reproduction.json'), 'w'), indent=1)
    for k, v in out['claims'].items():
        print(k, {x: v[x] for x in v if x in ('claimed', 'reproduced', 'verdict', 'candidates', 'statuses', 'legacyReproduced')})
    print('horizon', {k: round(v['medianAbsMove'] * 100, 2) for k, v in table.items()})
    for m, d in out['datasets'].items():
        bad = {iv: {k: x[k] for k in ('duplicates', 'outOfOrder', 'gaps', 'misaligned', 'invalidOhlc', 'zeroVolumeBars') if x[k]} for iv, x in d.items()}
        print(m, bad, 'open/prevclose bps 1h', round(d['1h']['openVsPrevCloseBps']['median'], 2), round(d['1h']['openVsPrevCloseBps']['p99'], 2))


if __name__ == '__main__':
    main()
