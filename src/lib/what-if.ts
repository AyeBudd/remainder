import { parseAmount } from "./format";
import type { Holding } from "./types";

const WHAT_IF_KEY = "remainder.whatif";

export type WhatIfPrices = Record<string, number>;

export function readWhatIfPrices(): WhatIfPrices {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(WHAT_IF_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const next: WhatIfPrices = {};
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      const n = typeof value === "number" ? value : Number(value);
      if (id && Number.isFinite(n) && n > 0) next[id] = n;
    }
    return next;
  } catch {
    return {};
  }
}

export function writeWhatIfPrices(prices: WhatIfPrices) {
  try {
    window.localStorage.setItem(WHAT_IF_KEY, JSON.stringify(prices));
  } catch {
    /* ignore quota */
  }
}

export function draftFromPrice(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "";
  if (n >= 1000) return String(Math.round(n * 100) / 100);
  if (n >= 1) return String(Number(n.toPrecision(8)));
  return String(Number(n.toPrecision(6)));
}

export function parseWhatIfPrice(raw: string): number | null {
  const n = parseAmount(raw);
  if (n == null || n <= 0) return null;
  return n;
}

export function resolveScenarioPrice(
  id: string,
  live: number | undefined,
  custom: WhatIfPrices,
): number | undefined {
  const yours = custom[id];
  if (yours != null && Number.isFinite(yours) && yours > 0) return yours;
  if (live != null && Number.isFinite(live) && live > 0) return live;
  return undefined;
}

export type HoldingScenario = {
  live?: number;
  yours?: number;
  heldLive: number | null;
  heldYours: number | null;
  targetLive: number | null;
  targetYours: number | null;
  multiple: number | null;
};

export function scenarioForHolding(
  holding: Holding,
  live: number | undefined,
  custom: WhatIfPrices,
): HoldingScenario {
  const yours = resolveScenarioPrice(holding.coingeckoId, live, custom);
  const liveOk = live != null && Number.isFinite(live) && live > 0 ? live : undefined;
  return {
    live: liveOk,
    yours,
    heldLive: liveOk != null ? holding.currentAmount * liveOk : null,
    heldYours: yours != null ? holding.currentAmount * yours : null,
    targetLive: liveOk != null ? holding.targetAmount * liveOk : null,
    targetYours: yours != null ? holding.targetAmount * yours : null,
    multiple: liveOk != null && yours != null ? yours / liveOk : null,
  };
}

export type ScenarioTotals = {
  heldLive: number;
  heldYours: number;
  targetLive: number;
  targetYours: number;
  priced: number;
};

export function scenarioTotals(
  holdings: Holding[],
  livePrices: Record<string, number>,
  custom: WhatIfPrices,
): ScenarioTotals {
  let heldLive = 0;
  let heldYours = 0;
  let targetLive = 0;
  let targetYours = 0;
  let priced = 0;
  for (const holding of holdings) {
    const row = scenarioForHolding(holding, livePrices[holding.coingeckoId], custom);
    if (row.yours == null) continue;
    priced += 1;
    heldYours += row.heldYours ?? 0;
    targetYours += row.targetYours ?? 0;
    heldLive += row.heldLive ?? 0;
    targetLive += row.targetLive ?? 0;
  }
  return { heldLive, heldYours, targetLive, targetYours, priced };
}
