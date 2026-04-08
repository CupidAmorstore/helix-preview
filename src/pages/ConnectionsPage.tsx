import { useEffect, useState } from 'react';
import { listAddresses, listExchanges, saveAddress, saveExchange, deleteAddress, deleteExchange, getSetting, setSetting } from '../services/storage';
import { useVault } from '../services/vault';
import type { AddressRecord, ExchangeId, ExchangeRecord } from '../types';
import { EXCHANGE_LABELS } from '../services/exchanges';

export default function ConnectionsPage() {
  const vault = useVault();
  const [vaultPassword, setVaultPassword] = useState('');
  const [vaultNote, setVaultNote] = useState('');
  const [exchanges, setExchanges] = useState<ExchangeRecord[]>([]);
  const [addresses, setAddresses] = useState<AddressRecord[]>([]);

  const [exchangeId, setExchangeId] = useState<ExchangeId>('binance');
  const [exchangeLabel, setExchangeLabel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [secret, setSecret] = useState('');
  const [passphrase, setPassphrase] = useState('');

  const [chain, setChain] = useState<'btc' | 'eth' | 'sol'>('btc');
  const [address, setAddress] = useState('');
  const [addressLabel, setAddressLabel] = useState('');
  const [tokenContracts, setTokenContracts] = useState('');

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
      const storedEtherscan = await getSetting<any>('etherscan_key');
      const storedEthRpc = await getSetting<any>('eth_rpc');
      const storedSolRpc = await getSetting<any>('sol_rpc');
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
      await vault.unlock(vaultPassword);
      setVaultPassword('');
      setVaultNote('Vault unlocked for this session.');
    } catch {
      setVaultNote('Unable to unlock vault.');
    }
  };

  const addExchange = async () => {
    if (vault.locked) {
      setVaultNote('Unlock the vault before saving exchange keys.');
      return;
    }
    const payload = await vault.encrypt(JSON.stringify({ apiKey, secret, passphrase }));
    const record: ExchangeRecord = {
      id: crypto.randomUUID(),
      exchange: exchangeId,
      label: exchangeLabel || EXCHANGE_LABELS[exchangeId],
      createdAt: new Date().toISOString(),
      payload
    };
    await saveExchange(record);
    setExchanges((prev) => [...prev, record]);
    setExchangeLabel('');
    setApiKey('');
    setSecret('');
    setPassphrase('');
  };

  const addAddress = async () => {
    const record: AddressRecord = {
      id: crypto.randomUUID(),
      chain,
      address,
      label: addressLabel || `${chain.toUpperCase()} address`,
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
  };

  const saveSettings = async () => {
    if (vault.locked) {
      setSettingsNote('Unlock the vault to store API keys securely.');
      return;
    }
    await setSetting('etherscan_key', etherscanKey ? await vault.encrypt(etherscanKey) : null);
    await setSetting('eth_rpc', ethRpc ? await vault.encrypt(ethRpc) : null);
    const resolvedSolRpc = solRpc || (heliusKey ? `https://rpc.helius.xyz/?api-key=${heliusKey}` : '');
    await setSetting('sol_rpc', resolvedSolRpc ? await vault.encrypt(resolvedSolRpc) : null);
    setSettingsNote('API settings saved.');
  };

  return (
    <div className="space-y-10 slide-up">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Connections</p>
        <h1 className="text-3xl font-semibold text-white">Secure Connection Setup</h1>
        <p className="text-sm text-slate-400">
          Store read-only API keys encrypted in your browser. Keys are never transmitted to HELIX servers.
        </p>
      </header>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">Vault</h2>
            <p className="text-xs text-slate-500">Unlock to access encrypted settings and keys.</p>
          </div>
          <button
            type="button"
            className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300"
            onClick={vault.lock}
          >
            Lock vault
          </button>
        </div>
        <div className="flex flex-wrap gap-3">
          <input
            type="password"
            value={vaultPassword}
            onChange={(e) => setVaultPassword(e.target.value)}
            placeholder={vault.hasVault ? 'Enter vault password' : 'Create a vault password'}
            className="flex-1 rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm text-slate-200"
          />
          <button
            type="button"
            onClick={unlockVault}
            className="rounded-lg border border-mint-500/50 px-4 py-2 text-sm text-mint-300"
          >
            {vault.hasVault ? 'Unlock' : 'Create vault'}
          </button>
        </div>
        {vaultNote && <div className="text-xs text-amber-400">{vaultNote}</div>}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-200">Exchange Connections</h2>
          <div className="space-y-3">
            <select
              value={exchangeId}
              onChange={(e) => setExchangeId(e.target.value as ExchangeId)}
              className="w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm text-slate-200"
            >
              {Object.entries(EXCHANGE_LABELS).map(([id, label]) => (
                <option key={id} value={id} className="text-black">
                  {label}
                </option>
              ))}
            </select>
            <input
              value={exchangeLabel}
              onChange={(e) => setExchangeLabel(e.target.value)}
              placeholder="Label (optional)"
              className="w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm text-slate-200"
            />
            <input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="API key"
              className="w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm text-slate-200"
            />
            <input
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="API secret"
              type="password"
              className="w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm text-slate-200"
            />
            <input
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Passphrase (Coinbase/Kraken)"
              type="password"
              className="w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm text-slate-200"
            />
            <button
              type="button"
              onClick={addExchange}
              className="rounded-lg border border-mint-500/50 px-4 py-2 text-sm text-mint-300"
            >
              Save exchange
            </button>
            <p className="text-xs text-slate-500">
              Keys must be read-only. If CORS blocks a request, use a local proxy.
            </p>
          </div>
          <div className="space-y-2">
            {exchanges.map((exchange) => (
              <div key={exchange.id} className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300">
                <div>{exchange.label}</div>
                <button
                  type="button"
                  onClick={async () => {
                    await deleteExchange(exchange.id);
                    setExchanges((prev) => prev.filter((item) => item.id !== exchange.id));
                  }}
                  className="text-rose-400"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-200">On-chain Watchlist</h2>
          <div className="space-y-3">
            <select
              value={chain}
              onChange={(e) => setChain(e.target.value as 'btc' | 'eth' | 'sol')}
              className="w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm text-slate-200"
            >
              <option value="btc" className="text-black">BTC</option>
              <option value="eth" className="text-black">ETH/EVM</option>
              <option value="sol" className="text-black">SOL</option>
            </select>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Public address"
              className="w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm text-slate-200"
            />
            <input
              value={addressLabel}
              onChange={(e) => setAddressLabel(e.target.value)}
              placeholder="Label (optional)"
              className="w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm text-slate-200"
            />
            <input
              value={tokenContracts}
              onChange={(e) => setTokenContracts(e.target.value)}
              placeholder="Token contracts (comma separated, optional)"
              className="w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-xs text-slate-300"
            />
            <button
              type="button"
              onClick={addAddress}
              className="rounded-lg border border-mint-500/50 px-4 py-2 text-sm text-mint-300"
            >
              Save address
            </button>
          </div>
          <div className="space-y-2">
            {addresses.map((addr) => (
              <div key={addr.id} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300">
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
                    Remove
                  </button>
                </div>
                <div className="text-[11px] text-slate-500">{addr.chain.toUpperCase()} · {addr.address}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-200">API Keys & RPC</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <label className="text-xs text-slate-500">Etherscan API key</label>
            <input
              value={etherscanKey}
              onChange={(e) => setEtherscanKey(e.target.value)}
              placeholder="Etherscan key"
              className="w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm text-slate-200"
            />
            <label className="text-xs text-slate-500">ETH RPC URL</label>
            <input
              value={ethRpc}
              onChange={(e) => setEthRpc(e.target.value)}
              placeholder="https://cloudflare-eth.com"
              className="w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm text-slate-200"
            />
          </div>
          <div className="space-y-3">
            <label className="text-xs text-slate-500">Helius API key (optional)</label>
            <input
              value={heliusKey}
              onChange={(e) => setHeliusKey(e.target.value)}
              placeholder="Helius key"
              className="w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm text-slate-200"
            />
            <label className="text-xs text-slate-500">Solana RPC URL</label>
            <input
              value={solRpc}
              onChange={(e) => setSolRpc(e.target.value)}
              placeholder="https://api.mainnet-beta.solana.com"
              className="w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm text-slate-200"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={saveSettings}
          className="rounded-lg border border-mint-500/50 px-4 py-2 text-sm text-mint-300"
        >
          Save API settings
        </button>
        {settingsNote && <div className="text-xs text-amber-400">{settingsNote}</div>}
      </section>
    </div>
  );
}

