# Before/after comparison of two crawler runs (evidence/ vs evidence-after/). Writes evidence-after/comparison.json.
import json, re, collections, sys, pathlib
base = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else 'docs/audits/omega-product-integrity')

RULES = [(r'\b1 (tests|bars|trades|months)\b', 'grammar'), (r'TODO|Legal review required', 'placeholder'),
         (r'[a-z]+_[a-z_]+\(', 'internal key'), (r'scheduled daily', 'false schedule claim'), (r'with real fees(?! modelled)', 'overstated fees'),
         (r'^uo1$|^sepoliafaucet$|^solfaucet$', 'cryptic link'), (r'Last successful research run', 'wrong research time label'), (r'risk (Medium|High)', 'awkward wording')]

def load(d):
    R = json.load(open(base / d / 'interaction-registry.json'))
    P = json.load(open(base / d / 'pages.json'))
    T = json.load(open(base / d / 'text-registry.json'))
    V = json.load(open(base / d / 'viewport-sweep.json'))
    uniq = {t['text'] for t in T}
    hits = collections.Counter()
    advanced = collections.Counter()
    for t in T:
        for rx, why in RULES:
            if re.search(rx, t['text']):
                # internal keys are intentionally kept as small secondary text in the advanced Research Lab
                (advanced if (why == 'internal key' and t['route'].startswith('/bot/research')) else hits)[why] += 1
    unique = [r for r in R if r['outcome'] not in ('SAME_AS', 'DISABLED')]
    return {
        'pageStates': len(P), 'elements': len(R), 'activated': len(unique),
        'touchUnder24': sum(1 for r in unique if r['tag'] != 'input' and min(r['w'], r['h']) < 24),
        'touch24to43': sum(1 for r in unique if r['tag'] != 'input' and 24 <= min(r['w'], r['h']) < 44),
        'axeViolations': sum(len(p['axe'] or []) for p in P),
        'overflow130': sum(1 for p in P if p['fontScale']['130']['sw'] > p['fontScale']['130']['cw'] + 1),
        'overflow200': sum(1 for p in P if p['fontScale']['200']['sw'] > p['fontScale']['200']['cw'] + 1),
        'overflowSmallViewports': sum(1 for v in V if v['sw'] > v['cw'] + 1),
        'feed404Errors': sum(1 for r in R for e in r['errors'] if '404' in e.get('msg', '')),
        'textElements': len(T), 'uniqueTexts': len(uniq), 'ruleHits': dict(hits), 'advancedKeyHits': dict(advanced),
        'noVisibleEffect': sum(1 for r in R if r['outcome'] == 'NO_VISIBLE_EFFECT')
    }

out = {'before': load('evidence'), 'after': load('evidence-after')}
json.dump(out, open(base / 'evidence-after' / 'comparison.json', 'w'), indent=1)
for k in out['before']:
    print(f"{k:24} {str(out['before'][k]):60} -> {out['after'][k]}")
