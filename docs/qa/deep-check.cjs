// Deep checkup: offline/recovery, persistence, small screens, accessibility, long session, price accuracy.
const { chromium } = require('playwright');
const fs = require('fs');
const [B, AXE, OUT] = process.argv.slice(2);
const axeSrc = fs.readFileSync(AXE, 'utf8');
const R = [];
const check = (area, name, ok, detail = '') => { R.push({ area, name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  [${area}] ${name}${detail ? '  — ' + String(detail).slice(0, 220) : ''}`); };
const wait = (p, ms) => p.waitForTimeout(ms);

(async () => {
  const b = await chromium.launch();
  const mk = (vp = { width: 412, height: 915 }) => b.newContext({ viewport: vp, isMobile: true, hasTouch: true });
  const ROUTES = ['/', '/markets', '/markets/BTC', '/bot', '/bot?tab=strategies', '/bot/research', '/wallet', '/more', '/alerts', '/connections', '/portfolio', '/access', '/privacy'];

  // ---------- 1. persistence across restart
  {
    const ctx = await mk(); const p = await ctx.newPage();
    await p.goto(B + '/'); await wait(p, 1500);
    await p.getByRole('button', { name: '$500' }).click();
    await p.getByRole('button', { name: 'Open paper account' }).click(); await wait(p, 800);
    await p.goto(B + '/markets/BTC'); await wait(p, 3500);
    await p.getByRole('button', { name: 'Paper buy' }).click();
    await p.locator('[role=dialog] input').first().fill('40');
    await p.getByRole('button', { name: /Place paper buy/ }).click(); await wait(p, 3500);
    await p.getByRole('button', { name: 'Done' }).click();
    await p.getByRole('button', { name: /watchlist/i }).click(); await wait(p, 300); // unwatch BTC
    await p.goto(B + '/alerts'); await wait(p, 1200);
    await p.locator('input[inputmode=decimal]').fill('999999');
    await p.getByRole('button', { name: 'Save alert' }).click(); await wait(p, 800);
    const pages = ctx.pages(); for (const x of pages) await x.close();
    const p2 = await ctx.newPage(); // "restart": new page, same storage
    await p2.goto(B + '/'); await wait(p2, 2500);
    const home = await p2.locator('main').innerText();
    check('persistence', 'paper account survives restart', /\$4\d\d\.\d\d/.test(home) && /Paper buy BTC/.test(home), home.split('\n').slice(0, 3).join(' '));
    check('persistence', 'position survives restart', /YOUR PAPER POSITIONS|Your paper positions/i.test(home) && /BTC/.test(home));
    await p2.goto(B + '/markets/BTC'); await wait(p2, 1500);
    check('persistence', 'watchlist change survives restart', (await p2.getByRole('button', { name: /watchlist/i }).getAttribute('aria-pressed')) === 'false');
    await p2.goto(B + '/alerts'); await wait(p2, 1200);
    check('persistence', 'alert survives restart', /999,999/.test(await p2.locator('main').innerText()));
    // equity math: cash + invested = equity; fee 0.6% of 40
    await p2.goto(B + '/'); await wait(p2, 3000);
    const t = await p2.locator('main').innerText();
    const num = (label) => { const m = t.match(new RegExp(label + '\\s*\\n\\s*\\$([\\d,]+\\.\\d\\d)', 'i')); return m ? Number(m[1].replace(/,/g, '')) : NaN; };
    const cash = num('Cash available'), inv = num('Invested'), fees = num('Fees paid');
    const eqm = t.match(/\$([\d,]+\.\d\d)/); const eq = eqm ? Number(eqm[1].replace(/,/g, '')) : NaN;
    check('money', 'cash after $40 buy = $460.00', Math.abs(cash - 460) < 0.005, `cash ${cash}`);
    check('money', 'fee = 0.60% of $40 = $0.24', Math.abs(fees - 0.24) < 0.005, `fees ${fees}`);
    check('money', 'equity = cash + invested (±1¢)', Math.abs(eq - (cash + inv)) <= 0.011, `eq ${eq} cash ${cash} inv ${inv}`);
    await ctx.close();
  }

  // ---------- 2. offline + recovery
  {
    const ctx = await mk(); const p = await ctx.newPage();
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    await p.goto(B + '/'); await wait(p, 2500);
    await ctx.setOffline(true);
    for (const r of ['/markets', '/markets/ETH', '/bot', '/wallet', '/']) {
      await p.getByRole('navigation', { name: 'Main' }).last().getByRole('link', { name: r === '/' ? 'Home' : r.includes('markets') ? 'Markets' : r === '/bot' ? 'Bot' : 'Wallet' }).click().catch(() => {});
      if (r === '/markets/ETH') await p.evaluate(() => { history.pushState({}, '', '/markets/ETH'); dispatchEvent(new PopStateEvent('popstate')); });
      await wait(p, 4000);
      const txt = await p.locator('main').innerText().catch(() => '');
      check('offline', `${r} still renders offline`, txt.length > 80, txt.split('\n').slice(0, 2).join(' | '));
    }
    await p.goto(B + '/markets/BTC').catch(() => {}); // full reload offline fails in browser (app shell not cached); in the APK assets are local
    await ctx.setOffline(false);
    await p.goto(B + '/'); await wait(p, 2000);
    await ctx.setOffline(true); await wait(p, 8000);
    const off = await p.locator('main').innerText();
    check('offline', 'home tells the user prices are not live while offline', /No connection|Connection lost|delayed|Connecting|offline|not live|reconnect/i.test(off), off.match(/.*(Live Coinbase|delayed|Connecting|offline).*/i)?.[0]);
    await ctx.setOffline(false); await wait(p, 15000);
    const on = await p.locator('main').innerText();
    check('offline', 'prices recover after the connection returns', /Live Coinbase prices/.test(on), on.match(/.*(Live Coinbase|delayed|Connecting).*/i)?.[0]);
    check('offline', 'no crashes during offline/online', errs.length === 0, errs.join(' | '));
    await ctx.close();
  }

  // ---------- 3. small screen + large text
  for (const [label, vp, zoom] of [['320px phone', { width: 320, height: 640 }, 1], ['360px + 130% text', { width: 360, height: 780 }, 1.3]]) {
    const ctx = await mk(vp); const p = await ctx.newPage();
    const overflow = [];
    for (const r of ROUTES) {
      await p.goto(B + r); await wait(p, 1500);
      if (zoom !== 1) await p.evaluate((z) => { const els = [...document.querySelectorAll('body *')]; const sizes = els.map((e) => parseFloat(getComputedStyle(e).fontSize)); els.forEach((e, i) => { e.style.fontSize = sizes[i] * z + 'px'; }); }, zoom); // ≈ Android WebView textZoom
      await wait(p, 300);
      const o = await p.evaluate(() => {
        const w = document.documentElement.clientWidth;
        const bad = [...document.querySelectorAll('main *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > w + 1 && getComputedStyle(e).position !== 'fixed' && !e.closest('[class*=overflow-x-auto]'); });
        return { sw: document.documentElement.scrollWidth, w, bad: bad.slice(0, 3).map((e) => (e.tagName + ':' + (e.textContent || '').trim().slice(0, 30))) };
      });
      if (o.sw > o.w + 1 || o.bad.length) overflow.push(`${r} sw=${o.sw}/${o.w} ${o.bad.join(', ')}`);
      if (r === '/' || r === '/bot') await p.screenshot({ path: `${OUT}/deep_${label.replace(/\W+/g, '_')}_${r === '/' ? 'home' : 'bot'}.png` });
    }
    check('layout', `${label}: nothing runs off-screen on ${ROUTES.length} routes`, overflow.length === 0, overflow.join(' ;; '));
    await ctx.close();
  }

  // ---------- 4. accessibility (axe, WCAG 2.1 AA)
  {
    const ctx = await mk(); const p = await ctx.newPage();
    const all = [];
    for (const r of ROUTES) {
      await p.goto(B + r); await wait(p, 1800);
      await p.addScriptTag({ content: axeSrc });
      const res = await p.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] })).violations.map((v) => `${v.id}(${v.impact})×${v.nodes.length}: ${v.nodes[0]?.target?.[0]}`));
      if (res.length) all.push(`${r}: ${res.join(' ; ')}`);
    }
    check('a11y', `WCAG 2.1 AA (axe) on ${ROUTES.length} routes`, all.length === 0, all.join(' || '));
    await ctx.close();
  }

  // ---------- 5. price accuracy vs Coinbase
  {
    const ctx = await mk(); const p = await ctx.newPage();
    await p.goto(B + '/markets/BTC'); await wait(p, 5000);
    const shown = Number((await p.locator('main').innerText()).match(/\$([\d,]+\.\d\d)/)[1].replace(/,/g, ''));
    const tick = await (await fetch('https://api.exchange.coinbase.com/products/BTC-USD/ticker')).json();
    const diff = Math.abs(shown - Number(tick.price)) / Number(tick.price);
    check('data', 'BTC price shown matches Coinbase ticker (≤0.2%)', diff < 0.002, `app ${shown} vs Coinbase ${tick.price} (${(diff * 100).toFixed(3)}%)`);
    await ctx.close();
  }

  // ---------- 6. long session: memory + connections
  {
    const ctx = await mk(); const p = await ctx.newPage();
    const cdp = await ctx.newCDPSession(p);
    await cdp.send('Performance.enable');
    let ws = 0; p.on('websocket', () => ws++);
    await p.goto(B + '/'); await wait(p, 3000);
    const heap = async () => (await cdp.send('Performance.getMetrics')).metrics.find((m) => m.name === 'JSHeapUsedSize').value / 1e6;
    const h0 = await heap();
    // navigate around for ~2.5 minutes like a user
    const loop = ['Markets', 'Home', 'Bot', 'Wallet', 'Home', 'Markets'];
    for (let i = 0; i < 30; i++) {
      await p.getByRole('navigation', { name: 'Main' }).last().getByRole('link', { name: loop[i % loop.length] }).click(); await wait(p, 2500);
      if (i % 6 === 2) { await p.goto(B + '/markets/ETH'); await wait(p, 2500); }
    }
    await cdp.send('HeapProfiler.collectGarbage').catch(() => {});
    await wait(p, 1000);
    const h1 = await heap();
    const open = await p.evaluate(() => performance.getEntriesByType('resource').length);
    check('stability', 'memory does not balloon over a 2.5-min session', h1 < h0 * 2.5 + 20, `heap ${h0.toFixed(1)} MB → ${h1.toFixed(1)} MB`);
    check('stability', 'price socket is not re-opened on every screen change', ws <= 12, `${ws} WebSocket connections opened for 35 screen changes; ${open} resource requests`);
    await ctx.close();
  }

  fs.writeFileSync(`${OUT}/deep.json`, JSON.stringify(R, null, 1));
  const f = R.filter((x) => !x.ok);
  console.log(`\n${R.length - f.length}/${R.length} passed`);
  await b.close();
})().catch((e) => { console.error('DEEP CRASH', e); process.exit(1); });
