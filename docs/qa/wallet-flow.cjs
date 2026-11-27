const { chromium } = require('playwright');
const B = process.argv[2]; const OUT = process.argv[3];
const TV = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const ok = (n, c, d = '') => console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`);
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });
  let p = await ctx.newPage(); const w = (ms) => p.waitForTimeout(ms);
  await p.goto(B + '/wallet'); await w(2500);
  ok('new user sees vault creation on the Wallet screen', /Create a vault password to create or import/.test(await p.locator('main').innerText()));
  await p.locator('input[type=password]').fill('short');
  await p.getByRole('button', { name: 'Create vault' }).click(); await w(500);
  ok('short vault password refused inline', /at least 10/i.test(await p.locator('main').innerText()));
  await p.locator('input[type=password]').fill('correct horse battery');
  await p.getByRole('button', { name: 'Create vault' }).click(); await w(4000);
  await p.getByPlaceholder(/12 or 24 word/).fill(TV);
  await p.getByRole('button', { name: 'Import wallet' }).click(); await w(5000);
  ok('import works without leaving the Wallet screen', /Wallet imported/.test(await p.locator('main').innerText()));
  await p.close();
  p = await ctx.newPage(); // app restart
  await p.goto(B + '/wallet'); await w(2500);
  const t1 = await p.locator('main').innerText();
  ok('returning user: password box shown on the Wallet screen', /Enter your vault password to open your wallet/.test(t1));
  ok('returning user: Open wallet disabled until unlocked', await p.getByRole('button', { name: 'Open wallet' }).isDisabled());
  await p.locator('input[type=password]').fill('wrong password here');
  await p.getByRole('button', { name: 'Unlock' }).click(); await w(4000);
  ok('wrong password refused', /Wrong password/.test(await p.locator('main').innerText()));
  await p.locator('input[type=password]').fill('correct horse battery');
  await p.getByRole('button', { name: 'Unlock' }).click(); await w(4000);
  await p.getByRole('button', { name: 'Open wallet' }).click(); await w(5000);
  const t2 = await p.locator('main').innerText();
  ok('wallet opens; BTC testnet address matches BIP84 test vector', /tb1q6rz28mcfaxtmd6v789l9rrlrusdprr9pqcpvkl/.test(t2));
  await p.screenshot({ path: OUT + '/wf_open.png' });
  // lock from Connections then come back: phrase must be gone
  await p.getByRole('navigation', { name: 'Main' }).last().getByRole('link', { name: 'More' }).click(); await w(600);
  await p.getByRole('link', { name: /Connections/ }).first().click(); await w(1200);
  await p.getByRole('button', { name: 'Lock vault' }).click(); await w(500);
  await p.goBack(); await p.goBack(); await w(1500);
  const t3 = await p.locator('main').innerText();
  ok('after locking, wallet is closed again (phrase cleared)', /Enter your vault password/.test(t3) && (await p.getByRole('button', { name: 'Open wallet' }).isDisabled()));
  // delete needs typed confirmation
  await p.getByText('Delete wallet from this phone…').click(); await w(300);
  ok('delete button disabled until DELETE is typed', await p.getByRole('button', { name: 'Delete wallet' }).isDisabled());
  await p.getByLabel('Type DELETE to confirm').fill('DELETE');
  await p.getByRole('button', { name: 'Delete wallet' }).click(); await w(800);
  ok('delete works after confirmation', /Wallet deleted from this phone/.test(await p.locator('main').innerText()));
  await b.close();
})();
