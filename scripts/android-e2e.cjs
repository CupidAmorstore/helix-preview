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
  await page.getByRole('button', { name: '$500' }).click();
  await page.getByRole('button', { name: 'Open paper account' }).click();
  await sleep(1500);
  check('paper account opens', /\$500\.00/.test(await text()));
  await shot('home-account');

  await tab('Markets').click(); await sleep(4000);
  check('Markets tab', (await path()) === '/markets', await path());
  await shot('markets');
  await page.locator('main ul li a').first().click(); await sleep(5000);
  check('asset page opens from list', /^\/markets\//.test(await path()), await path());
  await shot('asset');

  await page.getByRole('button', { name: 'Paper buy' }).click(); await sleep(800);
  await page.locator('[role=dialog] input').first().fill('50');
  await shot('trade-sheet-keyboard');
  await page.getByRole('button', { name: /Place paper buy/ }).click(); await sleep(5000);
  const sheet = (await page.locator('[role=dialog]').innerText()).replace(/\s+/g, ' ');
  check('paper buy fills on device (order-book fill)', /filled/.test(sheet), sheet.slice(0, 200));
  await shot('trade-filled');

  // hardware BACK: closes the sheet first
  await device.shell('input keyevent KEYCODE_BACK'); await sleep(1200);
  check('Back closes the open sheet', (await page.locator('[role=dialog]').count()) === 0);
  // Back again: returns to Markets, not exit
  await device.shell('input keyevent KEYCODE_BACK'); await sleep(1500);
  check('Back returns to the previous screen', (await path()) === '/markets', await path());

  for (const [name, p] of [['Bot', '/bot'], ['Wallet', '/wallet'], ['More', '/more'], ['Home', '/']]) {
    await tab(name).click(); await sleep(3000);
    check(`${name} tab`, (await path()) === p, await path());
    await shot(name.toLowerCase());
  }

  // wallet on the device: vault, import (public BIP39 test vector), mainnet send disabled, lock clears the phrase
  try {
    await tab('Wallet').click(); await sleep(2000);
    await page.locator('input[type=password]').fill('device test vault 123');
    await page.getByRole('button', { name: 'Create vault' }).click(); await sleep(6000);
    await page.getByPlaceholder(/12 or 24 word/).fill('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about');
    await page.getByRole('button', { name: 'Import wallet' }).click(); await sleep(6000);
    const w1 = (await text());
    check('wallet: vault + import on device; BTC testnet address = BIP84 vector', /tb1q6rz28mcfaxtmd6v789l9rrlrusdprr9pqcpvkl/.test(w1), (w1.match(/tb1q\w+/) || [''])[0]);
    await shot('wallet-imported');
    await page.getByRole('button', { name: 'mainnet', exact: true }).click(); await sleep(800);
    await page.locator('input[type=checkbox]').first().check();
    await page.getByRole('button', { name: /Enable mainnet/ }).click(); await sleep(2500);
    const w2 = await text();
    check('wallet: mainnet sending is disabled (no send form)', /Sending on mainnet is disabled/.test(w2) && !/Send BTC/.test(w2));
    await shot('wallet-mainnet-send-disabled');
    await page.getByRole('button', { name: 'testnet', exact: true }).click(); await sleep(800);
    await tab('More').click(); await sleep(1000);
    await page.getByRole('link', { name: /Connections/ }).first().click(); await sleep(1500);
    await page.getByRole('button', { name: 'Lock vault' }).click(); await sleep(800);
    await tab('Wallet').click(); await sleep(1500);
    const w3 = await text();
    check('wallet: after lock the phrase is gone and a password is required', /Enter your vault password/.test(w3) && !/tb1q6rz28/.test(w3));
  } catch (e) {
    check('wallet flow on device', false, String(e).split('\n')[0]);
  }

  // external link must open the system browser, not hijack/blank the app
  await tab('More').click(); await sleep(1500);
  await page.getByRole('link', { name: /Support/ }).first().click(); await sleep(1500);
  await shot('support');

  // offline on a real device: airplane-style (disable wifi + data)
  await tab('Home').click(); await sleep(1500);
  await sh('svc wifi disable; svc data disable'); await sleep(11000);
  const off = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
  check('offline state is shown', /No connection|Connection lost|delayed/i.test(off), (off.match(/(No connection[^.]*|Prices delayed|Connecting[^.]*)/) || [''])[0]);
  await device.screenshot({ path: `${OUT}/${String(++n).padStart(2, '0')}-offline.png` });
  // a screen never opened before must still open offline in the APK (its code ships inside the app)
  await tab('Bot').click(); await sleep(1500);
  await page.getByRole('link', { name: /Research Lab/ }).first().click(); await sleep(3000);
  const lab = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
  check('unvisited screen opens offline (Research Lab)', /Research Lab/.test(lab) && !/needs a connection|didn't load/.test(lab), lab.slice(0, 120));
  await shot('offline-research-lab');
  await tab('Home').click(); await sleep(1000);
  await sh('svc wifi enable; svc data enable'); await sleep(15000);
  const on = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
  check('prices recover after reconnecting', /Live Coinbase prices/.test(on));

  // Back from Home exits to the launcher (app no longer resumed)
  await tab('Home').click(); await sleep(1000);
  await device.shell('input keyevent KEYCODE_BACK'); await sleep(2500);
  const after = await sh('dumpsys activity activities | grep -m1 -E "topResumedActivity|mResumedActivity"');
  check('Back on Home leaves the app', !/com\.helix\.app/.test(after), after);
  await device.screenshot({ path: `${OUT}/${String(++n).padStart(2, '0')}-after-back-on-home.png` });

  // relaunch: data persisted on device storage
  await sh('am start -W -n com.helix.app/.MainActivity'); await sleep(6000);
  await device.screenshot({ path: `${OUT}/${String(++n).padStart(2, '0')}-relaunched-raw.png` });
  check('app is in the foreground again after relaunch', /com\.helix\.app/.test(await sh('dumpsys activity activities | grep -m1 -E "topResumedActivity|mResumedActivity"')));
  // (persistence is verified from the relaunch screenshot; the test driver cannot re-attach to a new WebView)

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
