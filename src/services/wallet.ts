import * as bip39 from 'bip39';
import * as bitcoin from 'bitcoinjs-lib';
import { BIP32Factory } from 'bip32';
import { ECPairFactory } from 'ecpair';
import * as ecc from '@bitcoinerlab/secp256k1';
import { derivePath } from 'ed25519-hd-key';
import { Buffer } from 'buffer';
import { Keypair, Connection, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { Wallet, JsonRpcProvider, parseEther } from 'ethers';

const bip32 = BIP32Factory(ecc);
const ECPair = ECPairFactory(ecc);

export type WalletNetwork = 'mainnet' | 'testnet';

export async function generateMnemonic(wordCount: 12 | 24) {
  const strength = wordCount === 24 ? 256 : 128;
  return bip39.generateMnemonic(strength);
}

export async function validateMnemonic(mnemonic: string) {
  return bip39.validateMnemonic(mnemonic.trim());
}

function btcNetwork(network: WalletNetwork) {
  return network === 'mainnet' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
}

export async function deriveAddresses(mnemonic: string, network: WalletNetwork) {
  const seed = await bip39.mnemonicToSeed(mnemonic);
  const root = bip32.fromSeed(seed, btcNetwork(network));
  const path = network === 'mainnet' ? "m/84'/0'/0'/0/0" : "m/84'/1'/0'/0/0";
  const child = root.derivePath(path);
  const btcPayment = bitcoin.payments.p2wpkh({ pubkey: child.publicKey, network: btcNetwork(network) });
  const btcAddress = btcPayment.address ?? '';
  const btcPrivateKey = child.privateKey?.toString('hex') ?? '';

  const ethWallet = Wallet.fromPhrase(mnemonic, "m/44'/60'/0'/0/0");

  const solSeed = await bip39.mnemonicToSeed(mnemonic);
  const derived = derivePath("m/44'/501'/0'/0'", solSeed.toString('hex'));
  const solKeypair = Keypair.fromSeed(derived.key);

  return {
    btc: { address: btcAddress, privateKey: btcPrivateKey },
    eth: { address: ethWallet.address, privateKey: ethWallet.privateKey },
    sol: { address: solKeypair.publicKey.toBase58(), secretKey: Buffer.from(solKeypair.secretKey).toString('hex') }
  };
}

export async function fetchBtcUtxos(address: string, network: WalletNetwork) {
  const base = network === 'mainnet' ? 'https://blockstream.info/api' : 'https://blockstream.info/testnet/api';
  const res = await fetch(`${base}/address/${address}/utxo`);
  if (!res.ok) throw new Error('Failed to fetch UTXOs');
  return res.json();
}

export async function fetchBtcFeeRate(network: WalletNetwork) {
  const base = network === 'mainnet' ? 'https://blockstream.info/api' : 'https://blockstream.info/testnet/api';
  const res = await fetch(`${base}/fee-estimates`);
  if (!res.ok) throw new Error('Failed to fetch fee estimates');
  return res.json();
}

export async function buildAndSignBtcTx(params: {
  mnemonic: string;
  toAddress: string;
  amountSats: number;
  feeRate: number;
  network: WalletNetwork;
}) {
  const { mnemonic, toAddress, amountSats, feeRate, network } = params;
  const { btc } = await deriveAddresses(mnemonic, network);
  const utxos = await fetchBtcUtxos(btc.address, network);
  if (!utxos.length) throw new Error('No UTXOs found');

  const utxo = utxos.sort((a: any, b: any) => b.value - a.value)[0];
  const keyPair = ECPair.fromPrivateKey(Buffer.from(btc.privateKey, 'hex'));
  const payment = bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey, network: btcNetwork(network) });
  if (!payment.output) throw new Error('Failed to build payment script');

  const estimatedVbytes = 141;
  const fee = Math.ceil(estimatedVbytes * feeRate);
  const change = utxo.value - amountSats - fee;
  if (change < 0) throw new Error('Insufficient balance for amount + fee');

  const psbt = new bitcoin.Psbt({ network: btcNetwork(network) });
  psbt.addInput({
    hash: utxo.txid,
    index: utxo.vout,
    witnessUtxo: {
      script: payment.output,
      value: utxo.value
    }
  });
  psbt.addOutput({ address: toAddress, value: amountSats });
  if (change > 0) {
    psbt.addOutput({ address: btc.address, value: change });
  }
  psbt.signInput(0, keyPair);
  psbt.finalizeAllInputs();
  const tx = psbt.extractTransaction();
  return tx.toHex();
}

export async function broadcastBtcTx(rawTx: string, network: WalletNetwork) {
  const base = network === 'mainnet' ? 'https://blockstream.info/api' : 'https://blockstream.info/testnet/api';
  const res = await fetch(`${base}/tx`, { method: 'POST', body: rawTx });
  if (!res.ok) throw new Error('Broadcast failed');
  return res.text();
}

export async function sendEthTransaction(params: {
  mnemonic: string;
  toAddress: string;
  amountEth: string;
  rpcUrl: string;
}) {
  const provider = new JsonRpcProvider(params.rpcUrl);
  const wallet = Wallet.fromPhrase(params.mnemonic).connect(provider);
  const tx = await wallet.sendTransaction({
    to: params.toAddress,
    value: parseEther(params.amountEth)
  });
  return tx.hash;
}

export async function sendSolTransaction(params: {
  mnemonic: string;
  toAddress: string;
  amountSol: number;
  rpcUrl: string;
}) {
  const seed = await bip39.mnemonicToSeed(params.mnemonic);
  const derived = derivePath("m/44'/501'/0'/0'", seed.toString('hex'));
  const keypair = Keypair.fromSeed(derived.key);
  const connection = new Connection(params.rpcUrl, 'confirmed');
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: keypair.publicKey,
      toPubkey: new PublicKey(params.toAddress),
      lamports: Math.round(params.amountSol * 1e9)
    })
  );
  tx.feePayer = keypair.publicKey;
  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;
  tx.sign(keypair);
  const signature = await connection.sendRawTransaction(tx.serialize());
  return signature;
}

