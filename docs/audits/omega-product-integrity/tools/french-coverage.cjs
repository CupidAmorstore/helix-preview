// Measures how much visible text is translated in French mode: renders every route in English and in French and
// compares text nodes (words only; numbers, symbols, tickers and proper names excluded).
// usage: node french-coverage.cjs <baseUrl> <out.json>
const { chromium } = require('playwright');
const fs = require('fs');
const [B, OUT] = process.argv.slice(2);
const ROUTES = ['/', '/markets', '/markets/BTC', '/bot', '/bot?tab=strategies', '/bot?tab=activity', '/bot/research', '/wallet', '/more', '/orders', '/portfolio', '/alerts', '/connections', '/access', '/support', '/privacy', '/terms'];
const KEEP = /^(HELIX|Coinbase|CoinGecko|Kraken|Gemini|Bitcoin|Ethereum|Solana|TradingView|GitHub|BTC|ETH|SOL|USD|CSV|API|English|Français)$/;
const words = (t) => t.replace(/[0-9$%.,:;·•▲▼+−\-–—()×/|@#*!?'’"“”«»…]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !KEEP.test(w));
async function texts(lang, route, b) {
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, locale: lang === 'fr' ? 'fr-CA' : 'en-US' });
  await ctx.addInitScript((l) => { try { localStorage.setItem('helix.lang', l); } catch { /* */ } }, lang);
  const p = await ctx.newPage();
  await p.goto(B + route, { waitUntil: 'load' });
  await p.waitForTimeout(2200);
  const t = await p.evaluate(() => {
    const out = [];
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) { const s = w.currentNode.textContent.trim(); if (s) out.push(s); }
    return out;
  });
  await ctx.close();
  return t;
}
(async () => {
  const b = await chromium.launch();
  const rows = [];
  for (const r of ROUTES) {
    const en = await texts('en', r, b);
    const fr = await texts('fr', r, b);
    const enSet = new Set(en);
    const frWords = fr.flatMap(words);
    const unchanged = fr.filter((s) => enSet.has(s) && words(s).length > 0);
    const untranslatedWords = unchanged.flatMap(words).length;
    rows.push({ route: r, frWords: frWords.length, untranslatedWords, translatedShare: frWords.length ? +(1 - untranslatedWords / frWords.length).toFixed(3) : 1, sampleUntranslated: unchanged.slice(0, 5) });
  }
  await b.close();
  const tot = rows.reduce((a, x) => ({ w: a.w + x.frWords, u: a.u + x.untranslatedWords }), { w: 0, u: 0 });
  const out = { overallTranslatedShare: +(1 - tot.u / tot.w).toFixed(3), rows };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  console.log(JSON.stringify({ overall: out.overallTranslatedShare, rows: rows.map((x) => [x.route, x.translatedShare]) }));
})();
