// Exhaustive click crawl: every route, every visible button/link, fresh state per click.
// usage: node crawl.cjs <base> <out.json> [withAccount]
const { chromium } = require('playwright');
const fs = require('fs');
const [base, outFile, withAccount] = process.argv.slice(2);
const ROUTES = ['/', '/markets', '/markets/BTC', '/markets/ETH', '/markets/PEPE', '/markets/NOTACOIN', '/bot', '/bot?tab=strategies', '/bot?tab=activity', '/bot/research',
  '/portfolio', '/more', '/connections', '/alerts', '/wallet', '/access', '/support', '/privacy', '/terms', '/does-not-exist'];
const SKIP = /delete|remove|clear all|reset|mainnet|enable mainnet|lock vault/i;

(async () => {
  const b = await chromium.launch();
  const report = [];
  const newCtx = async () => {
    const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });
    if (withAccount) {
      const p = await ctx.newPage();
      await p.goto(base + '/', { waitUntil: 'load', timeout: 15000 });
      await p.getByRole('button', { name: '$1,000' }).click().catch(() => {});
      await p.getByRole('button', { name: 'Open paper account' }).click().catch(() => {});
      await p.waitForTimeout(800);
      await p.close();
    }
    return ctx;
  };
  const watch = (p, sink) => {
    p.on('pageerror', (e) => sink.push({ kind: 'pageerror', msg: String(e).slice(0, 300) }));
    p.on('console', (m) => m.type() === 'error' && sink.push({ kind: 'console', msg: m.text().slice(0, 300) }));
    p.on('requestfailed', (r) => sink.push({ kind: 'reqfail', msg: `${r.url().slice(0, 140)} ${r.failure()?.errorText}` }));
    p.on('response', (r) => r.status() >= 400 && sink.push({ kind: 'http', msg: `${r.status()} ${r.url().slice(0, 140)}` }));
  };
  const ctx = await newCtx();
  const one = async (route) => {
    const p = await ctx.newPage();
    const load = [];
    watch(p, load);
    await p.goto(base + route, { waitUntil: 'load', timeout: 15000 }).catch((e) => load.push({ kind: 'goto', msg: String(e) }));
    await p.waitForTimeout(1800);
    const info = await p.evaluate(() => ({
      title: document.querySelector('h1')?.textContent?.trim() ?? null,
      sw: document.documentElement.scrollWidth,
      text: document.body.innerText.length,
      smallTargets: [...document.querySelectorAll('button,a,[role=radio],input,select')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.height < 32) && getComputedStyle(e).visibility !== 'hidden'; }).map((e) => (e.textContent || e.getAttribute('aria-label') || e.tagName).trim().slice(0, 30)).slice(0, 12),
      unlabeled: [...document.querySelectorAll('button,a')].filter((e) => !(e.textContent || '').trim() && !e.getAttribute('aria-label')).length
    }));
    // enumerate clickables (by index)
    const n = await p.locator('main button:visible, main a:visible, [role=dialog] button:visible').count();
    const labels = [];
    for (let i = 0; i < n; i++) labels.push(await p.locator('main button:visible, main a:visible').nth(i).evaluate((e) => ({ t: (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 40), href: e.getAttribute('href'), tag: e.tagName, dis: e.disabled || false })).catch(() => null));
    const clicks = [];
    let coinLinks = 0;
    for (let i = 0; i < labels.length; i++) {
      const L = labels[i];
      if (L && L.href && /^\/markets\/[A-Z0-9]+$/.test(L.href) && route === '/markets' && ++coinLinks > 3) continue;
      if (!L || L.dis || SKIP.test(L.t) || (L.href && /^https?:|^mailto:/.test(L.href))) { if (L) clicks.push({ ...L, skipped: true }); continue; }
      const q = await ctx.newPage();
      const errs = [];
      watch(q, errs);
      await q.goto(base + route, { waitUntil: 'load', timeout: 15000 }).catch(() => {});
      await q.waitForTimeout(1500);
      const before = await q.evaluate(() => location.pathname + location.search + '|' + document.body.innerText.length);
      const el = q.locator('main button:visible, main a:visible').nth(i);
      let res = 'ok';
      try { await el.click({ timeout: 3000 }); } catch (e) { res = 'CLICK-FAIL ' + String(e).split('\n')[0].slice(0, 120); }
      await q.waitForTimeout(1500);
      const after = await q.evaluate(() => location.pathname + location.search + '|' + document.body.innerText.length + '|' + (document.querySelector('[role=dialog]') ? 'dialog' : '') + '|' + ([...document.querySelectorAll('[role=alert],[role=status]')].map((x) => x.textContent.trim().slice(0, 90)).join(' / ')));
      clicks.push({ ...L, res, changed: before.split('|').slice(0, 2).join('|') !== after.split('|').slice(0, 2).join('|') || after.includes('dialog'), after: after.slice(0, 220), errs: errs.filter((e) => e.kind !== 'reqfail' || !/abort/i.test(e.msg)) });
      await q.close();
    }
    report.push({ route, info, load, clicks });
    console.log(route, '| h1:', info.title, '| errors:', load.length, '| clicks:', clicks.length, '| sw', info.sw);
    await p.close();
  };
  const queue = [...ROUTES];
  await Promise.all([0,1,2,3,4].map(async () => { while (queue.length) await one(queue.shift()); }));
  report.sort((a, b) => ROUTES.indexOf(a.route) - ROUTES.indexOf(b.route));
  fs.writeFileSync(outFile, JSON.stringify(report, null, 1));
  await b.close();
})();
