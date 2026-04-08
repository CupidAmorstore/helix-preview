const BTC_API = {
  mainnet: 'https://blockstream.info/api',
  testnet: 'https://blockstream.info/testnet/api'
};

export async function fetchBtcBalance(address: string, network: 'mainnet' | 'testnet') {
  const res = await fetch(`${BTC_API[network]}/address/${address}`);
  if (!res.ok) throw new Error('BTC address lookup failed');
  const data = await res.json();
  const funded = data.chain_stats?.funded_txo_sum ?? 0;
  const spent = data.chain_stats?.spent_txo_sum ?? 0;
  const balanceSats = funded - spent;
  return { balanceSats, balanceBtc: balanceSats / 1e8 };
}

export async function fetchEthBalance(address: string, apiKey: string) {
  if (!apiKey) throw new Error('Missing Etherscan API key');
  const url = `https://api.etherscan.io/api?module=account&action=balance&address=${address}&tag=latest&apikey=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Etherscan balance failed');
  const data = await res.json();
  if (data.status !== '1') throw new Error(data.message || 'Etherscan error');
  const wei = BigInt(data.result);
  return { wei, eth: Number(wei) / 1e18 };
}

export async function fetchErc20Balances(address: string, contracts: string[], apiKey: string) {
  if (!apiKey) throw new Error('Missing Etherscan API key');
  const results: { contract: string; balance: string }[] = [];
  for (const contract of contracts) {
    const url = `https://api.etherscan.io/api?module=account&action=tokenbalance&contractaddress=${contract}&address=${address}&tag=latest&apikey=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) continue;
    const data = await res.json();
    if (data.status !== '1') continue;
    results.push({ contract, balance: data.result });
  }
  return results;
}

export async function fetchSolBalance(address: string, rpc: string) {
  const res = await fetch(rpc, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getBalance',
      params: [address]
    })
  });
  if (!res.ok) throw new Error('Solana RPC failed');
  const data = await res.json();
  const lamports = data.result?.value ?? 0;
  return { lamports, sol: lamports / 1e9 };
}

export async function fetchSolTokens(address: string, rpc: string) {
  const res = await fetch(rpc, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getTokenAccountsByOwner',
      params: [address, { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' }, { encoding: 'jsonParsed' }]
    })
  });
  if (!res.ok) throw new Error('Solana token RPC failed');
  const data = await res.json();
  const accounts = data.result?.value ?? [];
  return accounts.map((acc: any) => ({
    mint: acc.account?.data?.parsed?.info?.mint,
    amount: acc.account?.data?.parsed?.info?.tokenAmount?.uiAmount ?? 0
  }));
}

