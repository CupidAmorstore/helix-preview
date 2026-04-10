import { useEffect, useMemo, useState } from 'react';
import { getKeystore, saveKeystore, deleteKeystore, getSetting } from '../services/storage';
import { useVault } from '../services/vault';
import { buildAndSignBtcTx, broadcastBtcTx, deriveAddresses, generateMnemonic, sendEthTransaction, sendSolTransaction, validateMnemonic } from '../services/wallet';
import type { KeystoreRecord, WalletNetwork } from '../types';

export default function WalletPage() {
  const vault = useVault();
  const [keystore, setKeystore] = useState<KeystoreRecord | null>(null);
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [network, setNetwork] = useState<WalletNetwork>('testnet');
  const [mainnetConsent, setMainnetConsent] = useState(false);
  const [showMainnetGate, setShowMainnetGate] = useState(false);
  const [status, setStatus] = useState('');
  const [createMnemonic, setCreateMnemonic] = useState('');
  const [verifyIndexes, setVerifyIndexes] = useState<number[]>([]);
  const [verifyInput, setVerifyInput] = useState<Record<number, string>>({});

  const [btcTo, setBtcTo] = useState('');
  const [btcAmount, setBtcAmount] = useState('');
  const [btcFeeRate, setBtcFeeRate] = useState('5');
  const [btcTxid, setBtcTxid] = useState('');

  const [ethTo, setEthTo] = useState('');
  const [ethAmount, setEthAmount] = useState('');
  const [ethRpc, setEthRpc] = useState('https://ethereum-sepolia.publicnode.com');
  const [ethTxid, setEthTxid] = useState('');

  const [solTo, setSolTo] = useState('');
  const [solAmount, setSolAmount] = useState('');
  const [solRpc, setSolRpc] = useState('https://api.devnet.solana.com');
  const [solTxid, setSolTxid] = useState('');

  const [addresses, setAddresses] = useState<{ btc?: string; eth?: string; sol?: string }>({});

  useEffect(() => {
    getKeystore().then(setKeystore);
  }, []);

  useEffect(() => {
    if (!mnemonic) return;
    deriveAddresses(mnemonic, network).then((data) => {
      setAddresses({
        btc: data.btc.address,
        eth: data.eth.address,
        sol: data.sol.address
      });
    });
  }, [mnemonic, network]);

  useEffect(() => {
    if (vault.locked) return;
    getSetting<any>('eth_rpc').then((val) => {
      if (!val) return;
      vault.decrypt(val).then(setEthRpc).catch(() => undefined);
    });
    getSetting<any>('sol_rpc').then((val) => {
      if (!val) return;
      vault.decrypt(val).then(setSolRpc).catch(() => undefined);
    });
  }, [vault]);

  const unlockWallet = async () => {
    if (!keystore) return;
    if (vault.locked) {
      setStatus('Unlock the vault first.');
      return;
    }
    try {
      const decrypted = await vault.decrypt(keystore.payload);
      setMnemonic(decrypted);
      setStatus('Wallet unlocked in-memory.');
    } catch {
      setStatus('Failed to decrypt wallet.');
    }
  };

  const startCreate = async (words: 12 | 24) => {
    const created = await generateMnemonic(words);
    setCreateMnemonic(created);
    const idx = new Set<number>();
    while (idx.size < 4) {
      idx.add(Math.floor(Math.random() * words));
    }
    setVerifyIndexes(Array.from(idx));
    setVerifyInput({});
  };

  const confirmCreate = async () => {
    if (!vault.locked && createMnemonic) {
      const words = createMnemonic.split(' ');
      const ok = verifyIndexes.every((i) => words[i]?.toLowerCase() === (verifyInput[i] || '').toLowerCase());
      if (!ok) {
        setStatus('Verification failed. Check the words and try again.');
        return;
      }
      const payload = await vault.encrypt(createMnemonic);
      const record: KeystoreRecord = {
        id: 'default',
        createdAt: new Date().toISOString(),
        wordCount: words.length === 24 ? 24 : 12,
        payload
      };
      await saveKeystore(record);
      setKeystore(record);
      setMnemonic(createMnemonic);
      setCreateMnemonic('');
      setVerifyIndexes([]);
      setStatus('Wallet created and stored locally.');
    } else {
      setStatus('Unlock the vault to store the wallet.');
    }
  };

  const importWallet = async () => {
    if (!vault.locked && createMnemonic) {
      const valid = await validateMnemonic(createMnemonic);
      if (!valid) {
        setStatus('Invalid mnemonic.');
        return;
      }
      const payload = await vault.encrypt(createMnemonic);
      const record: KeystoreRecord = {
        id: 'default',
        createdAt: new Date().toISOString(),
        wordCount: createMnemonic.split(' ').length === 24 ? 24 : 12,
        payload
      };
      await saveKeystore(record);
      setKeystore(record);
      setMnemonic(createMnemonic);
      setCreateMnemonic('');
      setStatus('Wallet imported.');
    } else {
      setStatus('Unlock the vault to store the wallet.');
    }
  };

  const sendBtc = async () => {
    if (!mnemonic) return;
    try {
      const amountSats = Math.round(parseFloat(btcAmount) * 1e8);
      const raw = await buildAndSignBtcTx({
        mnemonic,
        toAddress: btcTo,
        amountSats,
        feeRate: Number(btcFeeRate),
        network
      });
      const txid = await broadcastBtcTx(raw, network);
      setBtcTxid(txid);
      setStatus('BTC transaction broadcasted.');
    } catch (err: any) {
      setStatus(err.message || 'BTC transaction failed.');
    }
  };

  const sendEth = async () => {
    if (!mnemonic) return;
    try {
      const txid = await sendEthTransaction({
        mnemonic,
        toAddress: ethTo,
        amountEth: ethAmount,
        rpcUrl: ethRpc
      });
      setEthTxid(txid);
      setStatus('ETH transaction submitted.');
    } catch (err: any) {
      setStatus(err.message || 'ETH transaction failed.');
    }
  };

  const sendSol = async () => {
    if (!mnemonic) return;
    try {
      const txid = await sendSolTransaction({
        mnemonic,
        toAddress: solTo,
        amountSol: Number(solAmount),
        rpcUrl: solRpc
      });
      setSolTxid(txid);
      setStatus('SOL transaction submitted.');
    } catch (err: any) {
      setStatus(err.message || 'SOL transaction failed.');
    }
  };

  const warning = network === 'mainnet'
    ? 'Mainnet enabled. Real funds at risk.'
    : 'Testnet mode enabled (BTC testnet, ETH Sepolia, SOL devnet).';

  return (
    <div className="space-y-8 slide-up">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Wallet</p>
        <h1 className="text-3xl font-semibold text-white">Self-Custody Wallet (Testnet First)</h1>
        <p className="text-sm text-slate-400">
          All keys are generated locally and stored encrypted in IndexedDB. You control your keys.
        </p>
      </header>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">Network</h2>
            <p className="text-xs text-slate-500">{warning}</p>
          </div>
          <div className="flex gap-2">
            {(['testnet', 'mainnet'] as WalletNetwork[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  if (mode === 'mainnet' && !mainnetConsent) {
                    setShowMainnetGate(true);
                    return;
                  }
                  setNetwork(mode);
                }}
                className={`rounded-full border px-3 py-1 text-xs ${
                  network === mode ? 'border-mint-500/50 text-mint-300' : 'border-white/10 text-slate-400'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
        {status && <div className="text-xs text-amber-400">{status}</div>}
        {network === 'testnet' && (
          <div className="text-xs text-slate-400">
            Faucets: BTC testnet <a className="text-mint-300" href="https://bitcoinfaucet.uo1.net/">uo1</a>, ETH Sepolia <a className="text-mint-300" href="https://sepoliafaucet.com/">sepoliafaucet</a>, SOL devnet <a className="text-mint-300" href="https://solfaucet.com/">solfaucet</a>.
          </div>
        )}
      </section>

      {showMainnetGate && (
        <section className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-rose-200">Mainnet Unlock Required</h2>
          <p className="text-xs text-rose-100">
            Mainnet sends real funds. HELIX (Apex App) cannot recover lost keys or reversed transactions. Confirm you understand before enabling.
          </p>
          <label className="flex items-center gap-2 text-xs text-rose-100">
            <input
              type="checkbox"
              checked={mainnetConsent}
              onChange={(e) => setMainnetConsent(e.target.checked)}
            />
            I understand that mainnet transactions are irreversible and use real funds.
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                if (!mainnetConsent) return;
                setNetwork('mainnet');
                setShowMainnetGate(false);
              }}
              disabled={!mainnetConsent}
              className={`rounded-lg border px-4 py-2 text-sm ${mainnetConsent ? 'border-rose-400 text-rose-200' : 'border-white/10 text-slate-500'}`}
            >
              Enable mainnet
            </button>
            <button
              type="button"
              onClick={() => setShowMainnetGate(false)}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300"
            >
              Stay on testnet
            </button>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-200">Wallet Access</h2>
        {keystore ? (
          <div className="space-y-3">
            <div className="text-xs text-slate-500">Encrypted keystore detected.</div>
            <button
              type="button"
              onClick={unlockWallet}
              className="rounded-lg border border-mint-500/50 px-4 py-2 text-sm text-mint-300"
            >
              Unlock wallet
            </button>
            <button
              type="button"
              onClick={async () => {
                await deleteKeystore();
                setKeystore(null);
                setMnemonic(null);
              }}
              className="text-xs text-rose-400"
            >
              Delete keystore (local)
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => startCreate(12)}
                className="rounded-lg border border-mint-500/50 px-4 py-2 text-sm text-mint-300"
              >
                Create 12-word wallet
              </button>
              <button
                type="button"
                onClick={() => startCreate(24)}
                className="rounded-lg border border-mint-500/50 px-4 py-2 text-sm text-mint-300"
              >
                Create 24-word wallet
              </button>
            </div>
            <div className="text-xs text-slate-500">Or import an existing mnemonic below.</div>
          </div>
        )}

        {createMnemonic && !keystore && (
          <div className="rounded-xl border border-white/10 bg-ink-800/80 p-4 space-y-3">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Mnemonic (write this down)</div>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-200">
              {createMnemonic.split(' ').map((word, idx) => (
                <div key={word + idx} className="rounded-md border border-white/10 px-2 py-1">
                  {idx + 1}. {word}
                </div>
              ))}
            </div>
            <div className="text-xs text-amber-400">Never share this phrase. HELIX (Apex App) cannot recover it.</div>
          </div>
        )}

        {createMnemonic && verifyIndexes.length > 0 && !keystore && (
          <div className="rounded-xl border border-white/10 bg-ink-800/80 p-4 space-y-3">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Verify backup</div>
            {verifyIndexes.map((idx) => (
              <input
                key={idx}
                value={verifyInput[idx] || ''}
                onChange={(e) => setVerifyInput({ ...verifyInput, [idx]: e.target.value })}
                placeholder={`Word #${idx + 1}`}
                className="w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm text-slate-200"
              />
            ))}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={confirmCreate}
                className="rounded-lg border border-mint-500/50 px-4 py-2 text-sm text-mint-300"
              >
                Confirm backup
              </button>
              <button
                type="button"
                onClick={importWallet}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-400"
              >
                Import instead
              </button>
            </div>
          </div>
        )}

        {!keystore && (
          <div className="rounded-xl border border-white/10 bg-ink-800/80 p-4 space-y-3">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Import mnemonic</div>
            <textarea
              value={createMnemonic}
              onChange={(e) => setCreateMnemonic(e.target.value)}
              placeholder="Enter your 12 or 24 word mnemonic"
              className="h-24 w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm text-slate-200"
            />
            <button
              type="button"
              onClick={importWallet}
              className="rounded-lg border border-mint-500/50 px-4 py-2 text-sm text-mint-300"
            >
              Import wallet
            </button>
          </div>
        )}
      </section>

      {mnemonic && (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-200">Derived Addresses</h2>
          <div className="grid gap-3 md:grid-cols-3 text-xs text-slate-300">
            <div className="rounded-lg border border-white/10 px-3 py-2">
              <div className="text-slate-500">BTC</div>
              <div className="break-all">{addresses.btc}</div>
            </div>
            <div className="rounded-lg border border-white/10 px-3 py-2">
              <div className="text-slate-500">ETH</div>
              <div className="break-all">{addresses.eth}</div>
            </div>
            <div className="rounded-lg border border-white/10 px-3 py-2">
              <div className="text-slate-500">SOL</div>
              <div className="break-all">{addresses.sol}</div>
            </div>
          </div>
        </section>
      )}

      {mnemonic && (
        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-3">
            <h3 className="text-sm font-semibold text-slate-200">BTC Send</h3>
            <input value={btcTo} onChange={(e) => setBtcTo(e.target.value)} placeholder="Recipient address" className="w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm text-slate-200" />
            <input value={btcAmount} onChange={(e) => setBtcAmount(e.target.value)} placeholder="Amount (BTC)" className="w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm text-slate-200" />
            <input value={btcFeeRate} onChange={(e) => setBtcFeeRate(e.target.value)} placeholder="Fee rate (sats/vbyte)" className="w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm text-slate-200" />
            <button type="button" onClick={sendBtc} className="rounded-lg border border-mint-500/50 px-4 py-2 text-sm text-mint-300">Send BTC</button>
            {btcTxid && <div className="text-xs text-slate-400 break-all">TXID: {btcTxid}</div>}
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-3">
            <h3 className="text-sm font-semibold text-slate-200">ETH Send</h3>
            <input value={ethTo} onChange={(e) => setEthTo(e.target.value)} placeholder="Recipient address" className="w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm text-slate-200" />
            <input value={ethAmount} onChange={(e) => setEthAmount(e.target.value)} placeholder="Amount (ETH)" className="w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm text-slate-200" />
            <input value={ethRpc} onChange={(e) => setEthRpc(e.target.value)} placeholder="RPC URL" className="w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-xs text-slate-400" />
            <button type="button" onClick={sendEth} className="rounded-lg border border-mint-500/50 px-4 py-2 text-sm text-mint-300">Send ETH</button>
            {ethTxid && <div className="text-xs text-slate-400 break-all">TXID: {ethTxid}</div>}
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-3">
            <h3 className="text-sm font-semibold text-slate-200">SOL Send</h3>
            <input value={solTo} onChange={(e) => setSolTo(e.target.value)} placeholder="Recipient address" className="w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm text-slate-200" />
            <input value={solAmount} onChange={(e) => setSolAmount(e.target.value)} placeholder="Amount (SOL)" className="w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm text-slate-200" />
            <input value={solRpc} onChange={(e) => setSolRpc(e.target.value)} placeholder="RPC URL" className="w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-xs text-slate-400" />
            <button type="button" onClick={sendSol} className="rounded-lg border border-mint-500/50 px-4 py-2 text-sm text-mint-300">Send SOL</button>
            {solTxid && <div className="text-xs text-slate-400 break-all">TXID: {solTxid}</div>}
          </div>
        </section>
      )}
    </div>
  );
}

