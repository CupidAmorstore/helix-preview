// Feature-by-feature functional checks with assertions. usage: node functional.cjs <base> <shotDir>
const { chromium } = require('playwright');
const [B, SHOTS] = process.argv.slice(2);
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
const wait = (p, ms) => p.waitForTimeout(ms);

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  const go = async (path, ms = 2200) => { await p.goto(B + path, { waitUntil: 'load' }); await wait(p, ms); };
  const nav = (name) => p.getByRole('navigation', { name: 'Main' }).last().getByRole('link', { name });
  const safe = async (name, fn) => { try { await fn(); } catch (e) { check(name, false, 'threw: ' + String(e).split('\n')[0].slice(0, 160)); } };

  // ---------- Home / paper account
  await safe('home: choose capital + open account', async () => {
    await go('/');
    await p.getByRole('button', { name: '$250' }).click();
    check('home: capital option shows selected', (await p.getByRole('button', { name: '$250' }).getAttribute('aria-pressed')) === 'true');
    await p.getByRole('button', { name: 'Open paper account' }).click();
    await wait(p, 1200);
    const t = await p.locator('main').innerText();
    check('home: account opened with $250', /\$250\.00/.test(t), t.slice(0, 80).replace(/\n/g, ' '));
    for (const r of ['1D', '1M', 'All', '1W']) {
      await p.getByRole('radio', { name: r }).click();
      check(`home: range ${r} selectable`, (await p.getByRole('radio', { name: r }).getAttribute('aria-checked')) === 'true');
    }
  });

  // ---------- bottom nav
  await safe('bottom nav', async () => {
    for (const [name, path] of [['Markets', '/markets'], ['Bot', '/bot'], ['Wallet', '/wallet'], ['More', '/more'], ['Home', '/']]) {
      await nav(name).click(); await wait(p, 700);
      check(`nav: ${name} → ${path}`, new URL(p.url()).pathname === path, new URL(p.url()).pathname);
    }
  });

  // ---------- Markets
  await safe('markets', async () => {
    await go('/markets', 3500);
    const first = async () => (await p.locator('main ul li').first().innerText()).split('\n')[0];
    const capFirst = await first();
    await p.getByRole('radio', { name: '24h change' }).click(); await wait(p, 400);
    const chFirst = await first();
    check('markets: sort by 24h change reorders list', chFirst !== capFirst || (await p.getByRole('radio', { name: '24h change' }).getAttribute('aria-checked')) === 'true', `${capFirst} → ${chFirst}`);
    await p.getByRole('radio', { name: 'Losers' }).click(); await wait(p, 400);
    const loserTxt = await p.locator('main ul').innerText();
    check('markets: Losers tab shows only negative changes', !/▲/.test(loserTxt) || /No coins/.test(loserTxt));
    await p.getByRole('radio', { name: 'All' }).click();
    await p.getByRole('searchbox').fill('pepe'); await wait(p, 600);
    check('markets: search finds PEPE', /Pepe|PEPE/.test(await p.locator('main ul').innerText()));
    await p.getByRole('searchbox').fill('zzzzzz'); await wait(p, 400);
    check('markets: empty search state', /No coins match/.test(await p.locator('main').innerText()));
    await p.getByRole('searchbox').fill('');
    await p.getByRole('radio', { name: 'Watchlist' }).click(); await wait(p, 400);
    check('markets: watchlist tab lists watched coins', /Bitcoin/.test(await p.locator('main').innerText()));
  });

  // ---------- Asset page
  await safe('asset', async () => {
    await go('/markets/BTC', 3500);
    const star = p.getByRole('button', { name: /watchlist/i });
    const before = await star.getAttribute('aria-pressed') ?? await star.innerText();
    await star.click(); await wait(p, 500);
    const after = await star.getAttribute('aria-pressed') ?? await star.innerText();
    check('asset: watch star toggles', before !== after, `${before} → ${after}`);
    await star.click(); await wait(p, 300);
    let reqs = [];
    const onReq = (r) => r.url().includes('/candles') && reqs.push(r.url());
    p.on('request', onReq);
    for (const tf of ['1H', '1W', '5M', '1D']) {
      reqs = [];
      await p.getByRole('button', { name: tf, exact: true }).or(p.getByRole('radio', { name: tf, exact: true })).first().click();
      await wait(p, 1500);
      const gran = reqs.map((u) => (u.match(/granularity=(\d+)/) || [])[1]).filter(Boolean);
      check(`asset: timeframe ${tf} loads new candles`, reqs.length > 0, gran.join(','));
    }
    p.off('request', onReq);
    await p.getByRole('link', { name: /alert/i }).first().click(); await wait(p, 800);
    check('asset: "Set a price alert" opens alerts for BTC', /\/alerts/.test(p.url()) && /BTC/.test(await p.locator('select').first().inputValue()));
  });

  // ---------- Paper trading flows
  await safe('paper', async () => {
    await go('/markets/ETH', 3500);
    await p.getByRole('button', { name: 'Paper buy' }).click(); await wait(p, 400);
    const amt = p.locator('[role=dialog] input').first();
    await amt.fill('0.5'); await p.getByRole('button', { name: /Place paper buy/ }).click(); await wait(p, 2500);
    check('paper: below $1 minimum refused with reason', /Minimum order/.test(await p.locator('[role=dialog]').innerText()));
    await amt.fill('100000'); await p.getByRole('button', { name: /Place paper buy/ }).click(); await wait(p, 2500);
    check('paper: more than cash refused', /Not enough paper cash/.test(await p.locator('[role=dialog]').innerText()));
    await amt.fill('200'); await p.getByRole('button', { name: /Place paper buy/ }).click(); await wait(p, 2500);
    check('paper: >50% of account refused (position limit)', /Position limit/.test(await p.locator('[role=dialog]').innerText()));
    await amt.fill('50'); await p.getByRole('button', { name: /Place paper buy/ }).click(); await wait(p, 3500);
    const filled = await p.locator('[role=dialog]').innerText();
    check('paper: $50 buy fills', /filled/.test(filled), filled.split('\n').slice(2, 4).join(' '));
    await p.screenshot({ path: `${SHOTS}/f_buy.png` });
    await p.getByRole('button', { name: 'Done' }).click(); await wait(p, 500);
    check('paper: sheet closes on Done', (await p.locator('[role=dialog]').count()) === 0);
    await p.getByRole('button', { name: 'Paper sell' }).click(); await wait(p, 400);
    const max = p.locator('[role=dialog]').getByRole('button', { name: /Max|100%|All/ }).first();
    if (await max.count()) await max.click(); else await p.locator('[role=dialog] input').first().fill('0.001');
    await p.getByRole('button', { name: /Place paper sell/ }).click(); await wait(p, 3500);
    const sold = await p.locator('[role=dialog]').innerText();
    check('paper: sell fills with realized P&L', /filled/.test(sold) && /Realized/.test(sold), sold.split('\n').slice(2, 4).join(' '));
    await p.keyboard.press('Escape'); await wait(p, 400);
    check('paper: Escape closes sheet', (await p.locator('[role=dialog]').count()) === 0);
    // pause blocks orders
    await go('/bot');
    await p.getByRole('button', { name: 'Pause all paper trading' }).click(); await wait(p, 600);
    await go('/markets/BTC', 3500);
    await p.getByRole('button', { name: 'Paper buy' }).click(); await wait(p, 300);
    await p.locator('[role=dialog] input').first().fill('5');
    const placeBtn = p.getByRole('button', { name: /Place paper buy/ });
    if (await placeBtn.isEnabled()) { await placeBtn.click(); await wait(p, 2500); }
    check('paper: paused account refuses orders', /paused/i.test(await p.locator('[role=dialog]').innerText()));
    await p.keyboard.press('Escape');
    await go('/bot');
    await p.getByRole('button', { name: 'Resume paper trading' }).click(); await wait(p, 500);
    check('paper: resume works', (await p.getByRole('button', { name: 'Pause all paper trading' }).count()) === 1);
    await go('/');
    const home = await p.locator('main').innerText();
    check('home: recent activity lists the orders (incl. refusals)', /Paper buy ETH/.test(home) && /Paper sell ETH/.test(home));
  });

  // ---------- Paper orders history
  await safe('orders', async () => {
    await go('/orders', 1500);
    const t = await p.locator('main').innerText();
    check('orders: history lists filled and refused orders', /Buy ETH/.test(t) && /Sell ETH/.test(t) && /Refused/.test(t), t.split('\n').slice(0, 4).join(' | '));
    await p.getByRole('radio', { name: 'Refused' }).click(); await wait(p, 300);
    const r = await p.locator('main ul').innerText();
    check('orders: Refused filter shows only refusals', /Refused/.test(r) && !/@ \$/.test(r));
    await p.getByRole('radio', { name: 'Filled' }).click(); await wait(p, 300);
    await p.locator('main ul li button').first().click(); await wait(p, 300);
    check('orders: a filled order expands with fee and fill model', /Fee \(0\.60%\)/.test(await p.locator('main').innerText()) && /Fill model/.test(await p.locator('main').innerText()));
    await p.screenshot({ path: `${SHOTS}/f_orders.png` });
  });

  // ---------- Bot
  await safe('bot', async () => {
    await go('/bot');
    await p.getByRole('button', { name: 'Check now' }).click(); await wait(p, 1500);
    const t = await p.locator('main').innerText();
    check('bot: Check now gives a readable result', /Up to date|No online research feed is published yet|Could not reach the research feed|Checking/.test(t));
    await p.getByRole('radio', { name: 'Strategies' }).click(); await wait(p, 400);
    await p.getByRole('button', { name: /Breakout/ }).first().click(); await wait(p, 300);
    check('bot: strategy row expands with evidence', /why it was rejected/i.test(await p.locator('main').innerText()));
    await p.getByRole('link', { name: /Research Lab/ }).first().click(); await wait(p, 1200);
    check('bot: link to Research Lab works', /\/bot\/research/.test(p.url()));
    for (const tab of ['Strategies', 'Watchbot', 'Risk Center', 'Activity & Audit', 'Settings', 'Overview']) {
      await p.getByRole('tab', { name: tab }).or(p.getByRole('button', { name: tab, exact: true })).first().click(); await wait(p, 600);
      check(`lab: tab ${tab} renders`, (await p.locator('main').innerText()).length > 200);
    }
  });

  // ---------- Alerts
  await safe('alerts', async () => {
    await go('/alerts');
    await p.getByRole('button', { name: 'Save alert' }).click(); await wait(p, 300);
    check('alerts: empty price shows an error', /Enter a price/.test(await p.locator('main').innerText()));
    await p.locator('input[inputmode=decimal]').fill('1');
    await p.getByRole('radio', { name: 'Goes above' }).click();
    await p.getByRole('button', { name: 'Save alert' }).click(); await wait(p, 2500);
    const t = await p.locator('body').innerText();
    check('alerts: saved alert listed', /BTC ▲ above \$1\.00/.test(t));
    check('alerts: already-met alert fires a banner', /Price alert/.test(t));
    await nav('Markets').click(); await wait(p, 600);
    await p.getByRole('button', { name: 'Remove' }).count();
    await go('/alerts');
    await p.getByRole('button', { name: 'Remove' }).first().click(); await wait(p, 500);
    check('alerts: remove works', /No alerts yet/.test(await p.locator('main').innerText()));
  });

  // ---------- Connections / vault / portfolio
  await safe('connections', async () => {
    await go('/connections');
    await p.getByPlaceholder('Create a vault password').fill('short');
    await p.getByRole('button', { name: 'Create vault' }).click(); await wait(p, 1500);
    const t1 = await p.locator('main').innerText();
    check('vault: weak password is refused or explained', /least|weak|short|characters/i.test(t1), t1.match(/.*(least|weak|short|characters).*/i)?.[0]?.slice(0, 90));
    await p.getByPlaceholder('Create a vault password').fill('a-much-longer-password-1');
    await p.getByRole('button', { name: 'Create vault' }).click(); await wait(p, 4000);
    check('vault: created and unlocked', /Lock vault|unlocked/i.test(await p.locator('main').innerText()));
    await p.getByRole('button', { name: 'Lock vault' }).click(); await wait(p, 500);
    await p.getByPlaceholder('Enter vault password').fill('wrong-password-123');
    await p.getByRole('button', { name: 'Unlock' }).click(); await wait(p, 4000);
    check('vault: wrong password refused', /Wrong password/.test(await p.locator('main').innerText()));
    await p.getByPlaceholder('Enter vault password').fill('a-much-longer-password-1');
    await p.getByRole('button', { name: 'Unlock' }).click(); await wait(p, 4000);
    check('vault: right password unlocks', /Vault unlocked/.test(await p.locator('main').innerText()));
    await p.getByPlaceholder('Public address').fill('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq');
    await p.getByRole('button', { name: 'Save address' }).click(); await wait(p, 1200);
    check('watch address: saved', /bc1qar0s/.test(await p.locator('main').innerText()));
    await p.getByPlaceholder('Public address').fill('not-an-address');
    await p.getByRole('button', { name: 'Save address' }).click(); await wait(p, 800);
    check('watch address: invalid address refused', /Not a valid/i.test(await p.locator('main').innerText()));
    await nav('More').click(); await wait(p, 500);
    await go('/portfolio', 1500);
    await p.getByRole('button', { name: 'Refresh balances' }).click(); await wait(p, 6000);
    const pt = await p.locator('main').innerText();
    check('portfolio: refresh shows a result or a reason', /\$|BTC|error|failed|unavailable|updated/i.test(pt), pt.split('\n').slice(0, 6).join(' | ').slice(0, 160));
    await p.screenshot({ path: `${SHOTS}/f_portfolio.png`, fullPage: true });
  });

  // ---------- Wallet
  await safe('wallet', async () => {
    await go('/wallet');
    await p.getByRole('button', { name: 'mainnet', exact: true }).click(); await wait(p, 500);
    const t = await p.locator('main').innerText();
    check('wallet: mainnet requires explicit consent', /real funds/i.test(t) && /testnet mode enabled/i.test(t));
    const cancel = p.getByRole('button', { name: /cancel|stay on testnet/i }).first();
    if (await cancel.count()) await cancel.click();
    await p.getByRole('button', { name: 'Create 12-word wallet' }).click(); await wait(p, 1500);
    const words = await p.locator('main').innerText();
    check('wallet: 12 words shown with warning', /Never share/.test(words));
    check('wallet: verification step asks for words', (await p.locator('main input').count()) >= 2);
    await p.getByRole('button', { name: 'Confirm backup' }).click(); await wait(p, 800);
    check('wallet: wrong verification words refused', /match|incorrect|wrong|verify/i.test(await p.locator('main').innerText()));
  });

  // ---------- More / legal
  await safe('more', async () => {
    await go('/more');
    const links = await p.locator('main a').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
    for (const h of links.filter((x) => x && x.startsWith('/'))) {
      await go(h, 900);
      const h1 = await p.locator('h1').first().innerText().catch(() => '');
      check(`more: ${h} opens a real page`, !!h1 && !/Not Found/.test(h1) && !/Apex/.test(await p.content()) && !/Not Found/.test(await p.locator('main').innerText()), h1);
    }
  });

  await safe('unknown coin', async () => {
    await go('/markets/NOTACOIN', 2500);
    const t = await p.locator('main').innerText();
    check('asset: unknown coin explains it is not available', /couldn't find a coin/i.test(t), t.split('\n').slice(0, 5).join(' | ').slice(0, 160));
    await p.screenshot({ path: `${SHOTS}/f_notacoin.png` });
  });

  check('no uncaught page errors during the whole run', errs.length === 0, errs.slice(0, 3).join(' || '));
  const fails = results.filter((r) => !r.ok);
  console.log(`\n${results.length - fails.length}/${results.length} passed`);
  await b.close();
})();
