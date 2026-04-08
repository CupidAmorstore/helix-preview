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
  const mod = await import('ccxt');
  const ccxt: any = mod.default ?? mod;
  const ExchangeClass = ccxt[exchangeId];
  if (!ExchangeClass) throw new Error('Exchange not supported in CCXT browser build');
  const exchange = new ExchangeClass({
    apiKey: creds.apiKey,
    secret: creds.secret,
    password: creds.passphrase,
    enableRateLimit: true
  });
  exchange.timeout = 15000;
  const balance = await exchange.fetchBalance();
  return balance;
}

export async function fetchExchangeHistory(exchangeId: ExchangeId, creds: ExchangeCredentials) {
  const mod = await import('ccxt');
  const ccxt: any = mod.default ?? mod;
  const ExchangeClass = ccxt[exchangeId];
  if (!ExchangeClass) throw new Error('Exchange not supported in CCXT browser build');
  const exchange = new ExchangeClass({
    apiKey: creds.apiKey,
    secret: creds.secret,
    password: creds.passphrase,
    enableRateLimit: true
  });
  exchange.timeout = 15000;
  const [trades, orders] = await Promise.all([
    exchange.fetchMyTrades(),
    exchange.fetchOpenOrders()
  ]);
  return { trades, orders };
}

