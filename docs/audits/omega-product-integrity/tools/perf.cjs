// Cold-load performance per main route with a throttled mid-range phone profile (CDP CPU x4, ~1.6 Mbps, 150 ms RTT).
const { chromium } = require('playwright');
const fs = require('fs');
const [B, OUT] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch();
  const rows = [];
  for (const route of ['/', '/markets', '/markets/BTC', '/bot', '/bot/research', '/wallet']) {
    const ctx = await b.newContext({ viewport: { width: 412, height: 915 } });
    const p = await ctx.newPage();
    const cdp = await ctx.newCDPSession(p);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 90000 });
    const t0 = Date.now();
    await p.goto(B + route, { waitUntil: 'load' });
    const loadMs = Date.now() - t0;
    await p.waitForTimeout(3000);
    const m = await p.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      const fcp = performance.getEntriesByName('first-contentful-paint')[0];
      const res = performance.getEntriesByType('resource');
      return { domContentLoaded: Math.round(nav.domContentLoadedEventEnd), fcp: fcp ? Math.round(fcp.startTime) : null,
        jsKB: Math.round(res.filter((r) => r.name.endsWith('.js')).reduce((s, r) => s + (r.transferSize || 0), 0) / 1024),
        requests: res.length, heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null };
    });
    rows.push({ route, loadMs, ...m });
    await ctx.close();
  }
  await b.close();
  fs.writeFileSync(OUT, JSON.stringify(rows, null, 1));
  console.log(JSON.stringify(rows));
})();
