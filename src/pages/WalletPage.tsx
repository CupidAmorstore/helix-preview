import { useEffect, useState } from 'react';
import VaultGate from '../components/VaultGate';
import { getKeystore, saveKeystore, deleteKeystore, getSetting } from '../services/storage';
import { useVault } from '../services/vault';
import { SEND_DISABLED_MSG, WALLET_MAINNET_SEND_ENABLED, WALLET_SEND_ENABLED, buildAndSignBtcTx, broadcastBtcTx, deriveAddresses, generateMnemonic, sendEthTransaction, sendSolTransaction, validateMnemonic } from '../services/wallet';
import type { EncryptedPayload, KeystoreRecord, WalletNetwork } from '../types';
import { PageHeader } from '../components/ui';
import { WalletAccounts, WalletGuide } from '../components/WalletParts';
import { DEFAULT_RPC, NETWORK_LABEL, checkRpcNetwork, validateAddress, validateAmount, type Chain } from '../services/walletSafety';
import { useT } from '../i18n';

export default function WalletPage() {
  const vault = useVault();
  const t = useT();
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
  const [ethRpc, setEthRpc] = useState(DEFAULT_RPC.eth.testnet);
  const [ethTxid, setEthTxid] = useState('');

  const [solTo, setSolTo] = useState('');
  const [solAmount, setSolAmount] = useState('');
  const [solRpc, setSolRpc] = useState(DEFAULT_RPC.sol.testnet);
  const [solTxid, setSolTxid] = useState('');

  const [addresses, setAddresses] = useState<{ btc?: string; eth?: string; sol?: string }>({});
  // Two-step send: first tap validates and shows a review, second tap signs.
  const [review, setReview] = useState<Chain | null>(null);

  // Keep the RPC endpoints on the selected network (they used to stay on Sepolia/devnet after
  // switching to mainnet). Custom endpoints entered by the user are kept but still checked before signing.
  useEffect(() => {
    const other: WalletNetwork = network === 'mainnet' ? 'testnet' : 'mainnet';
    setEthRpc((cur) => (cur === DEFAULT_RPC.eth[other] ? DEFAULT_RPC.eth[network] : cur));
    setSolRpc((cur) => (cur === DEFAULT_RPC.sol[other] ? DEFAULT_RPC.sol[network] : cur));
    setReview(null);
  }, [network]);

  const preflight = async (chain: Chain, to: string, amount: string): Promise<boolean> => {
    const err = validateAddress(chain, to, network) ?? validateAmount(amount) ??
      (chain === 'eth' ? await checkRpcNetwork('eth', ethRpc, network) : chain === 'sol' ? await checkRpcNetwork('sol', solRpc, network) : null);
    if (err) {
      setStatus(err);
      setReview(null);
      return false;
    }
    return true;
  };

  const startReview = async (chain: Chain, to: string, amount: string) => {
    setStatus('');
    if (await preflight(chain, to, amount)) setReview(chain);
  };

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
    getSetting<EncryptedPayload>('eth_rpc').then((val) => {
      if (!val) return;
      vault.decrypt(val).then(setEthRpc).catch(() => undefined);
    });
    getSetting<EncryptedPayload>('sol_rpc').then((val) => {
      if (!val) return;
      vault.decrypt(val).then(setSolRpc).catch(() => undefined);
    });
  }, [vault]);

  // the decrypted phrase never outlives the vault: auto-lock (5 min idle) or manual lock clears it
  useEffect(() => {
    if (vault.locked) setMnemonic(null);
  }, [vault.locked]);

  const [confirmDelete, setConfirmDelete] = useState('');

  const unlockWallet = async () => {
    if (!keystore) return;
    if (vault.locked) {
      setStatus(t('Unlock the vault first.', 'Déverrouillez d’abord le coffre.'));
      return;
    }
    try {
      const decrypted = await vault.decrypt(keystore.payload);
      setMnemonic(decrypted);
      setStatus(t('Wallet unlocked in-memory.', 'Portefeuille ouvert en mémoire.'));
    } catch {
      setStatus(t('Failed to decrypt wallet.', 'Échec du déchiffrement du portefeuille.'));
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
        setStatus(t('Verification failed. Check the words and try again.', 'La vérification a échoué. Vérifiez les mots et réessayez.'));
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
      setStatus(t('Wallet created and stored locally.', 'Portefeuille créé et enregistré sur l’appareil.'));
    } else {
      setStatus(t('Unlock the vault to store the wallet.', 'Déverrouillez le coffre pour enregistrer le portefeuille.'));
    }
  };

  const importWallet = async () => {
    if (!vault.locked && createMnemonic) {
      const valid = await validateMnemonic(createMnemonic);
      if (!valid) {
        setStatus(t('Invalid mnemonic.', 'Phrase de récupération invalide.'));
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
      setStatus(t('Wallet imported.', 'Portefeuille importé.'));
    } else {
      setStatus(t('Unlock the vault to store the wallet.', 'Déverrouillez le coffre pour enregistrer le portefeuille.'));
    }
  };

  const sendBtc = async () => {
    if (!mnemonic) return;
    setReview(null);
    if (!(await preflight('btc', btcTo, btcAmount))) return;
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
    } catch (err) {
      setStatus((err instanceof Error && err.message) || 'BTC transaction failed.');
    }
  };

  const sendEth = async () => {
    if (!mnemonic) return;
    setReview(null);
    if (!(await preflight('eth', ethTo, ethAmount))) return;
    try {
      const txid = await sendEthTransaction({
        network,
        mnemonic,
        toAddress: ethTo,
        amountEth: ethAmount,
        rpcUrl: ethRpc
      });
      setEthTxid(txid);
      setStatus('ETH transaction submitted.');
    } catch (err) {
      setStatus((err instanceof Error && err.message) || 'ETH transaction failed.');
    }
  };

  const sendSol = async () => {
    if (!mnemonic) return;
    setReview(null);
    if (!(await preflight('sol', solTo, solAmount))) return;
    try {
      const txid = await sendSolTransaction({
        network,
        mnemonic,
        toAddress: solTo,
        amountSol: Number(solAmount),
        rpcUrl: solRpc
      });
      setSolTxid(txid);
      setStatus('SOL transaction submitted.');
    } catch (err) {
      setStatus((err instanceof Error && err.message) || 'SOL transaction failed.');
    }
  };

  const warning = network === 'mainnet'
    ? t('Mainnet enabled. Real funds at risk.', 'Réseau principal activé. De vrais fonds sont en jeu.')
    : t('Testnet mode enabled (BTC testnet, ETH Sepolia, SOL devnet).', 'Mode réseau de test activé (BTC testnet, ETH Sepolia, SOL devnet).');

  return (
    <div className="space-y-8 slide-up">
      <PageHeader title={t('Wallet', 'Portefeuille')} subtitle={t('Self-custody · keys stay on this phone, encrypted', 'Autogarde · les clés restent chiffrées sur ce téléphone')} />

      <section className="border-t border-ink-600 pt-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">{t('Network', 'Réseau')}</h2>
            <p className="text-xs text-slate-500">{warning}</p>
          </div>
          <div className="flex gap-2">
            {(['testnet', 'mainnet'] as WalletNetwork[]).map((mode) => (
              <button
                key={mode === 'testnet' ? t('Testnet', 'Réseau de test') : t('Mainnet', 'Réseau principal')}
                type="button"
                onClick={() => {
                  if (mode === 'mainnet' && !mainnetConsent) {
                    setShowMainnetGate(true);
                    return;
                  }
                  setNetwork(mode);
                }}
                className={`rounded-full border px-3 py-1 text-xs ${
                  network === mode ? 'border-white bg-white text-ink-900' : 'border-ink-600 text-slate-400'
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
            {t('Free test coins (no value):', 'Pièces de test gratuites (sans valeur) :')} <a className="text-helix-400 underline" target="_blank" rel="noreferrer" href="https://bitcoinfaucet.uo1.net/">{t('Bitcoin testnet faucet', 'Robinet Bitcoin testnet')}</a> · <a className="text-helix-400 underline" target="_blank" rel="noreferrer" href="https://sepoliafaucet.com/">{t('Ethereum Sepolia faucet', 'Robinet Ethereum Sepolia')}</a> · <a className="text-helix-400 underline" target="_blank" rel="noreferrer" href="https://solfaucet.com/">{t('Solana devnet faucet', 'Robinet Solana devnet')}</a>.
          </div>
        )}
      </section>

      {showMainnetGate && (
        <section className="border-l-2 border-down bg-down/5 py-4 pl-4 pr-3 space-y-4">
          <h2 className="text-sm font-semibold text-rose-200">{t('Mainnet Unlock Required', 'Déverrouillage du réseau principal requis')}</h2>
          <p className="text-xs text-rose-100">
            {t('Mainnet shows your real balances and history. Sending is disabled in this private beta. HELIX cannot recover lost keys.', 'Le réseau principal affiche vos vrais soldes et historiques. L’envoi est désactivé dans cette bêta privée. HELIX ne peut pas récupérer des clés perdues.')}
          </p>
          <label className="flex items-center gap-2 text-xs text-rose-100">
            <input
              type="checkbox"
              checked={mainnetConsent}
              onChange={(e) => setMainnetConsent(e.target.checked)}
            />
            {t('I understand mainnet addresses hold real funds and that HELIX cannot recover lost keys.', 'Je comprends que les adresses du réseau principal contiennent de vrais fonds et que HELIX ne peut pas récupérer des clés perdues.')}
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
              className={`rounded-lg border px-4 py-2 text-sm ${mainnetConsent ? 'border-rose-400 text-rose-200' : 'border-ink-600 text-slate-500'}`}
            >
              {t('Enable mainnet', 'Activer le réseau principal')}
            </button>
            <button
              type="button"
              onClick={() => setShowMainnetGate(false)}
              className="min-h-[44px] rounded-full border border-ink-500 px-5 text-sm text-white"
            >
              {t('Stay on testnet', 'Rester sur le réseau de test')}
            </button>
          </div>
        </section>
      )}

      <section className="border-t border-ink-600 pt-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-200">{t('Wallet Access', 'Accès au portefeuille')}</h2>
        {!keystore && <p className="text-sm text-slate-400">{t('New to self-custody? Read the guide below first.', 'Nouveau en autogarde? Lisez d’abord le guide ci-dessous.')}</p>}
        {(!mnemonic || !keystore) && <VaultGate purpose={keystore ? t('open your wallet', 'ouvrir votre portefeuille') : t('create or import a wallet', 'créer ou importer un portefeuille')} />}
        {keystore ? (
          <div className="space-y-3">
            <div className="text-xs text-slate-500">{t('Encrypted keystore detected.', 'Portefeuille chiffré détecté.')}</div>
            <button
              type="button"
              onClick={unlockWallet}
              disabled={vault.locked || !!mnemonic}
              className="min-h-[44px] rounded-full bg-white px-5 text-sm font-semibold text-ink-900 disabled:opacity-40"
            >
              {mnemonic ? t('Wallet open', 'Portefeuille ouvert') : t('Open wallet', 'Ouvrir le portefeuille')}
            </button>
            <details className="pt-2">
              <summary className="min-h-[44px] cursor-pointer py-3 text-sm text-down">{t('Delete wallet from this phone…', 'Supprimer le portefeuille de ce téléphone…')}</summary>
              <div className="space-y-2 border-l-2 border-down pl-3">
                <p className="text-sm text-slate-300">{t('This erases the encrypted wallet from this device. Coins stay on the blockchain, but without your written recovery phrase they are lost forever.', 'Cela efface le portefeuille chiffré de cet appareil. Les pièces restent sur la chaîne de blocs, mais sans votre phrase de récupération écrite, elles sont perdues pour toujours.')}</p>
                <label className="block space-y-1 text-xs text-slate-400">
                  {t('Type DELETE to confirm', 'Tapez DELETE pour confirmer')}
                  <input value={confirmDelete} onChange={(e) => setConfirmDelete(e.target.value)} autoCapitalize="characters" className="min-h-[44px] w-full rounded-lg border border-ink-500 bg-ink-800 px-3 text-base text-white" />
                </label>
                <button
                  type="button"
                  disabled={confirmDelete !== 'DELETE'}
                  onClick={async () => {
                    await deleteKeystore();
                    setKeystore(null);
                    setMnemonic(null);
                    setConfirmDelete('');
                    setStatus(t('Wallet deleted from this phone.', 'Portefeuille supprimé de ce téléphone.'));
                  }}
                  className="min-h-[44px] rounded-full border border-down px-5 text-sm text-down disabled:opacity-40"
                >
                  {t('Delete wallet', 'Supprimer le portefeuille')}
                </button>
              </div>
            </details>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => startCreate(12)}
                className="min-h-[44px] rounded-full bg-white px-5 text-sm font-semibold text-ink-900 disabled:opacity-40"
              >
                {t('Create 12-word wallet', 'Créer un portefeuille de 12 mots')}
              </button>
              <button
                type="button"
                onClick={() => startCreate(24)}
                className="min-h-[44px] rounded-full border border-ink-500 px-5 text-sm text-white disabled:opacity-40"
              >
                {t('Create 24-word wallet', 'Créer un portefeuille de 24 mots')}
              </button>
            </div>
            <div className="text-xs text-slate-500">{t('Or import an existing mnemonic below.', 'Ou importez une phrase de récupération existante ci-dessous.')}</div>
          </div>
        )}

        {createMnemonic && !keystore && (
          <div className="rounded-lg border border-ink-600 p-4 space-y-3">
            <div className="text-xs eyebrow text-slate-500">{t('Mnemonic (write this down)', 'Phrase de récupération (notez-la)')}</div>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-200">
              {createMnemonic.split(' ').map((word, idx) => (
                <div key={word + idx} className="rounded-md border border-ink-600 px-2 py-1">
                  {idx + 1}. {word}
                </div>
              ))}
            </div>
            <div className="text-xs text-amber-400">{t('Never share this phrase. HELIX cannot recover it.', 'Ne partagez jamais cette phrase. HELIX ne peut pas la récupérer.')}</div>
          </div>
        )}

        {createMnemonic && verifyIndexes.length > 0 && !keystore && (
          <div className="rounded-lg border border-ink-600 p-4 space-y-3">
            <div className="text-xs eyebrow text-slate-500">{t('Verify backup', 'Vérifier la sauvegarde')}</div>
            {verifyIndexes.map((idx) => (
              <input
                key={idx}
                value={verifyInput[idx] || ''}
                onChange={(e) => setVerifyInput({ ...verifyInput, [idx]: e.target.value })}
                placeholder={`${t('Word', 'Mot')} #${idx + 1}`}
                className="w-full min-h-[44px] rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-slate-200"
              />
            ))}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={confirmCreate}
                className="min-h-[44px] rounded-full bg-white px-5 text-sm font-semibold text-ink-900 disabled:opacity-40"
              >
                {t('Confirm backup', 'Confirmer la sauvegarde')}
              </button>
              <button
                type="button"
                onClick={importWallet}
                className="min-h-[44px] rounded-full border border-ink-500 px-5 text-sm text-white"
              >
                {t('Import instead', 'Importer plutôt')}
              </button>
            </div>
          </div>
        )}

        {!keystore && (
          <div className="rounded-lg border border-ink-600 p-4 space-y-3">
            <div className="text-xs eyebrow text-slate-500">{t('Import mnemonic', 'Importer une phrase de récupération')}</div>
            <textarea
              value={createMnemonic}
              onChange={(e) => setCreateMnemonic(e.target.value)}
              placeholder={t('Enter your 12 or 24 word mnemonic', 'Entrez votre phrase de 12 ou 24 mots')}
              className="h-24 w-full min-h-[44px] rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-slate-200"
            />
            <button
              type="button"
              onClick={importWallet}
              className="min-h-[44px] rounded-full bg-white px-5 text-sm font-semibold text-ink-900 disabled:opacity-40"
            >
              {t('Import wallet', 'Importer le portefeuille')}
            </button>
          </div>
        )}
      </section>

      {mnemonic && <WalletAccounts addresses={addresses} network={network} rpc={{ eth: ethRpc, sol: solRpc }} />}
      {!keystore && <WalletGuide />}

      {mnemonic && !WALLET_SEND_ENABLED && (
        <section className="border-t border-ink-600 pt-5" aria-label={t('Send', 'Envoyer')}>
          <h2 className="eyebrow text-slate-400">{t('Send', 'Envoyer')}</h2>
          <p className="mt-2 text-sm text-slate-300">{t(`${SEND_DISABLED_MSG} Addresses, balances, history and receiving work normally.`, 'L’envoi est désactivé dans cette version bêta privée. Aucune transaction n’est signée ni diffusée, sur aucun réseau. Les adresses, soldes, historiques et réceptions fonctionnent normalement.')}</p>
        </section>
      )}
      {mnemonic && WALLET_SEND_ENABLED && (network === 'testnet' || WALLET_MAINNET_SEND_ENABLED) && (
        <section className="grid gap-4 lg:grid-cols-3" aria-label={t('Send', 'Envoyer')}>
          <div className="border-t border-ink-600 pt-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-200">Send BTC</h3>
            <p className="text-xs text-slate-400">{NETWORK_LABEL.btc[network]}</p>
            <input value={btcTo} onChange={(e) => setBtcTo(e.target.value)} placeholder="Recipient address" className="w-full min-h-[44px] rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-slate-200" />
            <input value={btcAmount} onChange={(e) => setBtcAmount(e.target.value)} placeholder="Amount (BTC)" className="w-full min-h-[44px] rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-slate-200" />
            <input value={btcFeeRate} onChange={(e) => setBtcFeeRate(e.target.value)} placeholder="Fee rate (sats/vbyte)" className="w-full min-h-[44px] rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-slate-200" />
            {review === 'btc' && <div role="status" className="rounded-lg bg-amber-500/10 p-3 text-xs text-amber-200">Send {btcAmount} BTC on {NETWORK_LABEL.btc[network]} to {btcTo}? This cannot be undone.</div>}
            <button type="button" onClick={() => (review === 'btc' ? sendBtc() : startReview('btc', btcTo, btcAmount))} className="min-h-[48px] w-full rounded-full bg-white px-4 text-sm font-semibold text-ink-900">{review === 'btc' ? 'Confirm send' : 'Review send'}</button>
            {btcTxid && <div className="text-xs text-slate-400 break-all">TXID: {btcTxid}</div>}
          </div>
          <div className="border-t border-ink-600 pt-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-200">Send ETH</h3>
            <p className="text-xs text-slate-400">{NETWORK_LABEL.eth[network]}</p>
            <input value={ethTo} onChange={(e) => setEthTo(e.target.value)} placeholder="Recipient address" className="w-full min-h-[44px] rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-slate-200" />
            <input value={ethAmount} onChange={(e) => setEthAmount(e.target.value)} placeholder="Amount (ETH)" className="w-full min-h-[44px] rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-slate-200" />
            <input value={ethRpc} onChange={(e) => setEthRpc(e.target.value)} placeholder="RPC URL" className="w-full min-h-[44px] rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-xs text-slate-400" />
            {review === 'eth' && <div role="status" className="rounded-lg bg-amber-500/10 p-3 text-xs text-amber-200">Send {ethAmount} ETH on {NETWORK_LABEL.eth[network]} to {ethTo}? This cannot be undone.</div>}
            <button type="button" onClick={() => (review === 'eth' ? sendEth() : startReview('eth', ethTo, ethAmount))} className="min-h-[48px] w-full rounded-full bg-white px-4 text-sm font-semibold text-ink-900">{review === 'eth' ? 'Confirm send' : 'Review send'}</button>
            {ethTxid && <div className="text-xs text-slate-400 break-all">TXID: {ethTxid}</div>}
          </div>
          <div className="border-t border-ink-600 pt-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-200">Send SOL</h3>
            <p className="text-xs text-slate-400">{NETWORK_LABEL.sol[network]}</p>
            <input value={solTo} onChange={(e) => setSolTo(e.target.value)} placeholder="Recipient address" className="w-full min-h-[44px] rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-slate-200" />
            <input value={solAmount} onChange={(e) => setSolAmount(e.target.value)} placeholder="Amount (SOL)" className="w-full min-h-[44px] rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-slate-200" />
            <input value={solRpc} onChange={(e) => setSolRpc(e.target.value)} placeholder="RPC URL" className="w-full min-h-[44px] rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-xs text-slate-400" />
            {review === 'sol' && <div role="status" className="rounded-lg bg-amber-500/10 p-3 text-xs text-amber-200">Send {solAmount} SOL on {NETWORK_LABEL.sol[network]} to {solTo}? This cannot be undone.</div>}
            <button type="button" onClick={() => (review === 'sol' ? sendSol() : startReview('sol', solTo, solAmount))} className="min-h-[48px] w-full rounded-full bg-white px-4 text-sm font-semibold text-ink-900">{review === 'sol' ? 'Confirm send' : 'Review send'}</button>
            {solTxid && <div className="text-xs text-slate-400 break-all">TXID: {solTxid}</div>}
          </div>
        </section>
      )}
    </div>
  );
}

