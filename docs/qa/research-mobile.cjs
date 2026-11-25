// Research Lab on 360/390 px phone viewports: no horizontal page scroll, tables reflow into labelled lists,
// candidate details show the walk-forward line. Browser viewport only — NOT a physical-device test.
// Usage: node docs/qa/research-mobile.cjs http://localhost:4173 <outdir>
const { chromium } = require('playwright');
const fs = require('fs');
const [B, OUT] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const R = [];
const check = (name, ok, detail = '') => { R.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
const TABS = ['overview', 'strategies', 'lab', 'watchbot', 'risk', 'activity'];

(async () => {
  const b = await chromium.launch();
  for (const width of [360, 390]) {
    const p = await (await b.newContext({ viewport: { width, height: 800 }, deviceScaleFactor: 1 })).newPage();
    const errors = [];
    p.on('pageerror', (e) => errors.push(String(e)));
    let wfSeen = false;
    for (const tab of TABS) {
      await p.goto(`${B}/bot/research?tab=${tab}`, { waitUntil: 'load' });
      await p.waitForTimeout(1500);
      // open every collapsed block so hidden tables are measured too
      for (const d of await p.$$('details:not([open])')) await d.evaluate((x) => (x.open = true));
      // open one gates-v2 candidate (has walk-forward data) and its metrics table
      if (tab === 'strategies') await p.locator('button[aria-expanded="false"]', { hasText: 'weekly_trend' }).first().click().catch(() => {});
      await p.waitForTimeout(400);
      const m = await p.evaluate(() => {
        const sw = document.documentElement.scrollWidth;
        const cw = document.documentElement.clientWidth;
        const tables = [...document.querySelectorAll('table.stack-sm')].filter((t) => t.offsetParent !== null);
        const wide = tables.filter((t) => t.getBoundingClientRect().width > cw + 1).length;
        const stacked = tables.filter((t) => getComputedStyle(t.querySelector('tbody tr') || t).display === 'block').length;
        const wf = /Walk-forward \(re-selected/.test(document.body.innerText);
        return { sw, cw, tables: tables.length, wide, stacked, wf };
      });
      wfSeen = wfSeen || m.wf;
      check(`${width}px ${tab}: no horizontal page scroll`, m.sw <= m.cw + 1, `${m.sw} vs ${m.cw}`);
      if (m.tables) check(`${width}px ${tab}: ${m.tables} table(s) reflowed, none wider than screen`, m.wide === 0 && m.stacked === m.tables, JSON.stringify(m));
      await p.screenshot({ path: `${OUT}/research-${width}-${tab}.png`, fullPage: true });
    }
    check(`${width}px walk-forward result visible in a candidate detail`, wfSeen);
    check(`${width}px no uncaught page errors`, errors.length === 0, errors.join(' | ').slice(0, 200));
    await p.close();
  }
  await b.close();
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(R, null, 1));
  console.log(`\n${R.filter((r) => r.ok).length}/${R.length} passed`);
  process.exit(R.every((r) => r.ok) ? 0 : 1);
})();
