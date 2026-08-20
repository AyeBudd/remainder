import { BAKED_TOP_100 } from "@/lib/baked-assets";

export type EthereumToken = {
  address: `0x${string}` | "native";
  decimals: number;
  /** When set, wallet balances of this token apply to another holding symbol. */
  mapsToSymbol?: string;
};

export type Asset = {
  symbol: string;
  name: string;
  coingeckoId: string;
  decimals: number;
  rank?: number;
  paprikaId?: string;
  coinbasePair?: string;
  ethereum?: EthereumToken;
  binancePair?: string;
};

export const SEED_ASSETS: Asset[] = [
  {
    symbol: "BTC",
    name: "Bitcoin",
    coingeckoId: "bitcoin",
    decimals: 8,
    paprikaId: "btc-bitcoin",
    coinbasePair: "BTC-USD",
    binancePair: "BTCUSDT",
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    coingeckoId: "ethereum",
    decimals: 6,
    paprikaId: "eth-ethereum",
    coinbasePair: "ETH-USD",
    binancePair: "ETHUSDT",
    ethereum: { address: "native", decimals: 18 },
  },
  {
    symbol: "WBTC",
    name: "Wrapped Bitcoin",
    coingeckoId: "wrapped-bitcoin",
    decimals: 8,
    paprikaId: "wbtc-wrapped-bitcoin",
    binancePair: "WBTCUSDT",
    ethereum: {
      address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
      decimals: 8,
      mapsToSymbol: "BTC",
    },
  },
  {
    symbol: "WETH",
    name: "Wrapped Ether",
    coingeckoId: "weth",
    decimals: 6,
    paprikaId: "weth-weth",
    binancePair: "WETHUSDT",
    ethereum: {
      address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      decimals: 18,
      mapsToSymbol: "ETH",
    },
  },
  {
    symbol: "stETH",
    name: "Lido Staked ETH",
    coingeckoId: "staked-ether",
    decimals: 6,
    paprikaId: "steth-lido-staked-ether",
    ethereum: { address: "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84", decimals: 18 },
  },
  {
    symbol: "SOL",
    name: "Solana",
    coingeckoId: "solana",
    decimals: 4,
    paprikaId: "sol-solana",
    coinbasePair: "SOL-USD",
    binancePair: "SOLUSDT",
  },
  {
    symbol: "BNB",
    name: "BNB",
    coingeckoId: "binancecoin",
    decimals: 4,
    paprikaId: "bnb-binance-coin",
    binancePair: "BNBUSDT",
  },
  {
    symbol: "XRP",
    name: "XRP",
    coingeckoId: "ripple",
    decimals: 2,
    paprikaId: "xrp-xrp",
    coinbasePair: "XRP-USD",
    binancePair: "XRPUSDT",
  },
  {
    symbol: "ADA",
    name: "Cardano",
    coingeckoId: "cardano",
    decimals: 2,
    paprikaId: "ada-cardano",
    coinbasePair: "ADA-USD",
    binancePair: "ADAUSDT",
  },
  {
    symbol: "DOGE",
    name: "Dogecoin",
    coingeckoId: "dogecoin",
    decimals: 0,
    paprikaId: "doge-dogecoin",
    coinbasePair: "DOGE-USD",
    binancePair: "DOGEUSDT",
  },
  {
    symbol: "AVAX",
    name: "Avalanche",
    coingeckoId: "avalanche-2",
    decimals: 3,
    paprikaId: "avax-avalanche",
    coinbasePair: "AVAX-USD",
    binancePair: "AVAXUSDT",
  },
  {
    symbol: "LINK",
    name: "Chainlink",
    coingeckoId: "chainlink",
    decimals: 3,
    paprikaId: "link-chainlink",
    coinbasePair: "LINK-USD",
    binancePair: "LINKUSDT",
    ethereum: { address: "0x514910771AF9Ca656af840dff83E8264EcF986CA", decimals: 18 },
  },
  {
    symbol: "UNI",
    name: "Uniswap",
    coingeckoId: "uniswap",
    decimals: 3,
    paprikaId: "uni-uniswap",
    coinbasePair: "UNI-USD",
    binancePair: "UNIUSDT",
    ethereum: { address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", decimals: 18 },
  },
  {
    symbol: "AAVE",
    name: "Aave",
    coingeckoId: "aave",
    decimals: 3,
    paprikaId: "aave-new",
    coinbasePair: "AAVE-USD",
    binancePair: "AAVEUSDT",
    ethereum: { address: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9", decimals: 18 },
  },
  {
    symbol: "POL",
    name: "Polygon",
    coingeckoId: "matic-network",
    decimals: 2,
    paprikaId: "pol-polygon-ecosystem-token",
    coinbasePair: "POL-USD",
    binancePair: "POLUSDT",
    ethereum: { address: "0x455e53CBB86018Ac2B8092FdCd39d8444aFFC3F6", decimals: 18 },
  },
  {
    symbol: "ARB",
    name: "Arbitrum",
    coingeckoId: "arbitrum",
    decimals: 2,
    paprikaId: "arb-arbitrum",
    coinbasePair: "ARB-USD",
    binancePair: "ARBUSDT",
    ethereum: { address: "0xB50721BCf8d664c30412Cfbc6cf7a15145234ad1", decimals: 18 },
  },
  {
    symbol: "OP",
    name: "Optimism",
    coingeckoId: "optimism",
    decimals: 2,
    paprikaId: "op-optimism",
    coinbasePair: "OP-USD",
    binancePair: "OPUSDT",
  },
  {
    symbol: "SUI",
    name: "Sui",
    coingeckoId: "sui",
    decimals: 2,
    paprikaId: "sui-sui",
    coinbasePair: "SUI-USD",
    binancePair: "SUIUSDT",
  },
  {
    symbol: "TON",
    name: "Toncoin",
    coingeckoId: "the-open-network",
    decimals: 2,
    paprikaId: "toncoin-the-open-network",
    binancePair: "TONUSDT",
  },
  {
    symbol: "ATOM",
    name: "Cosmos",
    coingeckoId: "cosmos",
    decimals: 3,
    paprikaId: "atom-cosmos",
    coinbasePair: "ATOM-USD",
    binancePair: "ATOMUSDT",
  },
  {
    symbol: "NEAR",
    name: "NEAR",
    coingeckoId: "near",
    decimals: 2,
    paprikaId: "near-near-protocol",
    coinbasePair: "NEAR-USD",
    binancePair: "NEARUSDT",
  },
  {
    symbol: "APT",
    name: "Aptos",
    coingeckoId: "aptos",
    decimals: 3,
    paprikaId: "apt-aptos",
    coinbasePair: "APT-USD",
    binancePair: "APTUSDT",
  },
  {
    symbol: "LTC",
    name: "Litecoin",
    coingeckoId: "litecoin",
    decimals: 4,
    paprikaId: "ltc-litecoin",
    coinbasePair: "LTC-USD",
    binancePair: "LTCUSDT",
  },
  {
    symbol: "BCH",
    name: "Bitcoin Cash",
    coingeckoId: "bitcoin-cash",
    decimals: 4,
    paprikaId: "bch-bitcoin-cash",
    coinbasePair: "BCH-USD",
    binancePair: "BCHUSDT",
  },
  {
    symbol: "DOT",
    name: "Polkadot",
    coingeckoId: "polkadot",
    decimals: 3,
    coinbasePair: "DOT-USD",
    binancePair: "DOTUSDT",
  },
  {
    symbol: "FIL",
    name: "Filecoin",
    coingeckoId: "filecoin",
    decimals: 3,
    paprikaId: "fil-filecoin",
    coinbasePair: "FIL-USD",
    binancePair: "FILUSDT",
  },
  {
    symbol: "SHIB",
    name: "Shiba Inu",
    coingeckoId: "shiba-inu",
    decimals: 0,
    paprikaId: "shib-shiba-inu",
    coinbasePair: "SHIB-USD",
    binancePair: "SHIBUSDT",
    ethereum: { address: "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE", decimals: 18 },
  },
  {
    symbol: "PEPE",
    name: "Pepe",
    coingeckoId: "pepe",
    decimals: 0,
    paprikaId: "pepe-pepe",
    binancePair: "PEPEUSDT",
    ethereum: { address: "0x6982508145454Ce325dDbE47a25d4ec3d2311933", decimals: 18 },
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    coingeckoId: "usd-coin",
    decimals: 2,
    paprikaId: "usdc-usd-coin",
    coinbasePair: "USDC-USD",
    binancePair: "USDCUSDT",
    ethereum: { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6 },
  },
  {
    symbol: "USDT",
    name: "Tether",
    coingeckoId: "tether",
    decimals: 2,
    paprikaId: "usdt-tether",
    ethereum: { address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6 },
  },
];

const STABLE = new Set([
  "USDT",
  "USDC",
  "USDE",
  "DAI",
  "PYUSD",
  "FDUSD",
  "TUSD",
  "USDD",
  "USDG",
  "GHO",
  "RLUSD",
  "BFUSD",
  "EURC",
  "EUROC",
  "FRAX",
  "USDS",
  "SUSDS",
  "SUSDE",
]);

export function decimalsForPrice(price: number, symbol: string): number {
  if (STABLE.has(symbol.toUpperCase())) return 2;
  if (symbol === "BTC" || symbol === "WBTC" || symbol === "CBBTC" || symbol === "LBTC") return 8;
  if (price >= 1000) return 6;
  if (price >= 10) return 4;
  if (price >= 0.1) return 3;
  if (price >= 0.01) return 2;
  return 0;
}

export function overlaySeedFromLive(live: Asset[]): Asset[] {
  return overlaySeed(live, SEED_ASSETS);
}

function overlaySeed(live: Asset[], seed: Asset[]): Asset[] {
  const seedByGecko = new Map(seed.map((s) => [s.coingeckoId, s]));
  const seedBySymbol = new Map(seed.map((s) => [s.symbol.toUpperCase(), s]));
  const used = new Set<string>();
  const out: Asset[] = live.map((row) => {
    const match = seedByGecko.get(row.coingeckoId) ?? seedBySymbol.get(row.symbol.toUpperCase());
    if (!match) return row;
    used.add(match.coingeckoId);
    return {
      ...match,
      symbol: row.symbol,
      name: row.name,
      coingeckoId: row.coingeckoId,
      rank: row.rank,
      decimals: match.decimals,
      coinbasePair: match.coinbasePair ?? row.coinbasePair,
      binancePair: match.binancePair ?? row.binancePair,
    };
  });
  for (const extra of seed) {
    if (!used.has(extra.coingeckoId) && !out.some((a) => a.symbol === extra.symbol)) {
      out.push(extra);
    }
  }
  return out;
}

export function catalogFromBaked(): Asset[] {
  const live: Asset[] = BAKED_TOP_100.map((row) => ({
    symbol: row.symbol,
    name: row.name,
    coingeckoId: row.coingeckoId,
    decimals: STABLE.has(row.symbol) ? 2 : row.decimals,
    rank: row.rank,
    coinbasePair: row.coinbasePair,
    binancePair: row.binancePair,
  }));
  return overlaySeed(live, SEED_ASSETS);
}

let activeCatalog: Asset[] = catalogFromBaked();

export function getActiveCatalog(): Asset[] {
  return activeCatalog;
}

export function setActiveCatalog(next: Asset[]): void {
  if (next.length === 0) return;
  activeCatalog = overlaySeed(next, SEED_ASSETS);
}

export const ASSETS: Asset[] = catalogFromBaked();

export const ASSET_BY_SYMBOL = new Map(ASSETS.map((a) => [a.symbol, a]));
export const ASSET_BY_COINGECKO = new Map(ASSETS.map((a) => [a.coingeckoId, a]));

export function getAsset(symbol: string): Asset | undefined {
  const key = symbol.toUpperCase();
  return getActiveCatalog().find((a) => a.symbol.toUpperCase() === key) ?? ASSET_BY_SYMBOL.get(key);
}

export function remainingCoins(current: number, target: number): number {
  return Math.max(0, target - current);
}

export function fillRatio(current: number, target: number): number {
  if (target <= 0) return current > 0 ? 1 : 0;
  return current / target;
}
