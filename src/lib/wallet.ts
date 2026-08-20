import { ASSETS } from "./assets";

export type InjectedProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
};

export type WalletBalance = {
  symbol: string;
  name: string;
  amount: number;
  mapsToSymbol: string;
  contract: string;
};

declare global {
  interface Window {
    ethereum?: InjectedProvider & { providers?: InjectedProvider[] };
  }
}

export const MAX_WALLETS = 8;

export function getInjectedProvider(): InjectedProvider | null {
  if (typeof window === "undefined") return null;
  const eth = window.ethereum;
  if (!eth) return null;
  if (Array.isArray(eth.providers) && eth.providers.length > 0) {
    return eth.providers[0] ?? eth;
  }
  return eth;
}

export function hasInjectedWallet(): boolean {
  return getInjectedProvider() !== null;
}

const MAINNET = "0x1";

export function normalizeAddress(raw: string): string {
  const s = raw.trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(s)) throw new Error("Enter a valid Ethereum address (0x + 40 hex chars).");
  return s.toLowerCase();
}

export async function connectWallet(): Promise<string> {
  const provider = getInjectedProvider();
  if (!provider) {
    throw new Error("No browser wallet found. Paste an address, or open this app with MetaMask or Rabby.");
  }
  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
  const address = accounts[0];
  if (!address) throw new Error("Wallet did not return an account.");
  try {
    const chainId = (await provider.request({ method: "eth_chainId" })) as string;
    if (chainId.toLowerCase() !== MAINNET) {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: MAINNET }],
      });
    }
  } catch {
    // Stay on current chain; RPC reads still use mainnet.
  }
  return normalizeAddress(address);
}

function encodeBalanceOf(owner: string): string {
  const addr = owner.replace(/^0x/i, "").toLowerCase().padStart(64, "0");
  return `0x70a08231${addr}`;
}

function decodeAmount(hex: string, decimals: number): number {
  if (!hex || hex === "0x") return 0;
  try {
    const raw = BigInt(hex);
    const base = 10n ** BigInt(decimals);
    const whole = raw / base;
    const frac = raw % base;
    const fracStr = frac.toString().padStart(decimals, "0").slice(0, 8);
    return Number(`${whole.toString()}.${fracStr}`);
  } catch {
    return 0;
  }
}

const RPCS = [
  "https://cloudflare-eth.com",
  "https://eth.llamarpc.com",
  "https://rpc.ankr.com/eth",
];

async function rpcBatch(calls: { method: string; params: unknown[] }[]): Promise<(string | null)[]> {
  const payload = calls.map((call, i) => ({ jsonrpc: "2.0", id: i, method: call.method, params: call.params }));
  let last = "RPC failed";
  for (const url of RPCS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { accept: "application/json", "content-type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) {
        last = `RPC ${res.status}`;
        continue;
      }
      const json = (await res.json()) as { id?: number; result?: string; error?: { message?: string } }[];
      if (!Array.isArray(json)) {
        last = "RPC bad payload";
        continue;
      }
      const byId = new Map(json.map((row) => [row.id, row]));
      return calls.map((_, i) => {
        const row = byId.get(i);
        if (!row || row.error) return null;
        return typeof row.result === "string" ? row.result : null;
      });
    } catch (err) {
      last = err instanceof Error ? err.message : "RPC failed";
    }
  }
  throw new Error(last);
}

export async function readWalletBalances(address: string): Promise<WalletBalance[]> {
  const owner = normalizeAddress(address);
  const readable = ASSETS.filter((a) => a.ethereum);
  const calls = readable.map((asset) => {
    const token = asset.ethereum!;
    if (token.address === "native") {
      return { method: "eth_getBalance", params: [owner, "latest"] };
    }
    return {
      method: "eth_call",
      params: [{ to: token.address, data: encodeBalanceOf(owner) }, "latest"],
    };
  });
  const hexes = await rpcBatch(calls);
  const results: WalletBalance[] = [];
  readable.forEach((asset, i) => {
    const token = asset.ethereum;
    if (!token) return;
    const amount = decodeAmount(hexes[i] ?? "0x0", token.decimals);
    if (!(amount > 0)) return;
    results.push({
      symbol: asset.symbol,
      name: asset.name,
      amount,
      mapsToSymbol: token.mapsToSymbol ?? asset.symbol,
      contract: token.address === "native" ? "ETH" : token.address,
    });
  });
  return results;
}

export function sumWalletBalances(groups: WalletBalance[][]): Map<string, { amount: number; name: string; symbol: string }> {
  const out = new Map<string, { amount: number; name: string; symbol: string }>();
  for (const group of groups) {
    for (const bal of group) {
      const key = bal.mapsToSymbol;
      const prev = out.get(key);
      if (prev) prev.amount += bal.amount;
      else out.set(key, { amount: bal.amount, name: bal.name, symbol: key });
    }
  }
  return out;
}
