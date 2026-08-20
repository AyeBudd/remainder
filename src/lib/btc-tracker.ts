import {
  BAKED_ATH,
  BAKED_CYCLE_LOW,
  cycleFromHeight,
  type HalvingCycle,
} from "./btc-cycle";

export type BtcMark = { price: number; at: number };

export type BtcTracker = {
  price: number | null;
  ath: BtcMark;
  cycleLow: BtcMark;
  cycle: HalvingCycle;
  updatedAt: number;
};

const CACHE_MS = 60_000;
let cache: BtcTracker | null = null;

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

async function fetchTicker(): Promise<{ price: number | null; ath: BtcMark }> {
  try {
    const json = (await readJson("https://api.coinpaprika.com/v1/tickers/btc-bitcoin")) as {
      quotes?: { USD?: { price?: number; ath_price?: number; ath_date?: string } };
    };
    const usd = json.quotes?.USD;
    const price = Number(usd?.price);
    const athPrice = Number(usd?.ath_price);
    const athAt = usd?.ath_date ? Date.parse(usd.ath_date) : NaN;
    return {
      price: price > 0 ? price : null,
      ath:
        athPrice > 0
          ? { price: athPrice, at: Number.isFinite(athAt) ? athAt : BAKED_ATH.at }
          : BAKED_ATH,
    };
  } catch {
    try {
      const json = (await readJson("https://api.coinbase.com/v2/prices/BTC-USD/spot")) as {
        data?: { amount?: string };
      };
      const price = Number(json.data?.amount);
      return { price: price > 0 ? price : null, ath: BAKED_ATH };
    } catch {
      return { price: null, ath: BAKED_ATH };
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

export async function loadBtcTracker(force = false): Promise<BtcTracker> {
  if (!force && cache && Date.now() - cache.updatedAt < CACHE_MS) return cache;
  const [ticker, height] = await Promise.all([fetchTicker(), fetchHeight()]);
  const cycleLow = await fetchCycleLow(ticker.ath.at);
  const next: BtcTracker = {
    price: ticker.price,
    ath: ticker.ath,
    cycleLow,
    cycle: cycleFromHeight(height),
    updatedAt: Date.now(),
  };
  cache = next;
  return next;
}
