import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  BAKED_ATH,
  BAKED_CYCLE_LOW,
  cycleFromHeight,
  type HalvingCycle,
} from "./btc-cycle";
import type { ChartPoint } from "./asset-market";

export type BtcMark = { price: number; at: number };

export type BtcTracker = {
  price: number | null;
  change24?: number;
  change7d?: number;
  ath: BtcMark;
  cycleLow: BtcMark;
  cycle: HalvingCycle;
  marketCap: number | null;
  volume24: number | null;
  circulating: number | null;
  maxSupply: number;
  totalCryptoCap: number | null;
  dominance: number | null;
  goldOz: number | null;
  goldCap: number | null;
  hashrate: number | null;
  difficultyChange: number | null;
  difficultyEta: number | null;
  series: ChartPoint[];
  days: string;
  updatedAt: number;
};

export const BTC_MAX_SUPPLY = 21_000_000;
/** World Gold Council 2024 above-ground stock, metric tonnes. Comparison only. */
export const GOLD_STOCK_TONNES = 216_265;
const OZ_PER_TONNE = 32_150.746568628;

const CACHE_MS = 60_000;
const cache = new Map<string, { at: number; data: BtcTracker }>();

async function readJson(url: string, timeout = 8000): Promise<unknown> {
  const res = await fetch(url, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(timeout),
  });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
}

async function readText(url: string, timeout = 8000): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeout) });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.text();
}

async function fetchHeight(): Promise<number | null> {
  const urls = [
    "https://blockchain.info/q/getblockcount",
    "https://mempool.space/api/blocks/tip/height",
  ];
  for (const url of urls) {
    try {
      const n = Number((await readText(url)).trim());
      if (Number.isFinite(n) && n > 800_000) return n;
    } catch {
      /* try next */
    }
  }
  return null;
}

type Ticker = {
  price: number | null;
  change24?: number;
  change7d?: number;
  ath: BtcMark;
  marketCap: number | null;
  volume24: number | null;
  circulating: number | null;
};

async function fetchTicker(): Promise<Ticker> {
  try {
    const json = (await readJson("https://api.coinpaprika.com/v1/tickers/btc-bitcoin")) as {
      circulating_supply?: number;
      quotes?: {
        USD?: {
          price?: number;
          ath_price?: number;
          ath_date?: string;
          percent_change_24h?: number;
          percent_change_7d?: number;
          market_cap?: number;
          volume_24h?: number;
        };
      };
    };
    const usd = json.quotes?.USD;
    const price = Number(usd?.price);
    const athPrice = Number(usd?.ath_price);
    const athAt = usd?.ath_date ? Date.parse(usd.ath_date) : NaN;
    const changeRaw = Number(usd?.percent_change_24h);
    const change7 = Number(usd?.percent_change_7d);
    const cap = Number(usd?.market_cap);
    const vol = Number(usd?.volume_24h);
    const circ = Number(json.circulating_supply);
    return {
      price: price > 0 ? price : null,
      change24: Number.isFinite(changeRaw) ? changeRaw / 100 : undefined,
      change7d: Number.isFinite(change7) ? change7 / 100 : undefined,
      ath:
        athPrice > 0
          ? { price: athPrice, at: Number.isFinite(athAt) ? athAt : BAKED_ATH.at }
          : BAKED_ATH,
      marketCap: cap > 0 ? cap : null,
      volume24: vol > 0 ? vol : null,
      circulating: circ > 0 ? circ : null,
    };
  } catch {
    try {
      const json = (await readJson("https://api.coinbase.com/v2/prices/BTC-USD/spot")) as {
        data?: { amount?: string };
      };
      const price = Number(json.data?.amount);
      return {
        price: price > 0 ? price : null,
        ath: BAKED_ATH,
        marketCap: null,
        volume24: null,
        circulating: null,
      };
    } catch {
      return { price: null, ath: BAKED_ATH, marketCap: null, volume24: null, circulating: null };
    }
  }
}

async function fetchCycleLow(athAt: number): Promise<BtcMark> {
  const start = new Date(athAt).toISOString().slice(0, 10);
  try {
    const rows = (await readJson(
      `https://api.coinpaprika.com/v1/tickers/btc-bitcoin/historical?start=${start}&interval=1d`,
    )) as { timestamp?: string; price?: number }[];
    if (!Array.isArray(rows) || rows.length < 5) return BAKED_CYCLE_LOW;
    let best: BtcMark | null = null;
    for (const row of rows) {
      const price = Number(row.price);
      const at = row.timestamp ? Date.parse(row.timestamp) : NaN;
      if (!(price > 0) || !Number.isFinite(at)) continue;
      if (!best || price < best.price) best = { price, at };
    }
    return best ?? BAKED_CYCLE_LOW;
  } catch {
    return BAKED_CYCLE_LOW;
  }
}

async function fetchGlobal(): Promise<{ totalCap: number | null; dominance: number | null }> {
  try {
    const json = (await readJson("https://api.coingecko.com/api/v3/global")) as {
      data?: { total_market_cap?: { usd?: number }; market_cap_percentage?: { btc?: number } };
    };
    const cap = Number(json.data?.total_market_cap?.usd);
    const dom = Number(json.data?.market_cap_percentage?.btc);
    return {
      totalCap: cap > 0 ? cap : null,
      dominance: Number.isFinite(dom) ? dom / 100 : null,
    };
  } catch {
    try {
      const json = (await readJson("https://api.coinpaprika.com/v1/global")) as {
        market_cap_usd?: number;
        bitcoin_dominance_percentage?: number;
      };
      const cap = Number(json.market_cap_usd);
      const dom = Number(json.bitcoin_dominance_percentage);
      return {
        totalCap: cap > 0 ? cap : null,
        dominance: Number.isFinite(dom) ? dom / 100 : null,
      };
    } catch {
      return { totalCap: null, dominance: null };
    }
  }
}

