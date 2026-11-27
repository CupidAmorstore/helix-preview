// HELIX product-integrity audit crawler (2026-11-25).
// Inventories every route: screenshots, every visible text element, every interactive element; then activates
// EACH element in a fresh, disposable browser context (no shared state, nothing can reach a real account) and
// records what happened. Automated activation is NOT workflow verification; outcomes are reviewed by hand in
// 04_CLICK_BY_CLICK_AUDIT.md.
// usage: node interaction-audit.cjs <baseUrl> <outDir> <axe.min.js>
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const [B, OUT, AXE] = process.argv.slice(2);
fs.mkdirSync(path.join(OUT, 'screens'), { recursive: true });
const axeSrc = AXE && fs.existsSync(AXE) ? fs.readFileSync(AXE, 'utf8') : null;

// Every route in src/App.tsx, every tab exposed by ?tab=, representative asset pages, unknown route.
const ROUTES = [
  ['home', '/'], ['markets', '/markets'], ['asset-btc', '/markets/BTC'], ['asset-usdc', '/markets/USDC'], ['asset-unknown', '/markets/NOTACOIN'],
  ['bot-overview', '/bot'], ['bot-strategies', '/bot?tab=strategies'], ['bot-activity', '/bot?tab=activity'],
  ['lab-overview', '/bot/research?tab=overview'], ['lab-strategies', '/bot/research?tab=strategies'], ['lab-lab', '/bot/research?tab=lab'],
  ['lab-watchbot', '/bot/research?tab=watchbot'], ['lab-risk', '/bot/research?tab=risk'], ['lab-activity', '/bot/research?tab=activity'], ['lab-settings', '/bot/research?tab=settings'],
  ['portfolio', '/portfolio'], ['more', '/more'], ['connections', '/connections'], ['alerts', '/alerts'], ['orders', '/orders'],
  ['wallet', '/wallet'], ['access', '/access'], ['support', '/support'], ['privacy', '/privacy'], ['terms', '/terms'], ['notfound', '/does-not-exist']
];
const STATES = ['fresh', 'account']; // fresh install vs. existing paper account
// account state only changes these screens (paper account UI); others are identical and crawled once
const ACCOUNT_ROUTES = new Set(['home', 'asset-btc', 'orders', 'bot-overview', 'bot-activity', 'portfolio']);
// de-duplication: global chrome is activated once; repeated list rows (same href pattern / same label pattern) after 3
const seenGlobal = new Map();
const patternCount = new Map();
const patternOf = (el) => el.href ? el.href.replace(/\/markets\/[^/?#]+/, '/markets/:sym').replace(/[0-9]+/g, '#') : (el.name.length > 40 ? el.tag + ':' + el.name.replace(/[0-9.,$%+\-−]+/g, '#').slice(0, 24) : '');

const INTERACTIVE = 'a[href], button, input, select, textarea, summary, [role="button"], [role="tab"], [role="switch"], [role="checkbox"], [role="link"], [tabindex]:not([tabindex="-1"])';

async function newPage(b, state, vp = { width: 412, height: 915 }) {
  const ctx = await b.newContext({ viewport: vp, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const sink = [];
  p.on('pageerror', (e) => sink.push({ kind: 'pageerror', msg: String(e).slice(0, 240) }));
  p.on('console', (m) => m.type() === 'error' && sink.push({ kind: 'console', msg: m.text().slice(0, 240) }));
  p.on('response', (r) => r.status() >= 400 && sink.push({ kind: 'http', msg: `${r.status()} ${r.url().slice(0, 120)}` }));
  if (state === 'account') {
    await p.goto(B + '/', { waitUntil: 'load' });
    await p.waitForTimeout(1200);
    await p.getByRole('button', { name: '$1,000' }).click().catch(() => {});
    await p.getByRole('button', { name: 'Open paper account' }).click().catch(() => {});
    await p.waitForTimeout(800);
  }
  return { ctx, p, sink };
}

async function inventory(p) {
  return p.evaluate((SEL) => {
    const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
    const name = (el) => (el.getAttribute('aria-label') || el.innerText || el.value || el.getAttribute('placeholder') || el.getAttribute('title') || '').replace(/\s+/g, ' ').trim().slice(0, 90);
    const els = [...document.querySelectorAll(SEL)].filter(vis).filter((el) => !el.closest('[aria-hidden="true"]'));
    const inter = els.map((el, i) => {
      const r = el.getBoundingClientRect();
      return { idx: i, tag: el.tagName.toLowerCase(), role: el.getAttribute('role') || '', type: el.getAttribute('type') || '', name: name(el), href: el.getAttribute('href') || '',
        disabled: !!(el.disabled || el.getAttribute('aria-disabled') === 'true'), x: Math.round(r.x), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height),
        inNav: !!el.closest('nav'), hasName: !!name(el) };
    });
    // text elements: leaf-ish nodes with own text
    const texts = [];
    const walker = document.createTreeWalker(document.querySelector('#root') || document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set();
    while (walker.nextNode()) {
      const t = walker.currentNode.textContent.replace(/\s+/g, ' ').trim();
      const el = walker.currentNode.parentElement;
      if (!t || !el || !vis(el) || seen.has(el)) continue;
      seen.add(el);
      const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ').replace(/\s+/g, ' ').trim();
      if (own) texts.push({ text: own.slice(0, 400), tag: el.tagName.toLowerCase(), y: Math.round(el.getBoundingClientRect().y + scrollY) });
    }
    // layout checks
    const header = document.querySelector('header');
    const nav = [...document.querySelectorAll('nav')].find((n) => getComputedStyle(n).position === 'fixed');
    const h1 = document.querySelector('main h1, h1');
    const hb = header && getComputedStyle(header).position.match(/fixed|sticky/) ? header.getBoundingClientRect().bottom : 0;
    const main = document.querySelector('main');
    return {
      title: h1?.textContent?.trim() ?? null,
      inter, texts,
      layout: {
        scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth,
        scrollHeight: document.documentElement.scrollHeight, viewport: innerHeight,
        headerBottom: Math.round(hb), h1Top: h1 ? Math.round(h1.getBoundingClientRect().top) : null,
        navTop: nav ? Math.round(nav.getBoundingClientRect().top) : null,
        mainPaddingBottom: main ? getComputedStyle(main).paddingBottom : null,
        firstContentTop: main ? Math.round(main.getBoundingClientRect().top) : null
      }
    };
  }, INTERACTIVE);
}

(async () => {
  const b = await chromium.launch();
  const registry = [];
  const pages = [];
  const textReg = [];
  let id = 0;
  for (const state of STATES) {
    for (const [key, route] of ROUTES) {
      if (state === 'account' && !ACCOUNT_ROUTES.has(key)) continue;
      const { ctx, p, sink } = await newPage(b, state);
      const t0 = Date.now();
      await p.goto(B + route, { waitUntil: 'load' }).catch(() => {});
      await p.waitForTimeout(2200);
      const loadMs = Date.now() - t0;
      const inv = await inventory(p);
      await p.screenshot({ path: path.join(OUT, 'screens', `${state}-${key}.png`), fullPage: true });
      let axe = null;
      if (axeSrc) {
        await p.addScriptTag({ content: axeSrc });
        axe = await p.evaluate(async () => {
          const r = await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] });
          return r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help }));
        });
      }
      // font scaling (Android text zoom approximated by root font-size; Tailwind sizes are rem-based)
      const scale = {};
      for (const pct of [130, 200]) {
        scale[pct] = await p.evaluate((x) => { document.documentElement.style.fontSize = x + '%'; const r = { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }; document.documentElement.style.fontSize = ''; return r; }, pct);
      }
      pages.push({ state, key, route, url: p.url(), loadMs, title: inv.title, layout: inv.layout, axe, fontScale: scale, errorsOnLoad: sink.slice(), interactiveCount: inv.inter.length, textCount: inv.texts.length });
      for (const t of inv.texts) textReg.push({ state, route, ...t });
      await ctx.close();

      // activate each interactive element in its own fresh context
      for (const el of inv.inter) {
        const iid = `I-${String(++id).padStart(4, '0')}`;
        const rec = { id: iid, state, route, ...el, outcome: null, afterUrl: null, dialog: false, textDelta: 0, errors: [], closes: null };
        if (el.disabled) { rec.outcome = 'DISABLED'; registry.push(rec); continue; }
        const gkey = (el.inNav || el.y < 70) ? `${el.tag}|${el.name}|${el.href}` : null;
        if (gkey && seenGlobal.has(gkey)) { rec.outcome = 'SAME_AS'; rec.sameAs = seenGlobal.get(gkey); registry.push(rec); continue; }
        if (gkey) seenGlobal.set(gkey, iid);
        const pat = patternOf(el);
        if (pat) {
          const k = route + '|' + state + '|' + pat;
          const n = patternCount.get(k) || { n: 0, first: iid };
          n.n++; patternCount.set(k, n);
          if (n.n > 3) { rec.outcome = 'SAME_AS'; rec.sameAs = n.first + ' (pattern ' + pat + ')'; registry.push(rec); continue; }
        }
        const { ctx: c2, p: q, sink: s2 } = await newPage(b, state);
        try {
          await q.goto(B + route, { waitUntil: 'load' });
          await q.waitForTimeout(1200);
          const before = await q.evaluate(() => document.body.innerText.length);
          const beforeUrl = q.url();
          const handle = (await q.$$(INTERACTIVE)).length;
          // locate the same element again by index among visible interactive elements
          const target = await q.evaluateHandle(({ SEL, idx }) => {
            const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
            return [...document.querySelectorAll(SEL)].filter(vis).filter((e) => !e.closest('[aria-hidden="true"]'))[idx] || null;
          }, { SEL: INTERACTIVE, idx: el.idx });
          void handle;
          const isEl = await target.evaluate((e) => !!e).catch(() => false);
          if (!isEl) { rec.outcome = 'NOT_FOUND_ON_RELOAD'; }
          else if (['input', 'textarea', 'select'].includes(el.tag) && !['checkbox', 'radio', 'button', 'submit'].includes(el.type)) {
            await target.asElement().fill(el.type === 'number' ? '-5' : '<x>%%invalid').catch(() => {});
            await q.waitForTimeout(400);
            rec.outcome = 'INPUT_ACCEPTS_TEXT';
            rec.invalidInputFeedback = await q.evaluate(() => [...document.querySelectorAll('[role="alert"], .text-rose-400, .text-down')].map((e) => e.textContent.trim()).filter(Boolean).slice(0, 3));
          } else {
            await target.asElement().click({ timeout: 3000 }).catch((e) => { rec.errors.push({ kind: 'click', msg: String(e).slice(0, 160) }); });
            await q.waitForTimeout(900);
            rec.afterUrl = q.url();
            rec.dialog = await q.evaluate(() => !!document.querySelector('[role="dialog"]'));
            rec.textDelta = (await q.evaluate(() => document.body.innerText.length)) - before;
            if (rec.afterUrl !== beforeUrl) rec.outcome = rec.afterUrl.startsWith(B) ? 'NAVIGATES' : 'EXTERNAL_LINK';
            else if (rec.dialog) rec.outcome = 'OPENS_DIALOG';
            else if (rec.textDelta !== 0) rec.outcome = 'CHANGES_CONTENT';
            else rec.outcome = 'NO_VISIBLE_EFFECT';
            if (rec.dialog) {
              await q.screenshot({ path: path.join(OUT, 'screens', `dialog-${iid}.png`) });
              await q.keyboard.press('Escape');
              await q.waitForTimeout(400);
              const escClosed = !(await q.evaluate(() => !!document.querySelector('[role="dialog"]')));
              let backClosed = null;
              if (!escClosed) { await q.goBack().catch(() => {}); await q.waitForTimeout(500); backClosed = !(await q.evaluate(() => !!document.querySelector('[role="dialog"]'))); }
              rec.closes = { escape: escClosed, back: backClosed };
            }
            // rapid repeated activation (only for same-page effects)
            if (rec.outcome === 'CHANGES_CONTENT' || rec.outcome === 'NO_VISIBLE_EFFECT') {
              const again = await q.evaluateHandle(({ SEL, idx }) => [...document.querySelectorAll(SEL)][idx] || null, { SEL: INTERACTIVE, idx: el.idx });
              for (let k = 0; k < 5; k++) await again.asElement()?.click({ timeout: 800 }).catch(() => {});
              await q.waitForTimeout(400);
            }
          }
        } catch (e) { rec.errors.push({ kind: 'harness', msg: String(e).slice(0, 160) }); rec.outcome = rec.outcome || 'HARNESS_ERROR'; }
        rec.errors.push(...s2.filter((x) => x.kind !== 'http' || !/coingecko|429/.test(x.msg)));
        registry.push(rec);
        await c2.close();
      }
      fs.appendFileSync(path.join(OUT, 'progress.log'), `${new Date().toISOString()} ${state}:${key} elements=${inv.inter.length} registry=${registry.length}\n`);
    }
  }
  // small-screen overflow sweep
  const small = [];
  for (const vp of [{ width: 320, height: 640 }, { width: 360, height: 740 }, { width: 768, height: 1024 }]) {
    for (const [key, route] of ROUTES) {
      const { ctx, p } = await newPage(b, 'fresh', vp);
      await p.goto(B + route, { waitUntil: 'load' }).catch(() => {});
      await p.waitForTimeout(1200);
      small.push({ vp: `${vp.width}x${vp.height}`, key, ...(await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))) });
      await ctx.close();
    }
  }
  await b.close();
  fs.writeFileSync(path.join(OUT, 'interaction-registry.json'), JSON.stringify(registry, null, 1));
  fs.writeFileSync(path.join(OUT, 'pages.json'), JSON.stringify(pages, null, 1));
  fs.writeFileSync(path.join(OUT, 'text-registry.json'), JSON.stringify(textReg, null, 1));
  fs.writeFileSync(path.join(OUT, 'viewport-sweep.json'), JSON.stringify(small, null, 1));
  const by = registry.reduce((m, r) => ((m[r.outcome] = (m[r.outcome] || 0) + 1), m), {});
  console.log('\n', JSON.stringify({ pages: pages.length, interactions: registry.length, texts: textReg.length, outcomes: by }));
})();
