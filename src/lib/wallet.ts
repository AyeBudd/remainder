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

export async function connectWallet(): Promise<string> {
  const provider = getInjectedProvider();
  if (!provider) {
    throw new Error("No browser wallet found. Use manual holdings, or open this app in a browser with MetaMask or Rabby.");
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
    // Stay on current chain; balances may be empty / wrong, caller still gets the address.
  }
  return address;
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

export async function readWalletBalances(address: string): Promise<WalletBalance[]> {
  const provider = getInjectedProvider();
  if (!provider) throw new Error("Wallet disconnected.");

  const readable = ASSETS.filter((a) => a.ethereum);
  const results: WalletBalance[] = [];

  for (const asset of readable) {
    const token = asset.ethereum;
    if (!token) continue;
    try {
      let hex: string;
      if (token.address === "native") {
        hex = (await provider.request({
          method: "eth_getBalance",
          params: [address, "latest"],
        })) as string;
      } else {
        hex = (await provider.request({
          method: "eth_call",
          params: [
            { to: token.address, data: encodeBalanceOf(address) },
            "latest",
          ],
        })) as string;
      }
      const amount = decodeAmount(hex, token.decimals);
      if (amount > 0) {
        results.push({
          symbol: asset.symbol,
          name: asset.name,
          amount,
          mapsToSymbol: token.mapsToSymbol ?? asset.symbol,
          contract: token.address === "native" ? "ETH" : token.address,
        });
      }
    } catch {
      // Skip tokens the node rejects
    }
  }

  return results;
}
