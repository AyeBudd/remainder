import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getActiveCatalog, SEED_ASSETS } from "@/lib/assets";

export type ChartPoint = { t: number; price: number };

export type AssetMarket = {
  id: string;
  symbol: string;
  name: string;
  rank: number | null;
  price: number | null;
  change24: number | null;
  change7d: number | null;
  change30d: number | null;
  marketCap: number | null;
  fdv: number | null;
  volume24: number | null;
  high24: number | null;
  low24: number | null;
  ath: number | null;
  athDate: string | null;
  athChange: number | null;
  atl: number | null;
  atlDate: string | null;
  circulating: number | null;
  totalSupply: number | null;
  maxSupply: number | null;
  homepage: string | null;
  about: string | null;
  series: ChartPoint[];
  source: string;
};

export const CHART_RANGES = [
  { id: "7" as const, label: "7D" },
  { id: "30" as const, label: "30D" },
  { id: "90" as const, label: "90D" },
  { id: "365" as const, label: "1Y" },
];

const CACHE_MS = 90_000;
const cache = new Map<string, { at: number; data: AssetMarket }>();

function n(v: unknown): number | null {
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

function ratioPct(v: unknown): number | null {
  const x = n(v);
  return x == null ? null : x / 100;
}

function stripAbout(html: string): string | null {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length < 40) return null;
  return text.slice(0, 420).replace(/\s+\S*$/, "") + (text.length > 420 ? "…" : "");
}

function lookup(id: string) {
  const catalog = getActiveCatalog();
  return (
    catalog.find((a) => a.coingeckoId === id) ??
    SEED_ASSETS.find((a) => a.coingeckoId === id) ??
    null
  );
}

async function geckoCoin(id: string): Promise<Partial<AssetMarket>> {
  const res = await fetch(
    `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`,
    { headers: { accept: "application/json" }, signal: AbortSignal.timeout(8000) },
  );
  if (!res.ok) throw new Error(`coingecko ${res.status}`);
  const json = (await res.json()) as {
    id?: string;
    symbol?: string;
    name?: string;
    market_cap_rank?: number;
    genesis_date?: string;
    description?: { en?: string };
    links?: { homepage?: string[] };
    market_data?: {
      current_price?: { usd?: number };
      market_cap?: { usd?: number };
      fully_diluted_valuation?: { usd?: number };
      total_volume?: { usd?: number };
      high_24h?: { usd?: number };
      low_24h?: { usd?: number };
      ath?: { usd?: number };
      ath_date?: { usd?: string };
      ath_change_percentage?: { usd?: number };
      atl?: { usd?: number };
      atl_date?: { usd?: string };
      price_change_percentage_24h?: number;
      price_change_percentage_7d?: number;
      price_change_percentage_30d?: number;
      circulating_supply?: number;
      total_supply?: number;
      max_supply?: number;
    };
  };
  const md = json.market_data;
  return {
    id: json.id ?? id,
    symbol: (json.symbol ?? "").toUpperCase(),
    name: json.name ?? id,
    rank: n(json.market_cap_rank),
    price: n(md?.current_price?.usd),
    change24: ratioPct(md?.price_change_percentage_24h),
    change7d: ratioPct(md?.price_change_percentage_7d),
    change30d: ratioPct(md?.price_change_percentage_30d),
    marketCap: n(md?.market_cap?.usd),
    fdv: n(md?.fully_diluted_valuation?.usd),
    volume24: n(md?.total_volume?.usd),
    high24: n(md?.high_24h?.usd),
    low24: n(md?.low_24h?.usd),
    ath: n(md?.ath?.usd),
    athDate: md?.ath_date?.usd?.slice(0, 10) ?? null,
    athChange: ratioPct(md?.ath_change_percentage?.usd),
    atl: n(md?.atl?.usd),
    atlDate: md?.atl_date?.usd?.slice(0, 10) ?? null,
    circulating: n(md?.circulating_supply),
    totalSupply: n(md?.total_supply),
    maxSupply: n(md?.max_supply),
    homepage: json.links?.homepage?.find((u) => u && u.startsWith("http")) ?? null,
    about: json.description?.en ? stripAbout(json.description.en) : null,
    source: "coingecko",
  };
}

async function geckoChart(id: string, days: string): Promise<ChartPoint[]> {
  const res = await fetch(
    `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=${days}`,
    { headers: { accept: "application/json" }, signal: AbortSignal.timeout(8000) },
  );
  if (!res.ok) throw new Error(`chart ${res.status}`);
  const json = (await res.json()) as { prices?: [number, number][] };
  const prices = json.prices ?? [];
  return prices
    .filter((row) => Array.isArray(row) && Number.isFinite(row[0]) && Number.isFinite(row[1]) && row[1] > 0)
    .map(([t, price]) => ({ t, price }));
}

