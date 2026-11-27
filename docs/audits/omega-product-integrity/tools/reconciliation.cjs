// Independent financial reconciliation through the real UI (disposable browser context, paper money only).
// Buys $50 of BTC, sells it all, then recomputes every displayed number from the fill prices and the documented
// 0.60% fee, and checks the account totals shown in the app.
// usage: node reconciliation.cjs <baseUrl> <out.json>
const { chromium } = require('playwright');
const fs = require('fs');
const [B, OUT] = process.argv.slice(2);
const num = (s) => Number(String(s).replace(/[^0-9.\-]/g, ''));
const FEE = 0.006;
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 412, height: 915 } })).newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(String(e)));
  await p.goto(B + '/', { waitUntil: 'load' });
  await p.waitForTimeout(1500);
  await p.getByRole('button', { name: '$1,000' }).click();
  await p.getByRole('button', { name: 'Open paper account' }).click();
  await p.waitForTimeout(800);
  const receipt = async () => p.evaluate(() => {
    const dl = document.querySelector('[role="status"] dl');
    const out = {};
    if (!dl) return out;
    const dts = [...dl.querySelectorAll('dt')];
    dts.forEach((dt) => (out[dt.textContent.trim()] = dt.nextElementSibling.textContent.trim()));
    return out;
  });
  await p.goto(B + '/markets/BTC', { waitUntil: 'load' });
  await p.waitForTimeout(4000);
  await p.getByRole('button', { name: 'Paper buy' }).click();
  await p.fill('#trade-amount', '50');
  await p.waitForTimeout(600);
  await p.getByRole('button', { name: 'Place paper buy' }).click();
  await p.waitForTimeout(3000);
  const buy = await receipt();
  await p.getByRole('button', { name: 'Done' }).click();
  await p.waitForTimeout(800);
  await p.getByRole('button', { name: 'Paper sell' }).click();
  await p.waitForTimeout(500);
  await p.getByRole('button', { name: 'All', exact: true }).click();
  await p.getByRole('button', { name: 'Place paper sell' }).click();
  await p.waitForTimeout(3000);
  const sell = await receipt();
  await p.getByRole('button', { name: 'Done' }).click();
  await p.goto(B + '/', { waitUntil: 'load' });
  await p.waitForTimeout(2500);
  const home = await p.evaluate(() => document.querySelector('main').innerText.slice(0, 900));
  await p.goto(B + '/orders', { waitUntil: 'load' });
  await p.waitForTimeout(1500);
  const orders = await p.evaluate(() => document.querySelector('main').innerText.slice(0, 1500));
  await b.close();

  const bq = num(buy.Amount), bpx = num(buy['Fill price']), bfee = num(buy.Fee), bcash = num(buy['Cash spent']);
  const sq = num(sell.Amount), spx = num(sell['Fill price']), sfee = num(sell.Fee), scash = num(sell['Cash received']);
  const checks = {
    'buy fee = 0.60% of cash spent': [bfee, +(bcash * FEE).toFixed(2)],
    'buy qty = (spent - fee) / fill': [bq, +((bcash - bcash * FEE) / bpx).toFixed(8)],
    'sell qty = bought qty (sell All)': [sq, bq],
    'sell fee = 0.60% of gross': [sfee, +(sq * spx * FEE).toFixed(2)],
    'cash received = gross - fee': [scash, +(sq * spx * (1 - FEE)).toFixed(2)],
    'expected final cash': [null, +(1000 - bcash + scash).toFixed(2)]
  };
  const ok = Object.fromEntries(Object.entries(checks).filter(([k]) => !k.startsWith('expected')).map(([k, [a, e]]) => [k, Math.abs(a - e) <= 0.011 + Math.abs(e) * 1e-6]));
  const finalCash = checks['expected final cash'][1];
  const homeShowsFinal = home.includes(finalCash.toLocaleString('en-US', { minimumFractionDigits: 2 }));
  const out = { buy, sell, checks, ok, homeShowsFinal, finalCash, roundTripCostUsd: +(bcash - scash).toFixed(2), homeExcerpt: home, ordersExcerpt: orders, errors };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  console.log(JSON.stringify({ ok, homeShowsFinal, finalCash, roundTripCostUsd: out.roundTripCostUsd, errors }, null, 1));
})();
