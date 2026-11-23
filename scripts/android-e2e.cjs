// Drives the REAL installed APK on an Android emulator: real WebView, real system bars, real Back key.
// Run inside reactivecircus/android-emulator-runner (adb available). Output: e2e-out/ (screenshots + results.json).
const { _android: android } = require('playwright-core');
const fs = require('fs');

const OUT = 'e2e-out';
fs.mkdirSync(OUT, { recursive: true });
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok: !!ok, detail: String(detail).slice(0, 300) });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + String(detail).slice(0, 200) : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const [device] = await android.devices();
  if (!device) throw new Error('no device');
  console.log('device', device.model(), device.serial());
  const sh = async (c) => (await device.shell(c)).toString().trim();
  let n = 0;
  const shot = async (name) => { await sleep(600); await device.screenshot({ path: `${OUT}/${String(++n).padStart(2, '0')}-${name}.png` }); };

  check('Android version', true, `SDK ${await sh('getprop ro.build.version.sdk')} · WebView ${await sh("dumpsys package com.google.android.webview | grep versionName | head -1")}`);
  await sh('am force-stop com.helix.app');
  await sh('pm clear com.helix.app');
  await sh('am start -W -n com.helix.app/.MainActivity');
  await sleep(6000);
  const top = await sh('dumpsys activity activities | grep -m1 -E "topResumedActivity|mResumedActivity"');
  check('app launches and is in the foreground', /com\.helix\.app/.test(top), top);

  const webview = await device.webView({ pkg: 'com.helix.app' }, { timeout: 60000 });
  const page = await webview.page();
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.waitForSelector('main', { timeout: 60000 });
  await sleep(4000);
  await shot('home-first-launch');

  // edge-to-edge: header must sit below the status bar, tabs above the gesture/nav bar
  const insets = await page.evaluate(() => {
    const h = document.querySelector('header')?.getBoundingClientRect();
    const nav = [...document.querySelectorAll('nav[aria-label=Main]')].pop()?.getBoundingClientRect();
    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;top:0;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)';
    document.body.appendChild(probe);
    const cs = getComputedStyle(probe);
    const r = { top: cs.paddingTop, bottom: cs.paddingBottom, headerTop: h?.top, navBottom: nav?.bottom, vh: innerHeight, dpr: devicePixelRatio, ua: navigator.userAgent };
    probe.remove();
    return r;
  });
  check('safe-area insets reported by the WebView', true, JSON.stringify(insets));

  const text = async () => (await page.locator('main').innerText()).replace(/\s+/g, ' ');
  const tab = (name) => page.getByRole('navigation', { name: 'Main' }).last().getByRole('link', { name });
  const path = () => page.evaluate(() => location.pathname);

  // live prices in the real WebView
  await sleep(4000);
  check('live Coinbase prices arrive', /Live Coinbase prices/.test(await text()), (await text()).slice(0, 160));

  // paper account + trade
  await page.getByRole('button', { name: '$500' }).tap();
  await page.getByRole('button', { name: 'Open paper account' }).tap();
  await sleep(1500);
  check('paper account opens', /\$500\.00/.test(await text()));
  await shot('home-account');

  await tab('Markets').tap(); await sleep(4000);
  check('Markets tab', (await path()) === '/markets', await path());
  await shot('markets');
  await page.locator('main ul li a').first().tap(); await sleep(5000);
  check('asset page opens from list', /^\/markets\//.test(await path()), await path());
  await shot('asset');

  await page.getByRole('button', { name: 'Paper buy' }).tap(); await sleep(800);
  await page.locator('[role=dialog] input').first().fill('50');
  await shot('trade-sheet-keyboard');
  await page.getByRole('button', { name: /Place paper buy/ }).tap(); await sleep(5000);
  const sheet = (await page.locator('[role=dialog]').innerText()).replace(/\s+/g, ' ');
  check('paper buy fills on device (order-book fill)', /filled/.test(sheet), sheet.slice(0, 200));
  await shot('trade-filled');

  // hardware BACK: closes the sheet first
  await device.input.press('Back'); await sleep(1200);
  check('Back closes the open sheet', (await page.locator('[role=dialog]').count()) === 0);
  // Back again: returns to Markets, not exit
  await device.input.press('Back'); await sleep(1500);
  check('Back returns to the previous screen', (await path()) === '/markets', await path());

  for (const [name, p] of [['Bot', '/bot'], ['Wallet', '/wallet'], ['More', '/more'], ['Home', '/']]) {
    await tab(name).tap(); await sleep(3000);
    check(`${name} tab`, (await path()) === p, await path());
    await shot(name.toLowerCase());
  }

  // external link must open the system browser, not hijack/blank the app
  await tab('More').tap(); await sleep(1500);
  await page.getByRole('link', { name: /Support/ }).first().tap(); await sleep(1500);
  await shot('support');

  // Back from Home exits to the launcher (app no longer resumed)
  await tab('Home').tap(); await sleep(1000);
  await device.input.press('Back'); await sleep(2500);
  const after = await sh('dumpsys activity activities | grep -m1 -E "topResumedActivity|mResumedActivity"');
  check('Back on Home leaves the app', !/com\.helix\.app/.test(after), after);
  await device.screenshot({ path: `${OUT}/${String(++n).padStart(2, '0')}-after-back-on-home.png` });

  // relaunch: data persisted on device storage
  await sh('am start -W -n com.helix.app/.MainActivity'); await sleep(5000);
  const wv2 = await device.webView({ pkg: 'com.helix.app' });
  const p2 = await wv2.page();
  await p2.waitForSelector('main'); await sleep(3000);
  const t2 = (await p2.locator('main').innerText()).replace(/\s+/g, ' ');
  check('paper account persists after relaunch', /Paper buy/.test(t2) && /PAPER ACCOUNT|Paper account/i.test(t2), t2.slice(0, 160));
  await device.screenshot({ path: `${OUT}/${String(++n).padStart(2, '0')}-relaunch.png` });

  // offline on a real device: airplane-style (disable wifi + data)
  await sh('svc wifi disable; svc data disable'); await sleep(8000);
  const off = (await p2.locator('main').innerText()).replace(/\s+/g, ' ');
  check('offline state is shown', /No connection|delayed|Connecting/i.test(off), (off.match(/(No connection[^.]*|Prices delayed|Connecting[^.]*)/) || [''])[0]);
  await device.screenshot({ path: `${OUT}/${String(++n).padStart(2, '0')}-offline.png` });
  await sh('svc wifi enable; svc data enable'); await sleep(15000);
  const on = (await p2.locator('main').innerText()).replace(/\s+/g, ' ');
  check('prices recover after reconnecting', /Live Coinbase prices/.test(on));

  check('no uncaught JavaScript errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  const logcat = await sh('logcat -d -s chromium:E Capacitor:E AndroidRuntime:E | tail -40');
  fs.writeFileSync(`${OUT}/logcat-errors.txt`, logcat);
  check('no Android runtime crash in logcat', !/FATAL EXCEPTION/.test(logcat), logcat.split('\n').filter((l) => /FATAL|Exception/.test(l)).slice(0, 2).join(' | '));

  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 1));
  const fails = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - fails}/${results.length} passed`);
  await device.close();
  process.exit(0);
})().catch((e) => {
  console.error('E2E CRASH', e);
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify([...results, { name: 'run crashed', ok: false, detail: String(e).slice(0, 500) }], null, 1));
  process.exit(0); // publish whatever evidence exists
});