async function binanceChart(pair: string, days: string): Promise<ChartPoint[]> {
  const dayN = Number(days) || 90;
  const interval = dayN <= 7 ? "1h" : dayN <= 30 ? "4h" : "1d";
  const limit = Math.min(500, dayN <= 7 ? dayN * 24 : dayN <= 30 ? dayN * 6 : dayN);
  const res = await fetch(
    `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${interval}&limit=${limit}`,
    { headers: { accept: "application/json" }, signal: AbortSignal.timeout(8000) },
  );
  if (!res.ok) throw new Error(`binance ${res.status}`);
  const rows = (await res.json()) as unknown[];
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
}

async function paprikaStats(paprikaId: string): Promise<Partial<AssetMarket>> {
  const res = await fetch(`https://api.coinpaprika.com/v1/tickers/${encodeURIComponent(paprikaId)}?quotes=USD`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`paprika ${res.status}`);
  const json = (await res.json()) as {
    id?: string;
    symbol?: string;
    name?: string;
    rank?: number;
    circulating_supply?: number;
    total_supply?: number;
    max_supply?: number;
    quotes?: {
      USD?: {
        price?: number;
        volume_24h?: number;
        market_cap?: number;
        percent_change_24h?: number;
        percent_change_7d?: number;
        percent_change_30d?: number;
        ath_price?: number;
        ath_date?: string;
      };
    };
  };
  const q = json.quotes?.USD;
  return {
    id: json.id ?? paprikaId,
    symbol: (json.symbol ?? "").toUpperCase(),
    name: json.name ?? paprikaId,
    rank: n(json.rank),
    price: n(q?.price),
    change24: ratioPct(q?.percent_change_24h),
    change7d: ratioPct(q?.percent_change_7d),
    change30d: ratioPct(q?.percent_change_30d),
    marketCap: n(q?.market_cap),
    volume24: n(q?.volume_24h),
    ath: n(q?.ath_price),
    athDate: q?.ath_date?.slice(0, 10) ?? null,
    circulating: n(json.circulating_supply),
    totalSupply: n(json.total_supply),
    maxSupply: n(json.max_supply),
    source: "paprika",
  };
}

function merge(base: Partial<AssetMarket>, extra: Partial<AssetMarket>): AssetMarket {
  return {
    id: extra.id ?? base.id ?? "",
    symbol: extra.symbol || base.symbol || "",
    name: extra.name || base.name || "",
    rank: extra.rank ?? base.rank ?? null,
    price: extra.price ?? base.price ?? null,
    change24: extra.change24 ?? base.change24 ?? null,
    change7d: extra.change7d ?? base.change7d ?? null,
    change30d: extra.change30d ?? base.change30d ?? null,
    marketCap: extra.marketCap ?? base.marketCap ?? null,
    fdv: extra.fdv ?? base.fdv ?? null,
    volume24: extra.volume24 ?? base.volume24 ?? null,
    high24: extra.high24 ?? base.high24 ?? null,
    low24: extra.low24 ?? base.low24 ?? null,
    ath: extra.ath ?? base.ath ?? null,
    athDate: extra.athDate ?? base.athDate ?? null,
    athChange: extra.athChange ?? base.athChange ?? null,
    atl: extra.atl ?? base.atl ?? null,
    atlDate: extra.atlDate ?? base.atlDate ?? null,
    circulating: extra.circulating ?? base.circulating ?? null,
    totalSupply: extra.totalSupply ?? base.totalSupply ?? null,
    maxSupply: extra.maxSupply ?? base.maxSupply ?? null,
    homepage: extra.homepage ?? base.homepage ?? null,
    about: extra.about ?? base.about ?? null,
    series: extra.series ?? base.series ?? [],
    source: extra.source ?? base.source ?? "none",
  };
}

export const loadAssetMarket = createServerFn({ method: "GET" })
  .validator((input: unknown) =>
    z.object({
      id: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
      days: z.enum(["7", "30", "90", "365"]).default("90"),
    }).parse(input),
  )
  .handler(async ({ data }): Promise<AssetMarket> => {
    const key = `${data.id}:${data.days}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;

    const known = lookup(data.id);
    let stats: Partial<AssetMarket> = {
      id: data.id,
      symbol: known?.symbol ?? data.id.toUpperCase(),
      name: known?.name ?? data.id,
    };
    try {
      stats = merge(stats, await geckoCoin(data.id));
    } catch {
      if (known?.paprikaId) {
        try {
          stats = merge(stats, await paprikaStats(known.paprikaId));
        } catch {
          /* keep catalog names */
        }
      }
    }

    let series: ChartPoint[] = [];
    try {
      series = await geckoChart(data.id, data.days);
    } catch {
      if (known?.binancePair) {
        try {
          series = await binanceChart(known.binancePair, data.days);
          stats = { ...stats, source: `${stats.source}+binance` };
        } catch {
          series = [];
        }
      }
    }

    const out = merge(stats, { series, id: data.id });
    if (!out.symbol) out.symbol = known?.symbol ?? data.id.toUpperCase();
    cache.set(key, { at: Date.now(), data: out });
    return out;
  });
