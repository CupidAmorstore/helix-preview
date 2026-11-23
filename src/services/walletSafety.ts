// Pre-send checks: right address format for the chain AND the selected network, and an RPC that is
// actually on that network. Nothing is signed until these pass.
import * as bitcoin from 'bitcoinjs-lib';
import { isAddress } from 'ethers';
import { PublicKey } from '@solana/web3.js';
import type { WalletNetwork } from '../types';
import { btcFetch } from './btcApi';

export type Chain = 'btc' | 'eth' | 'sol';

export const DEFAULT_RPC: Record<'eth' | 'sol', Record<WalletNetwork, string>> = {
  eth: { testnet: 'https://ethereum-sepolia.publicnode.com', mainnet: 'https://ethereum.publicnode.com' },
  sol: { testnet: 'https://api.devnet.solana.com', mainnet: 'https://api.mainnet-beta.solana.com' }
};

export const NETWORK_LABEL: Record<Chain, Record<WalletNetwork, string>> = {
  btc: { testnet: 'Bitcoin testnet', mainnet: 'Bitcoin' },
  eth: { testnet: 'Ethereum Sepolia (test)', mainnet: 'Ethereum mainnet' },
  sol: { testnet: 'Solana devnet (test)', mainnet: 'Solana mainnet' }
};

export const ETH_CHAIN_ID: Record<WalletNetwork, bigint> = { testnet: 11155111n, mainnet: 1n };
export const SOL_GENESIS: Record<WalletNetwork, string> = {
  testnet: 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG', // devnet
  mainnet: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d'
};

/** Returns an error message, or null when the address is valid for this chain and network. */
export function validateAddress(chain: Chain, address: string, network: WalletNetwork): string | null {
  const a = address.trim();
  if (!a) return 'Enter a recipient address';
  if (chain === 'btc') {
    try {
      bitcoin.address.toOutputScript(a, network === 'mainnet' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet);
      return null;
    } catch {
      try {
        bitcoin.address.toOutputScript(a, network === 'mainnet' ? bitcoin.networks.testnet : bitcoin.networks.bitcoin);
        return network === 'mainnet' ? 'This is a testnet address. Switch to Testnet or use a mainnet address.' : 'This is a real (mainnet) Bitcoin address. Use a testnet address.';
      } catch {
        return 'Not a valid Bitcoin address';
      }
    }
  }
  if (chain === 'eth') return isAddress(a) ? null : 'Not a valid Ethereum address';
  try {
    const pk = new PublicKey(a);
    return PublicKey.isOnCurve(pk.toBytes()) ? null : 'This Solana address cannot receive transfers (not a wallet address)';
  } catch {
    return 'Not a valid Solana address';
  }
}

export function validateAmount(amount: string): string | null {
  const n = Number(amount);
  if (!amount.trim() || !Number.isFinite(n) || n <= 0) return 'Enter an amount greater than zero';
  return null;
}

async function rpc(url: string, method: string, params: unknown[] = []) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
  if (!res.ok) throw new Error(`RPC ${method} failed (${res.status})`);
  const j = await res.json();
  if (j.error) throw new Error(j.error.message || `RPC ${method} error`);
  return j.result;
}

/** Confirms the RPC endpoint is on the selected network before anything is signed. */
export async function checkRpcNetwork(chain: 'eth' | 'sol', url: string, network: WalletNetwork): Promise<string | null> {
  try {
    if (chain === 'eth') {
      const id = BigInt(await rpc(url, 'eth_chainId'));
      return id === ETH_CHAIN_ID[network] ? null : `This RPC is on chain ${id}, not ${NETWORK_LABEL.eth[network]}. Nothing was sent.`;
    }
    const g = await rpc(url, 'getGenesisHash');
    return g === SOL_GENESIS[network] ? null : `This RPC is not on ${NETWORK_LABEL.sol[network]}. Nothing was sent.`;
  } catch (e) {
    return `Could not verify the network (${(e as Error).message}). Nothing was sent.`;
  }
}

export async function fetchBalance(chain: Chain, address: string, network: WalletNetwork, rpcUrl?: string): Promise<number> {
  if (chain === 'btc') {
    const res = await btcFetch(network, `/address/${address}`);
    if (!res.ok) throw new Error('Balance unavailable');
    const j = await res.json();
    const sats = j.chain_stats.funded_txo_sum - j.chain_stats.spent_txo_sum + j.mempool_stats.funded_txo_sum - j.mempool_stats.spent_txo_sum;
    return sats / 1e8;
  }
  if (chain === 'eth') return Number(BigInt(await rpc(rpcUrl ?? DEFAULT_RPC.eth[network], 'eth_getBalance', [address, 'latest']))) / 1e18;
  const r = await rpc(rpcUrl ?? DEFAULT_RPC.sol[network], 'getBalance', [address]);
  return (r?.value ?? 0) / 1e9;
}

export type TxSummary = { id: string; when: number | null; amount: number | null; confirmed: boolean; url: string };

export async function fetchHistory(chain: Chain, address: string, network: WalletNetwork, rpcUrl?: string): Promise<TxSummary[] | 'unsupported'> {
  if (chain === 'btc') {
    const res = await btcFetch(network, `/address/${address}/txs`);
    if (!res.ok) throw new Error('History unavailable');
    const txs = (await res.json()) as { txid: string; status: { confirmed: boolean; block_time?: number }; vin: { prevout?: { scriptpubkey_address?: string; value: number } }[]; vout: { scriptpubkey_address?: string; value: number }[] }[];
    return txs.slice(0, 10).map((t) => {
      const inn = t.vout.filter((o) => o.scriptpubkey_address === address).reduce((s, o) => s + o.value, 0);
      const out = t.vin.filter((i) => i.prevout?.scriptpubkey_address === address).reduce((s, i) => s + (i.prevout?.value ?? 0), 0);
      return {
        id: t.txid, when: t.status.block_time ? t.status.block_time * 1000 : null, amount: (inn - out) / 1e8, confirmed: t.status.confirmed,
        url: `https://blockstream.info/${network === 'mainnet' ? '' : 'testnet/'}tx/${t.txid}`
      };
    });
  }
  if (chain === 'sol') {
    const sigs = (await rpc(rpcUrl ?? DEFAULT_RPC.sol[network], 'getSignaturesForAddress', [address, { limit: 10 }])) as { signature: string; blockTime: number | null; confirmationStatus: string; err: unknown }[];
    return sigs.map((s) => ({
      id: s.signature, when: s.blockTime ? s.blockTime * 1000 : null, amount: null, confirmed: s.confirmationStatus === 'finalized' && !s.err,
      url: `https://explorer.solana.com/tx/${s.signature}${network === 'mainnet' ? '' : '?cluster=devnet'}`
    }));
  }
  return 'unsupported';
}

export function explorerAddressUrl(chain: Chain, address: string, network: WalletNetwork) {
  if (chain === 'btc') return `https://blockstream.info/${network === 'mainnet' ? '' : 'testnet/'}address/${address}`;
  if (chain === 'eth') return `https://${network === 'mainnet' ? '' : 'sepolia.'}etherscan.io/address/${address}`;
  return `https://explorer.solana.com/address/${address}${network === 'mainnet' ? '' : '?cluster=devnet'}`;
}
