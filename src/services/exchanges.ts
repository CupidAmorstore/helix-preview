import type { ExchangeId } from '../types';

export type ExchangeCredentials = {
  apiKey: string;
  secret: string;
  passphrase?: string;
};

export const EXCHANGE_LABELS: Record<ExchangeId, string> = {
  binance: 'Binance',
  coinbase: 'Coinbase',
  kraken: 'Kraken'
};

export async function fetchExchangeBalances(exchangeId: ExchangeId, creds: ExchangeCredentials) {
  void exchangeId;
  void creds;
  throw new Error('Exchange sync requires a server-side connector and is not available in this web preview.');
}

export async function fetchExchangeHistory(exchangeId: ExchangeId, creds: ExchangeCredentials) {
  void exchangeId;
  void creds;
  throw new Error('Exchange history requires a server-side connector and is not available in this web preview.');
}
