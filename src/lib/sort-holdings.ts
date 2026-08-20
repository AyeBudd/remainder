import { fillRatio } from "./assets";
import type { Holding } from "./types";

export type HoldingSort =
  | "added"
  | "held-desc"
  | "held-asc"
  | "pct-desc"
  | "pct-asc"
  | "target-desc"
  | "target-asc";

export const HOLDING_SORTS: { id: HoldingSort; label: string; group: string }[] = [
  { id: "added", label: "Added order", group: "default" },
  { id: "held-desc", label: "High to low", group: "Current value" },
  { id: "held-asc", label: "Low to high", group: "Current value" },
  { id: "pct-desc", label: "High to low", group: "% of target" },
  { id: "pct-asc", label: "Low to high", group: "% of target" },
  { id: "target-desc", label: "High to low", group: "Target value" },
  { id: "target-asc", label: "Low to high", group: "Target value" },
];

const SORT_IDS = new Set(HOLDING_SORTS.map((s) => s.id));
const SORT_KEY = "remainder.sort";

export function parseHoldingSort(raw: string | null | undefined): HoldingSort {
  if (raw && SORT_IDS.has(raw as HoldingSort)) return raw as HoldingSort;
  return "added";
}

export function readHoldingSort(): HoldingSort {
  if (typeof window === "undefined") return "added";
  try {
    return parseHoldingSort(window.localStorage.getItem(SORT_KEY));
  } catch {
    return "added";
  }
}

export function writeHoldingSort(sort: HoldingSort) {
  try {
    window.localStorage.setItem(SORT_KEY, sort);
  } catch {
    /* ignore quota */
  }
}

export function sortHoldings(
  holdings: Holding[],
  prices: Record<string, number>,
  sort: HoldingSort,
): Holding[] {
  if (sort === "added" || holdings.length < 2) return holdings;
  const dir = sort.endsWith("desc") ? -1 : 1;
  const metric = sort.startsWith("held") ? "held" : sort.startsWith("pct") ? "pct" : "target";
  return [...holdings].sort((a, b) => {
    const va = metricOf(a, prices, metric);
    const vb = metricOf(b, prices, metric);
    if (va === vb) return a.symbol.localeCompare(b.symbol);
    return (va - vb) * dir;
  });
}

function metricOf(
  holding: Holding,
  prices: Record<string, number>,
  metric: "held" | "pct" | "target",
): number {
  if (metric === "pct") return fillRatio(holding.currentAmount, holding.targetAmount);
  const price = prices[holding.coingeckoId];
  if (price == null || !Number.isFinite(price)) return 0;
  return (metric === "held" ? holding.currentAmount : holding.targetAmount) * price;
}
