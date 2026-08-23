import { getSql } from "@/lib/db";
import type { Asset } from "@/lib/assets";

export type CachedMarket = {
  assets: Asset[];
  prices: Record<string, number>;
  changes: Record<string, number>;
  updatedAt: number;
  source: "coingecko" | "coinlore" | "paprika" | "baked";
};

export const MARKET_BUCKET_MS = 5 * 60_000;
const ROW_ID = "top250";

export function marketBucket(at = Date.now()): number {
  return Math.floor(at / MARKET_BUCKET_MS);
}

export function msUntilNextMarketBucket(at = Date.now()): number {
  return MARKET_BUCKET_MS - (at % MARKET_BUCKET_MS);
}

function asPayload(raw: unknown): CachedMarket | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as CachedMarket;
  if (!row.prices || typeof row.prices !== "object") return null;
  if (!row.assets || !Array.isArray(row.assets) || row.assets.length < 20) return null;
  if (!Number.isFinite(row.updatedAt)) return null;
  return row;
}

export async function readMarketCache(): Promise<CachedMarket | null> {
  try {
    const sql = await getSql();
    const rows = await sql<{ payload: unknown }>`
      select payload from market_cache where id = ${ROW_ID} limit 1
    `;
    return asPayload(rows[0]?.payload);
  } catch {
    return null;
  }
}

export async function writeMarketCache(payload: CachedMarket): Promise<void> {
  try {
    const sql = await getSql();
    const body = JSON.stringify(payload);
    await sql`
      insert into market_cache (id, payload, updated_at)
      values (${ROW_ID}, ${body}::jsonb, now())
      on conflict (id) do update set
        payload = excluded.payload,
        updated_at = now()
    `;
  } catch {
    /* preview without migrations still serves in-memory */
  }
}

export function cacheIsFresh(payload: CachedMarket, at = Date.now()): boolean {
  return marketBucket(payload.updatedAt) === marketBucket(at);
}