async function fetchGoldOz(): Promise<number | null> {
  try {
    const json = (await readJson("https://api.gold-api.com/price/XAU")) as { price?: number };
    const p = Number(json.price);
    if (p > 100) return p;
  } catch {
    /* try paxg */
  }
  try {
    const json = (await readJson(
      "https://api.coingecko.com/api/v3/simple/price?ids=pax-gold&vs_currencies=usd",
    )) as { "pax-gold"?: { usd?: number } };
    const p = Number(json["pax-gold"]?.usd);
    if (p > 100) return p;
  } catch {
    return null;
  }
  return null;
}

async function fetchMining(): Promise<{ hashrate: number | null; difficultyChange: number | null; difficultyEta: number | null }> {
  let hashrate: number | null = null;
  let difficultyChange: number | null = null;
  let difficultyEta: number | null = null;
  try {
    const json = (await readJson("https://mempool.space/api/v1/mining/hashrate/3d")) as {
      currentHashrate?: number;
    };
    const h = Number(json.currentHashrate);
    if (h > 0) hashrate = h;
  } catch {
    /* optional */
  }
  try {
    const json = (await readJson("https://mempool.space/api/v1/difficulty-adjustment")) as {
      difficultyChange?: number;
      estimatedRetargetDate?: number;
    };
    const ch = Number(json.difficultyChange);
    if (Number.isFinite(ch)) difficultyChange = ch / 100;
    const eta = Number(json.estimatedRetargetDate);
    if (eta > 1_000_000_000_000) difficultyEta = eta;
    else if (eta > 1_000_000_000) difficultyEta = eta * 1000;
  } catch {
    /* optional */
  }
  return { hashrate, difficultyChange, difficultyEta };
}

async function fetchChart(days: string): Promise<ChartPoint[]> {
  try {
    const json = (await readJson(
      `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${days}`,
    )) as { prices?: [number, number][] };
    const prices = json.prices ?? [];
    const series = prices
      .filter((row) => Array.isArray(row) && Number.isFinite(row[0]) && Number.isFinite(row[1]) && row[1] > 0)
      .map(([t, price]) => ({ t, price }));
    if (series.length > 2) return series;
  } catch {
    /* binance */
  }
  const dayN = Number(days) || 90;
  const interval = dayN <= 7 ? "1h" : dayN <= 30 ? "4h" : "1d";
  const limit = Math.min(500, dayN <= 7 ? dayN * 24 : dayN <= 30 ? dayN * 6 : dayN);
  try {
    const rows = (await readJson(
      `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${interval}&limit=${limit}`,
    )) as unknown[];
    if (!Array.isArray(rows)) return [];
    return rows
      .map((row) => {
        if (!Array.isArray(row)) return null;
        const t = Number(row[0]);
        const price = Number(row[4] ?? row[1]);
        if (!Number.isFinite(t) || !Number.isFinite(price) || price <= 0) return null;
        return { t, price };
      })
      .filter((p): p is ChartPoint => p != null);
  } catch {
    return [];
  }
}

async function fetchSupply(): Promise<number | null> {
  try {
    const raw = Number((await readText("https://blockchain.info/q/totalbc")).trim());
    if (raw > 1e15) return raw / 1e8;
    if (raw > 10_000_000) return raw;
  } catch {
    return null;
  }
  return null;
}

export function formatHashrate(hs: number): string {
  if (!Number.isFinite(hs) || hs <= 0) return "—";
  if (hs >= 1e18) return `${(hs / 1e18).toFixed(1)} EH/s`;
  if (hs >= 1e15) return `${(hs / 1e15).toFixed(1)} PH/s`;
  return `${(hs / 1e12).toFixed(1)} TH/s`;
}

export const loadBtcTracker = createServerFn({ method: "GET" })
  .validator((input: unknown) =>
    z
      .object({
        force: z.boolean().optional(),
        days: z.enum(["7", "30", "90", "365"]).default("90"),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }): Promise<BtcTracker> => {
    const days = data.days ?? "90";
    const key = days;
    const hit = cache.get(key);
    if (!data.force && hit && Date.now() - hit.at < CACHE_MS) return hit.data;

    const [ticker, height, global, goldOz, mining, series, supply] = await Promise.all([
      fetchTicker(),
      fetchHeight(),
      fetchGlobal(),
      fetchGoldOz(),
      fetchMining(),
      fetchChart(days),
      fetchSupply(),
    ]);
    const cycleLow = await fetchCycleLow(ticker.ath.at);
    const circulating = ticker.circulating ?? supply;
    const marketCap =
      ticker.marketCap ?? (ticker.price && circulating ? ticker.price * circulating : null);
    const goldCap = goldOz != null ? goldOz * GOLD_STOCK_TONNES * OZ_PER_TONNE : null;
    const dominance =
      global.dominance ??
      (marketCap && global.totalCap && global.totalCap > 0 ? marketCap / global.totalCap : null);

    const next: BtcTracker = {
      price: ticker.price,
      change24: ticker.change24,
      change7d: ticker.change7d,
      ath: ticker.ath,
      cycleLow,
      cycle: cycleFromHeight(height),
      marketCap,
      volume24: ticker.volume24,
      circulating,
      maxSupply: BTC_MAX_SUPPLY,
      totalCryptoCap: global.totalCap,
      dominance,
      goldOz,
      goldCap,
      hashrate: mining.hashrate,
      difficultyChange: mining.difficultyChange,
      difficultyEta: mining.difficultyEta,
      series,
      days,
      updatedAt: Date.now(),
    };
    cache.set(key, { at: Date.now(), data: next });
    return next;
  });
