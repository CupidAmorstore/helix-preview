import { useEffect, useState } from 'react';
import { listAddresses, listExchanges, saveAddress, deleteAddress, deleteExchange, getSetting, setSetting } from '../services/storage';
import { MIN_VAULT_PASSWORD, useVault } from '../services/vault';
import { validateAddress, type Chain } from '../services/walletSafety';
import type { AddressRecord, EncryptedPayload, ExchangeRecord } from '../types';
import { useT } from '../i18n';

export default function ConnectionsPage() {
  const t = useT();
  const vault = useVault();
  const [vaultPassword, setVaultPassword] = useState('');
  const [vaultNote, setVaultNote] = useState('');
  const [exchanges, setExchanges] = useState<ExchangeRecord[]>([]);
  const [addresses, setAddresses] = useState<AddressRecord[]>([]);

  const [chain, setChain] = useState<'btc' | 'eth' | 'sol'>('btc');
  const [address, setAddress] = useState('');
  const [addressLabel, setAddressLabel] = useState('');
  const [tokenContracts, setTokenContracts] = useState('');
  const [addressNote, setAddressNote] = useState('');

  const [etherscanKey, setEtherscanKey] = useState('');
  const [heliusKey, setHeliusKey] = useState('');
  const [ethRpc, setEthRpc] = useState('https://cloudflare-eth.com');
  const [solRpc, setSolRpc] = useState('https://api.mainnet-beta.solana.com');
  const [settingsNote, setSettingsNote] = useState('');

  useEffect(() => {
    listExchanges().then(setExchanges);
    listAddresses().then(setAddresses);
  }, []);

  useEffect(() => {
    if (vault.locked) return;
    const load = async () => {
      const storedEtherscan = await getSetting<EncryptedPayload>('etherscan_key');
      const storedEthRpc = await getSetting<EncryptedPayload>('eth_rpc');
      const storedSolRpc = await getSetting<EncryptedPayload>('sol_rpc');
      if (storedEtherscan) {
        setEtherscanKey(await vault.decrypt(storedEtherscan));
      }
      if (storedEthRpc) {
        setEthRpc(await vault.decrypt(storedEthRpc));
      }
      if (storedSolRpc) {
        setSolRpc(await vault.decrypt(storedSolRpc));
      }
    };
    load().catch(() => undefined);
  }, [vault]);

  const unlockVault = async () => {
    setVaultNote('');
    try {
      const creating = !vault.hasVault;
      await vault.unlock(vaultPassword);
      setVaultPassword('');
      setVaultNote(creating ? t('Vault created and unlocked. It locks itself after 5 minutes of inactivity.', 'Coffre créé et déverrouillé. Il se verrouille après 5 minutes d’inactivité.') : t('Vault unlocked. It locks itself after 5 minutes of inactivity.', 'Coffre déverrouillé. Il se verrouille après 5 minutes d’inactivité.'));
    } catch (e) {
      setVaultNote(e instanceof Error && e.message ? e.message : t('Unable to unlock vault.', 'Impossible de déverrouiller le coffre.'));
    }
  };

  const addAddress = async () => {
    setAddressNote('');
    const bad = address.trim() ? validateAddress(chain as Chain, address.trim(), 'mainnet') : t('Enter an address.', 'Entrez une adresse.');
    if (bad) return setAddressNote(bad);
    const record: AddressRecord = {
      id: crypto.randomUUID(),
      chain,
      address: address.trim(),
      label: addressLabel || t(`${chain.toUpperCase()} address`, `Adresse ${chain.toUpperCase()}`),
      tokenContracts: tokenContracts
        ? tokenContracts.split(',').map((t) => t.trim()).filter(Boolean)
        : undefined,
      createdAt: new Date().toISOString()
    };
    await saveAddress(record);
    setAddresses((prev) => [...prev, record]);
    setAddress('');
    setAddressLabel('');
    setTokenContracts('');
    setAddressNote(t('Address saved. Open Portfolio and tap Refresh balances to value it.', 'Adresse enregistrée. Ouvrez Adresses suivies et touchez Actualiser les soldes pour l’évaluer.'));
  };

  const saveSettings = async () => {
    if (vault.locked) {
      setSettingsNote(t('Unlock the vault to store API keys securely.', 'Déverrouillez le coffre pour enregistrer les clés API en sécurité.'));
      return;
    }
    await setSetting('etherscan_key', etherscanKey ? await vault.encrypt(etherscanKey) : null);
    await setSetting('eth_rpc', ethRpc ? await vault.encrypt(ethRpc) : null);
    const resolvedSolRpc = solRpc || (heliusKey ? `https://rpc.helius.xyz/?api-key=${heliusKey}` : '');
    await setSetting('sol_rpc', resolvedSolRpc ? await vault.encrypt(resolvedSolRpc) : null);
    setSettingsNote(t('API settings saved.', 'Réglages API enregistrés.'));
  };

  return (
    <div className="space-y-10 slide-up">
      <header className="space-y-2">
        <p className="text-xs eyebrow text-slate-500">{t('Connections', 'Connexions')}</p>
        <h1 className="text-3xl font-semibold text-white">{t('Connections', 'Connexions')}</h1>
        <p className="text-sm text-slate-400">
          {t("Store read-only API keys encrypted in your browser. Nothing is sent to a HELIX server; there isn't one.", 'Conservez des clés API en lecture seule, chiffrées dans votre navigateur. Rien n’est envoyé à un serveur HELIX : il n’y en a pas.')}
        </p>
      </header>

      <section className="border-t border-ink-600 pt-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">{t('Vault', 'Coffre')}</h2>
            <p className="text-xs text-slate-500">{t('Unlock to access encrypted settings and keys.', 'Déverrouillez pour accéder aux réglages et clés chiffrés.')}</p>
          </div>
          {vault.hasVault && !vault.locked && (
            <button
              type="button"
              className="min-h-[44px] rounded-full border border-ink-600 px-4 text-xs text-slate-300"
              onClick={vault.lock}
            >
              {t('Lock vault', 'Verrouiller le coffre')}
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <input
            type="password"
            value={vaultPassword}
            onChange={(e) => setVaultPassword(e.target.value)}
            placeholder={vault.hasVault ? t('Enter vault password', 'Mot de passe du coffre') : t('Create a vault password', 'Créez un mot de passe de coffre')}
            aria-describedby="vault-hint"
            className="min-w-0 flex-1 basis-48 min-h-[44px] rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-slate-200"
          />
          <button
            type="button"
            onClick={unlockVault}
            className="min-h-[44px] rounded-full bg-white px-5 text-sm font-semibold text-ink-900 disabled:opacity-40"
          >
            {vault.hasVault ? t('Unlock', 'Déverrouiller') : t('Create vault', 'Créer le coffre')}
          </button>
        </div>
        {!vault.hasVault && <p id="vault-hint" className="text-xs text-slate-500">{t(`At least ${MIN_VAULT_PASSWORD} characters. There is no way to recover it if you forget it.`, `Au moins ${MIN_VAULT_PASSWORD} caractères. Impossible de le récupérer si vous l’oubliez.`)}</p>}
        {vaultNote && <div role="status" className="text-sm text-amber-400">{vaultNote}</div>}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="border-t border-ink-600 pt-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-200">{t('Exchange Connections', 'Connexions aux plateformes')}</h2>
          <p className="text-sm text-slate-400">
            {t('Syncing exchange balances needs a secure server connector, which this app doesn’t have yet. To keep your accounts safe, HELIX no longer accepts exchange API keys.', 'La synchronisation des soldes de plateformes exige un connecteur serveur sécurisé, que l’application n’a pas encore. Pour protéger vos comptes, HELIX n’accepte plus de clés API de plateformes.')}
          </p>
          {exchanges.length > 0 && (
            <p className="text-xs text-amber-400">
              {t('Keys saved by an earlier version are still stored encrypted on this phone. Remove them below.', 'Des clés enregistrées par une version antérieure sont encore chiffrées sur ce téléphone. Retirez-les ci-dessous.')}
            </p>
          )}
          <div className="space-y-2">
            {exchanges.map((exchange) => (
              <div key={exchange.id} className="flex items-center justify-between min-h-[44px] rounded-full border border-ink-500 px-4 text-xs text-white">
                <div>{exchange.label}</div>
                <button
                  type="button"
                  onClick={async () => {
                    await deleteExchange(exchange.id);
                    setExchanges((prev) => prev.filter((item) => item.id !== exchange.id));
                  }}
                  className="text-rose-400"
                >
                  {t('Remove', 'Retirer')}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-ink-600 pt-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-200">{t('On-chain Watchlist', 'Adresses suivies sur la chaîne')}</h2>
          <div className="space-y-3">
            <select
              aria-label={t('Blockchain of the address', 'Chaîne de blocs de l’adresse')}
              value={chain}
              onChange={(e) => setChain(e.target.value as 'btc' | 'eth' | 'sol')}
              className="w-full min-h-[44px] rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-slate-200"
            >
              <option value="btc" className="text-black">BTC</option>
              <option value="eth" className="text-black">ETH/EVM</option>
              <option value="sol" className="text-black">SOL</option>
            </select>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t('Public address', 'Adresse publique')}
              className="w-full min-h-[44px] rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-slate-200"
            />
            <input
              value={addressLabel}
              onChange={(e) => setAddressLabel(e.target.value)}
              placeholder={t('Label (optional)', 'Libellé (facultatif)')}
              className="w-full min-h-[44px] rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-slate-200"
            />
            <input
              value={tokenContracts}
              onChange={(e) => setTokenContracts(e.target.value)}
              placeholder={t('Token contracts (comma separated, optional)', 'Contrats de jetons (séparés par des virgules, facultatif)')}
              className="w-full min-h-[44px] rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-xs text-slate-300"
            />
            <button
              type="button"
              onClick={addAddress}
              className="min-h-[44px] rounded-full bg-white px-5 text-sm font-semibold text-ink-900 disabled:opacity-40"
            >
              {t('Save address', 'Enregistrer l’adresse')}
            </button>
          {addressNote && <p role="status" className={`text-sm ${/saved|enregistr/i.test(addressNote) ? 'text-up' : 'text-down'}`}>{addressNote}</p>}
          </div>
          <div className="space-y-2">
            {addresses.map((addr) => (
              <div key={addr.id} className="min-h-[44px] rounded-full border border-ink-500 px-4 text-xs text-white">
                <div className="flex items-center justify-between">
                  <div>{addr.label}</div>
                  <button
                    type="button"
                    onClick={async () => {
                      await deleteAddress(addr.id);
                      setAddresses((prev) => prev.filter((item) => item.id !== addr.id));
                    }}
                    className="text-rose-400"
                  >
                    {t('Remove', 'Retirer')}
                  </button>
                </div>
                <div className="text-[11px] text-slate-500">{addr.chain.toUpperCase()} · {addr.address}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-ink-600 pt-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-200">{t('API Keys & RPC', 'Clés API et RPC')}</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <label className="text-xs text-slate-500">{t('Etherscan API key', 'Clé API Etherscan')}</label>
            <input
              value={etherscanKey}
              onChange={(e) => setEtherscanKey(e.target.value)}
              placeholder={t('Etherscan key', 'Clé Etherscan')}
              className="w-full min-h-[44px] rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-slate-200"
            />
            <label className="text-xs text-slate-500">{t('ETH RPC URL', 'URL RPC ETH')}</label>
            <input
              value={ethRpc}
              onChange={(e) => setEthRpc(e.target.value)}
              placeholder="https://cloudflare-eth.com"
              className="w-full min-h-[44px] rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-slate-200"
            />
          </div>
          <div className="space-y-3">
            <label className="text-xs text-slate-500">{t('Helius API key (optional)', 'Clé API Helius (facultative)')}</label>
            <input
              value={heliusKey}
              onChange={(e) => setHeliusKey(e.target.value)}
              placeholder={t('Helius key', 'Clé Helius')}
              className="w-full min-h-[44px] rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-slate-200"
            />
            <label className="text-xs text-slate-500">{t('Solana RPC URL', 'URL RPC Solana')}</label>
            <input
              value={solRpc}
              onChange={(e) => setSolRpc(e.target.value)}
              placeholder="https://api.mainnet-beta.solana.com"
              className="w-full min-h-[44px] rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-slate-200"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={saveSettings}
          className="min-h-[44px] rounded-full bg-white px-5 text-sm font-semibold text-ink-900 disabled:opacity-40"
        >
          {t('Save API settings', 'Enregistrer les réglages API')}
        </button>
        {settingsNote && <div className="text-xs text-amber-400">{settingsNote}</div>}
      </section>
    </div>
  );
}

