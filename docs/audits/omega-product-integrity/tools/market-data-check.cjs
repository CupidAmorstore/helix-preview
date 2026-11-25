// Compares prices displayed by HELIX with Coinbase's public ticker fetched at the same moment.
// usage: node market-data-check.cjs <baseUrl> <out.json>
const { chromium } = require('playwright');
const fs = require('fs');
const [B, OUT] = process.argv.slice(2);
const parse = (s) => Number(String(s).replace(/[^0-9.]/g, ''));
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 412, height: 915 } })).newPage();
  const rows = [];
  for (const sym of ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'LINK']) {
    await p.goto(`${B}/markets/${sym}`, { waitUntil: 'load' });
    await p.waitForTimeout(4000);
    const shown = await p.evaluate(() => { const m = document.body.innerText.match(/\$[0-9,]+\.[0-9]+/); return m ? m[0] : null; });
    const status = await p.evaluate(() => (document.body.innerText.match(/(Live|Delayed|Cached|Stale|Offline)[^\n]{0,30}/) || [null])[0]);
    const t = await (await fetch(`https://api.exchange.coinbase.com/products/${sym}-USD/ticker`)).json();
    const ref = Number(t.price);
    const app = parse(shown);
    rows.push({ sym, appShown: shown, status, coinbaseTicker: ref, diffPct: +((100 * (app - ref)) / ref).toFixed(3), at: new Date().toISOString() });
  }
  await b.close();
  fs.writeFileSync(OUT, JSON.stringify(rows, null, 1));
  console.log(JSON.stringify(rows));
})();
