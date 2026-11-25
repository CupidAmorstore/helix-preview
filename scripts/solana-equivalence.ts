// Section 5 evidence: HELIX's Solana helpers (src/services/solana.ts, @noble/curves + @scure/base) versus the
// removed @solana/web3.js, run in an ISOLATED directory (web3.js is never added back to the app).
//   npm i --prefix <scratch>/solcmp @solana/web3.js@1.98.4
//   npx vite-node --config scripts/vite.node.config.ts scripts/solana-equivalence.ts <scratch>/solcmp
// Writes research/audit/solana-equivalence.json. Disposable random seeds only; no funded keys.
import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { checkSolanaAddress, solKeypairFromSeed } from '../src/services/solana';
import { base58 } from '@scure/base';

const dir = process.argv[2];
if (!dir) throw new Error('usage: solana-equivalence.ts <dir with @solana/web3.js installed>');
const req = createRequire(`${dir}/package.json`);
const web3 = req('@solana/web3.js');
const hex = (b: Uint8Array) => Buffer.from(b).toString('hex');
const fromHex = (h: string) => Uint8Array.from(Buffer.from(h, 'hex'));
const out: Record<string, unknown> = { web3Version: req('@solana/web3.js/package.json').version, ranAt: new Date().toISOString() };

// 1. RFC 8032 §7.1 published Ed25519 vectors (secret seed → public key)
const rfc = [
  ['9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60', 'd75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a'],
  ['4ccd089b28ff96da9db6c346ec114e0f5b8a319f35aba624da8cf6ed4fb8a6fb', '3d4017c3e843895a92b70aa74d1b7ebc9c982ccf2ec4968cc0cd55f12af4660c'],
  ['c5aa8df43f9f837bedb7442f31dcb7b166d38535076f094b85ce3a2e0b4458f7', 'fc51cd8e6218a1a38da47ed00230f0580816ed13ba3303ac5deb911548908025']
];
out.rfc8032 = rfc.map(([s, p]) => ({ ok: hex(solKeypairFromSeed(fromHex(s)).publicKey) === p }));

// 2. 5,000 disposable random seeds: public key, base58 address and 64-byte secret key identical to web3.js
let mismatches = 0;
for (let i = 0; i < 5000; i++) {
  const seed = new Uint8Array(randomBytes(32));
  const mine = solKeypairFromSeed(seed);
  const ref = web3.Keypair.fromSeed(seed);
  if (mine.address !== ref.publicKey.toBase58() || hex(mine.secretKey) !== hex(ref.secretKey) || hex(mine.publicKey) !== hex(ref.publicKey.toBytes())) mismatches++;
}
out.randomSeeds = { n: 5000, mismatches };

// 3. invalid seed lengths are refused (web3.js also throws)
out.invalidSeedLengths = [0, 31, 33, 64].map((n) => {
  let mineThrows = false, refThrows = false;
  try { solKeypairFromSeed(new Uint8Array(n)); } catch { mineThrows = true; }
  try { web3.Keypair.fromSeed(new Uint8Array(n)); } catch { refThrows = true; }
  return { length: n, mineThrows, refThrows };
});

// 4. address classification vs web3.js PublicKey / isOnCurve
const smallOrder = {
  identity: '0100000000000000000000000000000000000000000000000000000000000000',
  order2: 'ecffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff7f',
  order4: '0000000000000000000000000000000000000000000000000000000000000000'
};
const cases: { label: string; addr: string }[] = [
  { label: 'system program (off-curve? no: all-zero is small-order point)', addr: '11111111111111111111111111111111' },
  { label: 'random wallet', addr: solKeypairFromSeed(new Uint8Array(randomBytes(32))).address },
  { label: 'PDA (off-curve)', addr: web3.PublicKey.findProgramAddressSync([Buffer.from('helix')], new web3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'))[0].toBase58() },
  ...Object.entries(smallOrder).map(([k, h]) => ({ label: `small-order ${k}`, addr: base58.encode(fromHex(h)) })),
  { label: '31 bytes', addr: base58.encode(new Uint8Array(31).fill(7)) },
  { label: 'invalid base58 (0/O/I/l)', addr: '0OIl' + '1'.repeat(40) },
  { label: 'empty', addr: '' },
  { label: 'whitespace-padded wallet', addr: `  ${solKeypairFromSeed(new Uint8Array(32).fill(3)).address}  ` }
];
out.addresses = cases.map(({ label, addr }) => {
  let refValid = true, refOnCurve: boolean | null = null;
  try { const pk = new web3.PublicKey(addr.trim()); refOnCurve = web3.PublicKey.isOnCurve(pk.toBytes()); } catch { refValid = false; }
  const mine = checkSolanaAddress(addr);
  const refClass = !refValid ? 'invalid' : refOnCurve ? 'ok' : 'off-curve';
  return { label, mine, web3: refClass, agree: mine === refClass };
});
out.allAgree = (out.rfc8032 as { ok: boolean }[]).every((x) => x.ok) && mismatches === 0 &&
  (out.invalidSeedLengths as { mineThrows: boolean; refThrows: boolean }[]).every((x) => x.mineThrows && x.refThrows) &&
  (out.addresses as { agree: boolean }[]).every((x) => x.agree);
mkdirSync('research/audit', { recursive: true });
writeFileSync('research/audit/solana-equivalence.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
