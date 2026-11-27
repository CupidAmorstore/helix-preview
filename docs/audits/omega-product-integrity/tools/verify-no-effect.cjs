// Targeted verification of controls the crawler flagged as NO_VISIBLE_EFFECT (state/ordering changes the
// text-length heuristic cannot see). Each check states what a user expects and what actually happens.
const { chromium } = require('playwright');
const fs = require('fs');
const [B, OUT] = process.argv.slice(2);
const R = [];
const rec = (id, expect, actual, pass) => { R.push({ id, expect, actual, pass }); console.log(`${pass ? 'PASS' : 'FAIL'} ${id}: ${actual}`); };
(async () => {
  const b = await chromium.launch();
  const page = async () => (await b.newContext({ viewport: { width: 412, height: 915 } })).newPage();
  let p = await page();
  // watchlist star
  await p.goto(B + '/markets/BTC'); await p.waitForTimeout(2500);
  const lbl1 = await p.locator('button[aria-label*="watchlist"]').getAttribute('aria-label');
  await p.locator('button[aria-label*="watchlist"]').click(); await p.waitForTimeout(400);
  const lbl2 = await p.locator('button[aria-label*="watchlist"]').getAttribute('aria-label');
  await p.goto(B + '/markets?'); await p.waitForTimeout(1500);
  await p.locator('main').getByText('Watchlist', { exact: true }).first().click();
  await p.waitForTimeout(800);
  const wl = await p.evaluate(() => document.querySelector('main').innerText.includes('Bitcoin'));
  rec('I-0137 watchlist star', 'toggles BTC in/out of the watchlist', `${lbl1} → ${lbl2}; Bitcoin still in Watchlist tab: ${wl}`, lbl1 !== lbl2 && !wl);
  // markets sort
  await p.goto(B + '/markets'); await p.waitForTimeout(3000);
  const names = async () => p.evaluate(() => [...document.querySelectorAll('main a[href^="/markets/"]')].slice(0, 5).map((a) => a.textContent.trim().slice(0, 12)));
  const byCap = await names();
  await p.getByRole('radio', { name: '24h change' }).click(); await p.waitForTimeout(600);
  const byChg = await names();
  rec('I-0029 sort 24h change', 'reorders the list', `${byCap.join('|')} → ${byChg.join('|')}`, byCap.join() !== byChg.join());
  // chart timeframe (canvas): check that a new candle request is made
  await p.goto(B + '/markets/BTC'); await p.waitForTimeout(2500);
  const reqs = [];
  p.on('request', (r) => /candles|granularity/.test(r.url()) && reqs.push(r.url().slice(0, 100)));
  await p.getByRole('radio', { name: '1H' }).click(); await p.waitForTimeout(1500);
  rec('I-0142 chart 1H', 'loads 1-hour candles', `candle requests: ${reqs.length}`, reqs.length > 0);
  // Bot "Check now"
  await p.goto(B + '/bot'); await p.waitForTimeout(2500);
  const before = await p.evaluate(() => document.querySelector('main').innerText.match(/No newer research[^\n]*|feed[^\n]*|Up to date[^\n]*|Checking[^\n]*/)?.[0]);
  await p.getByRole('button', { name: 'Check now' }).click(); await p.waitForTimeout(2500);
  const after = await p.evaluate(() => document.querySelector('main').innerText.match(/No newer research[^\n]*|feed[^\n]*|Up to date[^\n]*|Checking[^\n]*|checked[^\n]*/i)?.[0]);
  rec('I-0174 Bot Check now', 'reports the result of checking for new research', `before: "${before}" → after: "${after}"`, !!after);
  // Research Lab risk capital buttons
  await p.goto(B + '/bot/research?tab=risk'); await p.waitForTimeout(2000);
  const sig = async () => p.evaluate(() => document.querySelector('main').innerText.replace(/\s+/g, ' ').slice(0, 2000));
  const r0 = await sig();
  await p.getByRole('button', { name: '$5000' }).click(); await p.waitForTimeout(500);
  const r1 = await sig();
  rec('I-0487 Risk $5000', 'recomputes the example for $5,000', r0 === r1 ? 'page text identical after click' : 'content changed', r0 !== r1);
  // Portfolio refresh with no addresses
  await p.goto(B + '/portfolio'); await p.waitForTimeout(1500);
  const pr0 = await sig();
  await p.getByRole('button', { name: 'Refresh balances' }).click(); await p.waitForTimeout(1500);
  const pr1 = await sig();
  rec('I-0546 Refresh balances (no addresses)', 'feedback (nothing to refresh) or disabled', pr0 === pr1 ? 'no feedback, enabled' : 'feedback shown', pr0 !== pr1);
  // Connections Lock vault with no vault
  await p.goto(B + '/connections'); await p.waitForTimeout(1500);
  const lockDisabled = await p.getByRole('button', { name: 'Lock vault' }).isDisabled();
  const c0 = await sig(); await p.getByRole('button', { name: 'Lock vault' }).click().catch(() => {}); await p.waitForTimeout(500); const c1 = await sig();
  rec('I-0568 Lock vault (no vault)', 'disabled or hidden when no vault exists', `disabled=${lockDisabled}; change=${c0 !== c1}`, lockDisabled || c0 !== c1);
  // Home $20 selection
  await p.goto(B + '/'); await p.waitForTimeout(1500);
  await p.getByRole('button', { name: '$20' }).click();
  const pressed = await p.getByRole('button', { name: '$20' }).getAttribute('aria-pressed');
  rec('I-0002 Home $20', 'selects $20 (announced to screen readers)', `aria-pressed=${pressed}`, pressed === 'true');
  await b.close();
  fs.writeFileSync(OUT, JSON.stringify(R, null, 1));
})();
