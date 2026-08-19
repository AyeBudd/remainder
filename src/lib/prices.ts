import { createServerFn } from "@tanstack/react-start";
import { ASSETS } from "./assets";

export type PricePayload = {
  prices: Record<string, number>;
  updatedAt: number;
  source: "coingecko" | "paprika" | "coinbase" | "binance" | "mixed" | "none";
};

const CACHE_MS = 45_000;
let cache: PricePayload | null = null;

function hasEnough(prices: Record<string, number>): boolean {
  return Object.keys(prices).length >= 3;
}

async function fromCoinGecko(): Promise<Record<string, number>> {
  const ids = [...new Set(ASSETS.map((a) => a.coingeckoId))].join(",");
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;
  const res = await fetch(url, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(`coingecko ${res.status}`);
  const json = (await res.json()) as Record<string, { usd?: number }>;
  const prices: Record<string, number> = {};
  for (const asset of ASSETS) {
    const usd = json[asset.coingeckoId]?.usd;
    if (typeof usd === "number" && usd > 0) prices[asset.coingeckoId] = usd;
  }
  if (!hasEnough(prices)) throw new Error("coingecko empty");
  return prices;
}

async function fromPaprika(): Promise<Record<string, number>> {
  const res = await fetch("https://api.coinpaprika.com/v1/tickers?quotes=USD", {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`paprika ${res.status}`);
  const rows = (await res.json()) as {
    id: string;
    quotes?: { USD?: { price?: number } };
  }[];
  const byId = new Map(rows.map((r) => [r.id, r.quotes?.USD?.price]));
  const prices: Record<string, number> = {};
  for (const asset of ASSETS) {
    if (!asset.paprikaId) continue;
    const usd = byId.get(asset.paprikaId);
    if (typeof usd === "number" && usd > 0) prices[asset.coingeckoId] = usd;
  }
  if (!hasEnough(prices)) throw new Error("paprika empty");
  return prices;
}

async function fromCoinbase(): Promise<Record<string, number>> {
  const prices: Record<string, number> = {};
  await Promise.all(
    ASSETS.filter((a) => a.coinbasePair).map(async (asset) => {
      try {
        const res = await fetch(`https://api.coinbase.com/v2/prices/${asset.coinbasePair}/spot`, {
          headers: { accept: "application/json" },
          signal: AbortSignal.timeout(6000),
        });
        if (!res.ok) return;
        const json = (await res.json()) as { data?: { amount?: string } };
        const usd = Number(json.data?.amount);
        if (usd > 0) prices[asset.coingeckoId] = usd;
      } catch {
        /* skip pair */
      }
    }),
  );
  if (!prices.tether) prices.tether = 1;
  if (!hasEnough(prices)) throw new Error("coinbase empty");
  return prices;
}

async function fromBinance(): Promise<Record<string, number>> {
  const res = await fetch("https://api.binance.com/api/v3/ticker/price", {
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(`binance ${res.status}`);
  const rows = (await res.json()) as { symbol: string; price: string }[];
  const byPair = new Map(rows.map((r) => [r.symbol, Number(r.price)]));
  const prices: Record<string, number> = {};
  for (const asset of ASSETS) {
    if (!asset.binancePair) continue;
    const n = byPair.get(asset.binancePair);
    if (typeof n === "number" && n > 0) prices[asset.coingeckoId] = n;
  }
  if (!prices.tether) prices.tether = 1;
  if (!prices["usd-coin"]) prices["usd-coin"] = 1;
  if (!hasEnough(prices)) throw new Error("binance empty");
  return prices;
}

export const getPrices = createServerFn({ method: "GET" }).handler(async (): Promise<PricePayload> => {
  if (cache && Date.now() - cache.updatedAt < CACHE_MS) return cache;
  const sources: Array<() => Promise<Record<string, number>>> = [
    fromCoinGecko,
    fromPaprika,
    fromCoinbase,
    fromBinance,
  ];
  for (const source of sources) {
    try {
      const prices = await source();
      const name =
        source === fromCoinGecko
          ? "coingecko"
          : source === fromPaprika
            ? "paprika"
            : source === fromCoinbase
              ? "coinbase"
              : "binance";
      cache = { prices, updatedAt: Date.now(), source: name };
      return cache;
    } catch {
      /* try next venue */
    }
  }
  return cache ?? { prices: {}, updatedAt: Date.now(), source: "none" };
});
