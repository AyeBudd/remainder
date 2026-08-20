import { parseAmount } from "./format";
import type { Holding } from "./types";

const OLD_KEY = "remainder.whatif";
const STORE_KEY = "remainder.whatif.v2";

export type WhatIfPrices = Record<string, number>;
export type WhatIfSlot = "realistic" | "hopium";

export const WHAT_IF_SLOTS: { id: WhatIfSlot; label: string; blurb: string }[] = [
  { id: "realistic", label: "Realistic", blurb: "The print you can actually defend." },
  { id: "hopium", label: "Hopium", blurb: "Best case. No one has to believe you." },
];

type WhatIfStore = {
  active: WhatIfSlot;
  realistic: WhatIfPrices;
  hopium: WhatIfPrices;
};

function emptyStore(): WhatIfStore {
  return { active: "realistic", realistic: {}, hopium: {} };
}

function parsePrices(value: unknown): WhatIfPrices {
  if (!value || typeof value !== "object") return {};
  const next: WhatIfPrices = {};
  for (const [id, raw] of Object.entries(value as Record<string, unknown>)) {
    const n = typeof raw === "number" ? raw : Number(raw);
    if (id && Number.isFinite(n) && n > 0) next[id] = n;
  }
  return next;
}

function parseStore(raw: string): WhatIfStore | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const row = parsed as Record<string, unknown>;
    const active = row.active === "hopium" ? "hopium" : "realistic";
    return {
      active,
      realistic: parsePrices(row.realistic),
      hopium: parsePrices(row.hopium),
    };
  } catch {
    return null;
  }
}

function migrateLegacy(): WhatIfStore {
  if (typeof window === "undefined") return emptyStore();
  try {
    const legacy = window.localStorage.getItem(OLD_KEY);
    const hopium = legacy ? parsePrices(JSON.parse(legacy)) : {};
    return { active: Object.keys(hopium).length ? "hopium" : "realistic", realistic: {}, hopium };
  } catch {
    return emptyStore();
  }
}

function readStore(): WhatIfStore {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = parseStore(raw);
      if (parsed) return parsed;
    }
    const migrated = migrateLegacy();
    writeStore(migrated);
    return migrated;
  } catch {
    return emptyStore();
  }
}

function writeStore(store: WhatIfStore) {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    /* ignore quota */
  }
}

export function readWhatIfActive(): WhatIfSlot {
  return readStore().active;
}

export function readWhatIfPrices(slot?: WhatIfSlot): WhatIfPrices {
  const store = readStore();
  return store[slot ?? store.active];
}

export function writeWhatIfPrices(prices: WhatIfPrices, slot?: WhatIfSlot) {
  const store = readStore();
  const target = slot ?? store.active;
  writeStore({ ...store, [target]: prices });
}

export function writeWhatIfActive(slot: WhatIfSlot) {
  const store = readStore();
  writeStore({ ...store, active: slot });
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

export function draftsForHoldings(
  holdings: Holding[],
  custom: WhatIfPrices,
  live: Record<string, number>,
): Record<string, string> {
  const next: Record<string, string> = {};
  for (const holding of holdings) {
    const id = holding.coingeckoId;
    if (custom[id] != null) next[id] = draftFromPrice(custom[id]);
    else if (live[id] != null) next[id] = draftFromPrice(live[id]);
    else next[id] = "";
  }
  return next;
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
