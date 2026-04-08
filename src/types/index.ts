export type ExchangeId = 'binance' | 'coinbase' | 'kraken';

export type ChainId = 'btc' | 'eth' | 'sol';
export type WalletNetwork = 'mainnet' | 'testnet';

export interface EncryptedPayload {
  cipher: string;
  iv: string;
  salt: string;
  version: number;
}

export interface ExchangeRecord {
  id: string;
  exchange: ExchangeId;
  label: string;
  createdAt: string;
  payload: EncryptedPayload;
}

export interface AddressRecord {
  id: string;
  chain: ChainId;
  address: string;
  label: string;
  tokenContracts?: string[];
  createdAt: string;
}

export interface AlertRecord {
  id: string;
  symbol: string;
  direction: 'above' | 'below';
  threshold: number;
  enabled: boolean;
  createdAt: string;
}

export interface SnapshotRecord {
  id: string;
  date: string;
  totalUsd: number;
  assets: Record<string, number>;
}

export interface KeystoreRecord {
  id: 'default';
  createdAt: string;
  wordCount: 12 | 24;
  payload: EncryptedPayload;
}

export interface VaultState {
  locked: boolean;
  hasVault: boolean;
  unlock: (password: string) => Promise<void>;
  lock: () => void;
  encrypt: (data: string) => Promise<EncryptedPayload>;
  decrypt: (payload: EncryptedPayload) => Promise<string>;
}

