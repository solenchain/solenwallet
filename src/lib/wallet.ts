import * as ed25519 from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";

// ed25519 v3 requires sha512 configured for async operations
(ed25519.etc as Record<string, unknown>).sha512Async = async (...m: Uint8Array[]) =>
  sha512(ed25519.etc.concatBytes(...m));

export interface Keypair {
  publicKey: string; // hex
  secretKey: string; // hex (64 bytes: 32 secret + 32 public)
}

export interface WalletAccount {
  name: string;
  accountId: string; // hex, derived from public key
  publicKey: string;
  secretKey: string; // encrypted or raw for now
}

export async function generateKeypair(): Promise<Keypair> {
  const privKey = ed25519.utils.randomSecretKey();
  const pubKey = await ed25519.getPublicKeyAsync(privKey);
  return {
    publicKey: bytesToHex(pubKey),
    secretKey: bytesToHex(privKey) + bytesToHex(pubKey),
  };
}

export async function keypairFromSecret(secretHex: string): Promise<Keypair> {
  const privBytes = hexToBytes(secretHex.slice(0, 64));
  const pubKey = await ed25519.getPublicKeyAsync(privBytes);
  return {
    publicKey: bytesToHex(pubKey),
    secretKey: secretHex.slice(0, 64) + bytesToHex(pubKey),
  };
}

export async function signMessage(secretHex: string, message: Uint8Array): Promise<string> {
  const privBytes = hexToBytes(secretHex.slice(0, 64));
  const sig = await ed25519.signAsync(message, privBytes);
  return bytesToHex(sig);
}

export function publicKeyToAccountId(pubKeyHex: string): string {
  // Account ID is the public key hex padded to 64 chars
  return pubKeyHex.padStart(64, "0");
}

const STORAGE_KEY = "solen_wallet_accounts";

export function loadAccounts(): WalletAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveAccounts(accounts: WalletAccount[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

export async function createAccount(name: string): Promise<WalletAccount> {
  const kp = await generateKeypair();
  return {
    name,
    accountId: publicKeyToAccountId(kp.publicKey),
    publicKey: kp.publicKey,
    secretKey: kp.secretKey,
  };
}

export async function importAccount(name: string, secretKey: string): Promise<WalletAccount> {
  const kp = await keypairFromSecret(secretKey);
  return {
    name,
    accountId: publicKeyToAccountId(kp.publicKey),
    publicKey: kp.publicKey,
    secretKey: kp.secretKey,
  };
}

export function formatBalance(raw: string): string {
  const num = BigInt(raw || "0");
  const decimals = 8;
  const divisor = BigInt(10 ** decimals);
  const whole = num / divisor;
  const frac = num % divisor;
  const fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "");
  return fracStr ? `${whole}.${fracStr}` : whole.toString();
}

export function parseAmount(amount: string): string {
  const decimals = 8;
  const parts = amount.split(".");
  const whole = BigInt(parts[0] || "0");
  const fracStr = (parts[1] || "").padEnd(decimals, "0").slice(0, decimals);
  const frac = BigInt(fracStr);
  return (whole * BigInt(10 ** decimals) + frac).toString();
}
