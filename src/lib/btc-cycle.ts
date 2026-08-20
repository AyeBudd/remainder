export const LAST_HALVING = {
  block: 840_000,
  at: Date.UTC(2024, 3, 20, 0, 9),
} as const;

export const NEXT_HALVING_BLOCK = 1_050_000;
export const HALVING_INTERVAL = 210_000;
const TEN_MIN = 10 * 60 * 1000;

export const BAKED_ATH = {
  price: 126_173.18,
  at: Date.parse("2025-10-06T19:00:40Z"),
};

export const BAKED_CYCLE_LOW = {
  price: 59_013.39,
  at: Date.parse("2026-06-30T00:00:00Z"),
};

export type HalvingCycle = {
  height: number | null;
  daysSince: number;
  daysTo: number;
  lastAt: number;
  eta: number;
  progress: number;
  blocksLeft: number | null;
};

export function estimateHeight(now = Date.now()): number {
  return LAST_HALVING.block + Math.floor((now - LAST_HALVING.at) / TEN_MIN);
}

export function cycleFromHeight(height: number | null, now = Date.now()): HalvingCycle {
  const tip = height != null && height > LAST_HALVING.block ? height : estimateHeight(now);
  const mined = Math.max(1, tip - LAST_HALVING.block);
  const avgMs = (now - LAST_HALVING.at) / mined;
  const left = Math.max(0, NEXT_HALVING_BLOCK - tip);
  const eta = now + left * avgMs;
  return {
    height: height != null && height > 0 ? height : null,
    daysSince: Math.max(0, Math.floor((now - LAST_HALVING.at) / 86_400_000)),
    daysTo: Math.max(0, Math.ceil((eta - now) / 86_400_000)),
    lastAt: LAST_HALVING.at,
    eta,
    progress: Math.min(1, mined / HALVING_INTERVAL),
    blocksLeft: height != null && height > 0 ? left : null,
  };
}

export function formatDayCount(days: number): string {
  if (!Number.isFinite(days)) return "—";
  return `${new Intl.NumberFormat("en-US").format(Math.round(days))} day${Math.round(days) === 1 ? "" : "s"}`;
}

export function formatShortDate(at: number): string {
  if (!at) return "—";
  return new Date(at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
