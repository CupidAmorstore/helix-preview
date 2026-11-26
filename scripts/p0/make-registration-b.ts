// Creates research/forward/registration-b.json (PROPOSED). Same three rules as registration a, unchanged parameters;
// only the cost assumption changes to the evidence-based Coinbase US intro schedule, and the v2 hash binds the values.
import { readFileSync, writeFileSync } from 'node:fs';
import { registrationHash, snapshotOf, type ForwardRegistration } from '../../src/bot/forward';
import { COST_PRESETS } from '../../src/bot/costs';
const a = JSON.parse(readFileSync('research/forward/registration.json', 'utf8')) as ForwardRegistration;
const b: ForwardRegistration = {
  id: 'forward-2026-11-26-b', status: 'proposed', registeredAt: '2026-11-26T12:00:00Z', startAt: null,
  capitalUsd: a.capitalUsd, costPreset: 'coinbase_taker_us_2026_09', rules: a.rules, evaluation: a.evaluation,
  costSnapshot: snapshotOf(COST_PRESETS.coinbase_taker_us_2026_09), hashVersion: 2, rulesHash: '',
  rationale: ['Identical rules to forward-2026-11-25-a; re-costed with fee evidence gathered in the P0 recovery (90 bps taker vs 60 bps).', 'No new hypothesis, no parameter change: this is a cost-realism correction, so it does not add to the multiple-testing count beyond the existing three rules.'],
  disclosures: [...a.disclosures.slice(0, 3), 'The 90 bps figure comes from secondary sources; the official Coinbase page could not be fetched. If the account tier is confirmed lower, record it as fee evidence first — never lower costs without evidence.', 'PROPOSED: the owner activates it by setting status "active" and a future startAt. Activating b does not stop a.']
};
b.rulesHash = registrationHash(b);
writeFileSync('research/forward/registration-b.json', JSON.stringify(b, null, 1));
console.log(b.id, b.rulesHash);
