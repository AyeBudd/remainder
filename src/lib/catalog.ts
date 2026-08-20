import { createServerFn } from "@tanstack/react-start";
import {
  catalogFromBaked,
  decimalsForPrice,
  overlaySeedFromLive,
  type Asset,
} from "./assets";
import { BAKED_TOP_100 } from "@/lib/baked-assets";

export type MarketPayload = {
  assets: Asset[];
  prices: Record<string, number>;
  changes: Record<string, number>;
  updatedAt: number;
  source: "coingecko" | "coinlore" | "paprika" | "baked";
};

const CACHE_MS = 45_000;
let cache: MarketPayload | null = null;

const COINLORE_NAMEID: Record<string, string> = Object.fromEntries(
  BAKED_TOP_100.map((a) => [a.coingeckoId, a.coingeckoId]),
);

function geckoFromSymbol(symbol: string, nameid?: string): string {
  const baked = BAKED_TOP_100.find((a) => a.symbol === symbol.toUpperCase());
  if (baked) return baked.coingeckoId;
  if (nameid && COINLORE_NAMEID[nameid]) return COINLORE_NAMEID[nameid];
  return nameid || symbol.toLowerCase();
}

function toRatio(raw: unknown): number | undefined {
  const n = Number(raw);
  if (!Number.isFinite(n)) return undefined;
  return n / 100;
}

function toAsset(row: {
  symbol: string;
  name: string;
  coingeckoId: string;
  rank: number;
  price: number;
}): Asset {
  const symbol = row.symbol.toUpperCase();
  const baked = BAKED_TOP_100.find((a) => a.symbol === symbol);
  return {
    symbol,
    name: row.name,
    coingeckoId: row.coingeckoId,
    decimals: decimalsForPrice(row.price, symbol),
    rank: row.rank,
    coinbasePair: baked?.coinbasePair,
    binancePair: baked?.binancePair,
  };
}

async function fromCoinGecko(force = false): Promise<MarketPayload> {
  const url =
    "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false" +
    (force ? `&t=${Date.now()}` : "");
  const res = await fetch(url, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`coingecko ${res.status}`);
  const rows = (await res.json()) as {
    id: string;
    symbol: string;
    name: string;
    current_price?: number;
    market_cap_rank?: number;
    price_change_percentage_24h?: number;
  }[];
  if (!Array.isArray(rows) || rows.length < 50) throw new Error("coingecko empty");
  const prices: Record<string, number> = {};
  const changes: Record<string, number> = {};
  const seen = new Set<string>();
  const live: Asset[] = [];
  rows.forEach((row, i) => {
    const symbol = row.symbol.toUpperCase();
    if (!symbol || seen.has(symbol)) return;
    seen.add(symbol);
    const price = Number(row.current_price);
    const asset = toAsset({
      symbol,
      name: row.name,
      coingeckoId: row.id,
      rank: row.market_cap_rank ?? i + 1,
      price,
    });
    live.push(asset);
    if (price > 0) prices[asset.coingeckoId] = price;
    const change = toRatio(row.price_change_percentage_24h);
    if (change != null) changes[asset.coingeckoId] = change;
  });
  return {
    assets: overlaySeedFromLive(live),
    prices,
    changes,
    updatedAt: Date.now(),
    source: "coingecko",
  };
}

async function fromCoinlore(force = false): Promise<MarketPayload> {
  const res = await fetch(
    "https://api.coinlore.net/api/tickers/?start=0&limit=100" + (force ? `&t=${Date.now()}` : ""),
    {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    },
  );
  if (!res.ok) throw new Error(`coinlore ${res.status}`);
  const json = (await res.json()) as {
    data?: {
      symbol: string;
      name: string;
      nameid: string;
      rank: number;
      price_usd: string;
      percent_change_24h?: string | number;
    }[];
  };
  const rows = json.data ?? [];
  if (rows.length < 50) throw new Error("coinlore empty");
  const prices: Record<string, number> = {};
  const changes: Record<string, number> = {};
  const seen = new Set<string>();
  const live: Asset[] = [];
  for (const row of rows) {
    const symbol = String(row.symbol || "").toUpperCase();
    if (!symbol || seen.has(symbol)) continue;
    seen.add(symbol);
    const price = Number(row.price_usd);
    const asset = toAsset({
      symbol,
      name: row.name,
      coingeckoId: geckoFromSymbol(symbol, row.nameid),
      rank: Number(row.rank) || live.length + 1,
      price,
    });
    live.push(asset);
    if (price > 0) prices[asset.coingeckoId] = price;
    const change = toRatio(row.percent_change_24h);
    if (change != null) changes[asset.coingeckoId] = change;
  }
  return {
    assets: overlaySeedFromLive(live),
    prices,
    changes,
    updatedAt: Date.now(),
    source: "coinlore",
  };
}

async function fromPaprika(force = false): Promise<MarketPayload> {
  const res = await fetch(
    "https://api.coinpaprika.com/v1/tickers?quotes=USD" + (force ? `&t=${Date.now()}` : ""),
    {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    },
  );
  if (!res.ok) throw new Error(`paprika ${res.status}`);
  const rows = (await res.json()) as {
    id: string;
    symbol: string;
    name: string;
    rank: number;
    quotes?: { USD?: { price?: number; percent_change_24h?: number } };
  }[];
  const top = [...rows].sort((a, b) => (a.rank || 9999) - (b.rank || 9999)).slice(0, 100);
  if (top.length < 50) throw new Error("paprika empty");
  const prices: Record<string, number> = {};
  const changes: Record<string, number> = {};
  const seen = new Set<string>();
  const live: Asset[] = [];
  for (const row of top) {
    const symbol = String(row.symbol || "").toUpperCase();
    if (!symbol || seen.has(symbol)) continue;
    seen.add(symbol);
    const price = Number(row.quotes?.USD?.price);
    const asset = toAsset({
      symbol,
      name: row.name,
      coingeckoId: geckoFromSymbol(symbol, row.id),
      rank: row.rank || live.length + 1,
      price,
    });
    live.push(asset);
    if (price > 0) prices[asset.coingeckoId] = price;
    const change = toRatio(row.quotes?.USD?.percent_change_24h);
    if (change != null) changes[asset.coingeckoId] = change;
  }
  return {
    assets: overlaySeedFromLive(live),
    prices,
    changes,
    updatedAt: Date.now(),
    source: "paprika",
  };
}

export async function loadMarket(opts?: { force?: boolean }): Promise<MarketPayload> {
  if (!opts?.force && cache && Date.now() - cache.updatedAt < CACHE_MS) return cache;
  for (const source of [fromCoinGecko, fromCoinlore, fromPaprika]) {
    try {
      const next = await source(Boolean(opts?.force));
      if (next.assets.length >= 50) {
        cache = next;
        return next;
      }
    } catch {
      /* next venue */
    }
  }
  return (
    cache ?? {
      assets: catalogFromBaked(),
      prices: {},
      changes: {},
      updatedAt: Date.now(),
      source: "baked",
    }
  );
}

export const getMarket = createServerFn({ method: "GET" })
  .validator((input: unknown) => {
    if (input == null || typeof input !== "object") return { force: false };
    return { force: Boolean((input as { force?: unknown }).force) };
  })
  .handler(async ({ data }): Promise<MarketPayload> => {
    return loadMarket({ force: data.force });
  });
