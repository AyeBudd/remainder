import { addDays, differenceInCalendarDays, format, parseISO, startOfDay } from "date-fns";
import { evaluatePlanPace, projectedCompletionDate, requiredContributionToHitDate, type PlanStatus } from "./dca-pace.ts";
import { PERIOD_DAYS } from "./dca-periods.ts";
import type { DcaFrequency, DcaPlan, Holding, PriceMap } from "./types.ts";

export type ProgressRange = "7d" | "30d" | "90d" | "1y" | "all";

export const PROGRESS_RANGES: { id: ProgressRange; label: string; days: number | null }[] = [
  { id: "7d", label: "7D", days: 7 },
  { id: "30d", label: "30D", days: 30 },
  { id: "90d", label: "90D", days: 90 },
  { id: "1y", label: "1Y", days: 365 },
  { id: "all", label: "ALL", days: null },
];

export type HoldingSnapshot = {
  id: string;
  holdingId: string;
  takenAt: string;
  symbol: string;
  assetQuantity: number;
  targetQuantity: number;
  remainingQuantity: number;
  completionPct: number;
  assetPrice: number | null;
  holdingsUsd: number | null;
  targetUsd: number | null;
  usdPerBuy: number | null;
  projectedDate: string | null;
  targetDate: string | null;
  planStatus: PlanStatus | "none";
};

export type HoldingMilestone = {
  id: string;
  holdingId: string;
  pct: 25 | 50 | 75 | 100;
  achievedAt: string;
};

export type PlanVersion = {
  id: string;
  holdingId: string;
  createdAt: string;
  targetQuantity: number;
  targetDate: string | null;
  frequency: DcaFrequency | null;
  usdPerBuy: number | null;
  assumedPrice: number | null;
};

export type ProgressBundle = {
  snapshots: HoldingSnapshot[];
  milestones: HoldingMilestone[];
  versions: PlanVersion[];
};

const MILESTONES = [25, 50, 75, 100] as const;

function dateOnly(value: string | Date): string {
  if (value instanceof Date) return format(startOfDay(value), "yyyy-MM-dd");
  const m = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : String(value).slice(0, 10);
}

function remainingOf(current: number, target: number): number {
  return Math.max(0, target - current);
}

function fillOf(current: number, target: number): number {
  if (target <= 0) return current > 0 ? 1 : 0;
  return current / target;
}

export function buildSnapshot(
  holding: Holding,
  plan: DcaPlan | null,
  prices: PriceMap,
  now = new Date(),
): HoldingSnapshot {
  const remain = remainingOf(holding.currentAmount, holding.targetAmount);
  const live = prices[holding.coingeckoId];
  const price = Number.isFinite(live) && live > 0 ? live : null;
  const takenAt = dateOnly(now);
  const pace = plan ? evaluatePlanPace(holding, plan, prices, now) : null;
  const usdPerBuy =
    plan && price != null
      ? requiredContributionToHitDate(remain, price, plan.frequency, plan.targetDate, now)
      : plan?.baselineUsdPerBuy ?? null;
  return {
    id: `${holding.id}:${takenAt}`,
    holdingId: holding.id,
    takenAt,
    symbol: holding.symbol,
    assetQuantity: holding.currentAmount,
    targetQuantity: holding.targetAmount,
    remainingQuantity: remain,
    completionPct: fillOf(holding.currentAmount, holding.targetAmount),
    assetPrice: price,
    holdingsUsd: price != null ? holding.currentAmount * price : null,
    targetUsd: price != null ? holding.targetAmount * price : null,
    usdPerBuy: usdPerBuy != null && Number.isFinite(usdPerBuy) ? usdPerBuy : null,
    projectedDate: pace?.projectedDate ?? null,
    targetDate: plan?.targetDate ?? null,
    planStatus: pace?.status ?? (remain <= 0 ? "complete" : "none"),
  };
}

export function detectNewMilestones(
  holdingId: string,
  previousPct: number,
  nextPct: number,
  existing: HoldingMilestone[],
  takenAt: string,
): HoldingMilestone[] {
  const have = new Set(existing.filter((m) => m.holdingId === holdingId).map((m) => m.pct));
  const next: HoldingMilestone[] = [];
  for (const pct of MILESTONES) {
    if (have.has(pct)) continue;
    const threshold = pct / 100;
    if (nextPct + 1e-12 >= threshold && previousPct + 1e-12 < threshold) {
      next.push({
        id: `${holdingId}:${pct}`,
        holdingId,
        pct,
        achievedAt: takenAt,
      });
    }
  }
  return next;
}

export function planVersionFrom(
  holding: Holding,
  plan: DcaPlan | null,
  usdPerBuy: number | null,
  now = new Date(),
): PlanVersion {
  return {
    id: `${holding.id}:${now.toISOString()}`,
    holdingId: holding.id,
    createdAt: now.toISOString(),
    targetQuantity: holding.targetAmount,
    targetDate: plan?.targetDate ?? null,
    frequency: plan?.frequency ?? null,
    usdPerBuy,
    assumedPrice: plan?.assumedPrice ?? null,
  };
}

export function versionChanged(prev: PlanVersion | undefined, next: PlanVersion): boolean {
  if (!prev) return true;
  const qtyDrift =
    Math.abs(prev.targetQuantity - next.targetQuantity) >
    Math.max(1e-8, Math.abs(next.targetQuantity) * 0.001);
  return (
    qtyDrift ||
    (prev.targetDate ?? null) !== (next.targetDate ?? null) ||
    (prev.frequency ?? null) !== (next.frequency ?? null)
  );
}

export function sliceSnapshots(
  snaps: HoldingSnapshot[],
  range: ProgressRange,
  now = new Date(),
): HoldingSnapshot[] {
  const spec = PROGRESS_RANGES.find((r) => r.id === range);
  const sorted = [...snaps].sort((a, b) => a.takenAt.localeCompare(b.takenAt));
  if (!spec?.days) return downsample(sorted, range);
  const cutoff = format(addDays(startOfDay(now), -spec.days), "yyyy-MM-dd");
  return downsample(
    sorted.filter((s) => s.takenAt >= cutoff),
    range,
  );
}

function downsample(snaps: HoldingSnapshot[], range: ProgressRange): HoldingSnapshot[] {
  if (snaps.length <= 2) return snaps;
  if (range === "7d" || range === "30d") return snaps;
  const cap = range === "90d" ? 90 : range === "1y" ? 52 : 60;
  if (snaps.length <= cap) return snaps;
  const keep = new Set<number>([0, snaps.length - 1]);
  const step = Math.ceil((snaps.length - 1) / (cap - 1));
  for (let i = 0; i < snaps.length; i += step) keep.add(i);
  return snaps.filter((_, i) => keep.has(i));
}

export type ProgressSummary = {
  current: number;
  addedSinceStart: number;
  completionPct: number;
  last30d: number;
  perWeek: number | null;
  projectedDate: string | null;
  originalDate: string | null;
  daysDelta: number | null;
  plannedUsdPerBuy: number | null;
  actualUsdPerWeek: number | null;
  actualVsPlan: number | null;
  contributionStatus: "ahead" | "on-track" | "slightly-behind" | "significantly-behind" | "unknown";
  usdAddedSinceStart: number | null;
  monthDelta: number;
  fasterThanPrior: number | null;
};

function qtyDelta(snaps: HoldingSnapshot[]): number {
  if (snaps.length < 1) return 0;
  return snaps[snaps.length - 1].assetQuantity - snaps[0].assetQuantity;
}

function usdFromIncreases(snaps: HoldingSnapshot[]): number | null {
  if (snaps.length < 2) return null;
  let usd = 0;
  let priced = false;
  for (let i = 1; i < snaps.length; i += 1) {
    const dQty = snaps[i].assetQuantity - snaps[i - 1].assetQuantity;
    if (dQty <= 0) continue;
    const price = snaps[i].assetPrice ?? snaps[i - 1].assetPrice;
    if (price == null || !(price > 0)) continue;
    usd += dQty * price;
    priced = true;
  }
  return priced ? usd : null;
}

function spanDays(snaps: HoldingSnapshot[], now: Date): number {
  if (snaps.length < 2) return 0;
  const start = parseISO(snaps[0].takenAt);
  if (Number.isNaN(start.getTime())) return 0;
  return Math.max(1, differenceInCalendarDays(startOfDay(now), startOfDay(start)));
}

export function summarizeProgress(
  snaps: HoldingSnapshot[],
  plan: DcaPlan | null,
  now = new Date(),
): ProgressSummary {
  const sorted = [...snaps].sort((a, b) => a.takenAt.localeCompare(b.takenAt));
  const latest = sorted[sorted.length - 1];
  const current = latest?.assetQuantity ?? 0;
  const target = latest?.targetQuantity ?? 0;
  const addedSinceStart = sorted.length ? current - sorted[0].assetQuantity : 0;
  const completionPct = fillOf(current, target);

  const cutoff30 = format(addDays(startOfDay(now), -30), "yyyy-MM-dd");
  const last30 = sorted.filter((s) => s.takenAt >= cutoff30);
  const last30d = last30.length ? last30[last30.length - 1].assetQuantity - last30[0].assetQuantity : 0;
  const rateWindow = last30.length >= 2 ? last30 : sorted;
  const rateDelta =
    rateWindow.length >= 2
      ? rateWindow[rateWindow.length - 1].assetQuantity - rateWindow[0].assetQuantity
      : last30d;
  const days30 = spanDays(rateWindow, now);
  const perWeek = days30 > 0 ? (rateDelta / days30) * 7 : null;

  const remain = remainingOf(current, target);
  let projectedDate: string | null = latest?.projectedDate ?? null;
  if (perWeek != null && perWeek > 0 && remain > 0) {
    const days = (remain / perWeek) * 7;
    projectedDate = format(addDays(startOfDay(now), Math.max(0, Math.ceil(days))), "yyyy-MM-dd");
  }

  const originalDate = plan?.baselineTargetDate || plan?.targetDate || latest?.targetDate || null;
  let daysDelta: number | null = null;
  if (projectedDate && originalDate) {
    const a = parseISO(projectedDate);
    const b = parseISO(originalDate);
    if (!Number.isNaN(a.getTime()) && !Number.isNaN(b.getTime())) {
      daysDelta = differenceInCalendarDays(a, b);
    }
  }

  const plannedUsdPerBuy = plan?.baselineUsdPerBuy ?? latest?.usdPerBuy ?? null;
  const freq = plan?.frequency ?? "weekly";
  const plannedUsdPerWeek =
    plannedUsdPerBuy != null && plannedUsdPerBuy > 0
      ? plannedUsdPerBuy * (7 / PERIOD_DAYS[freq])
      : null;
  const usdWindow = usdFromIncreases(rateWindow.length >= 2 ? rateWindow : sorted);
  const actualUsdPerWeek = usdWindow != null && days30 > 0 ? (usdWindow / days30) * 7 : null;
  let actualVsPlan: number | null = null;
  let contributionStatus: ProgressSummary["contributionStatus"] = "unknown";
  if (actualUsdPerWeek != null && plannedUsdPerWeek != null && plannedUsdPerWeek > 0) {
    actualVsPlan = (actualUsdPerWeek - plannedUsdPerWeek) / plannedUsdPerWeek;
    if (actualVsPlan <= -0.25) contributionStatus = "significantly-behind";
    else if (actualVsPlan < -0.05) contributionStatus = "slightly-behind";
    else if (actualVsPlan > 0.05) contributionStatus = "ahead";
    else contributionStatus = "on-track";
  }

  const monthStart = format(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)), "yyyy-MM-dd");
  const monthSnaps = sorted.filter((s) => s.takenAt >= monthStart);
  const monthDelta = monthSnaps.length ? monthSnaps[monthSnaps.length - 1].assetQuantity - monthSnaps[0].assetQuantity : 0;

  const priorCutoff = format(addDays(startOfDay(now), -60), "yyyy-MM-dd");
  const prior = sorted.filter((s) => s.takenAt >= priorCutoff && s.takenAt < cutoff30);
  const priorDelta = prior.length ? prior[prior.length - 1].assetQuantity - prior[0].assetQuantity : 0;
  const fasterThanPrior =
    priorDelta > 0 && Number.isFinite(last30d) ? (last30d - priorDelta) / priorDelta : null;

  return {
    current,
    addedSinceStart,
    completionPct,
    last30d,
    perWeek,
    projectedDate,
    originalDate,
    daysDelta,
    plannedUsdPerBuy,
    actualUsdPerWeek,
    actualVsPlan,
    contributionStatus,
    usdAddedSinceStart: usdFromIncreases(sorted),
    monthDelta,
    fasterThanPrior,
  };
}

export function estimatedMilestoneDate(
  pct: 25 | 50 | 75 | 100,
  current: number,
  target: number,
  perWeek: number | null,
  now = new Date(),
): string | null {
  if (!(target > 0) || perWeek == null || !(perWeek > 0)) return null;
  const need = Math.max(0, target * (pct / 100) - current);
  if (need <= 0) return null;
  const days = (need / perWeek) * 7;
  return format(addDays(startOfDay(now), Math.max(0, Math.ceil(days))), "yyyy-MM-dd");
}

export function historyProjection(
  remain: number,
  usdPerBuy: number | null,
  price: number | null,
  frequency: DcaFrequency | null,
  now = new Date(),
): string | null {
  if (!frequency || usdPerBuy == null || price == null) return null;
  return projectedCompletionDate(remain, usdPerBuy, price, frequency, now)?.date ?? null;
}

export function seedSampleHistory(holding: Holding, days = 40, now = new Date()): HoldingSnapshot[] {
  const snaps: HoldingSnapshot[] = [];
  const end = startOfDay(now);
  const startQty = holding.currentAmount * 0.55;
  for (let i = days; i >= 0; i -= 1) {
    const day = addDays(end, -i);
    const t = 1 - i / days;
    const qty = startQty + (holding.currentAmount - startQty) * t;
    const takenAt = format(day, "yyyy-MM-dd");
    snaps.push({
      id: `${holding.id}:${takenAt}`,
      holdingId: holding.id,
      takenAt,
      symbol: holding.symbol,
      assetQuantity: qty,
      targetQuantity: holding.targetAmount,
      remainingQuantity: remainingOf(qty, holding.targetAmount),
      completionPct: fillOf(qty, holding.targetAmount),
      assetPrice: null,
      holdingsUsd: null,
      targetUsd: null,
      usdPerBuy: null,
      projectedDate: null,
      targetDate: null,
      planStatus: "none",
    });
  }
  return snaps;
}

export function progressMoment(summary: ProgressSummary, symbol: string): string | null {
  if (summary.completionPct >= 1) return `You reached the ${symbol} target.`;
  if (summary.completionPct >= 0.5 && summary.completionPct < 0.51) {
    return `You've reached 50% of your ${symbol} target.`;
  }
  if (summary.monthDelta > 0) {
    const n = summary.monthDelta;
    const digits = n >= 1 ? 4 : 6;
    const qty = n.toFixed(digits).replace(/\.?0+$/, "");
    return `You've accumulated ${qty} ${symbol} this month.`;
  }
  if (summary.fasterThanPrior != null && summary.fasterThanPrior >= 0.2) {
    return `You're accumulating ${Math.round(summary.fasterThanPrior * 100)}% faster than the previous 30 days.`;
  }
  if (summary.usdAddedSinceStart != null && summary.usdAddedSinceStart >= 50) {
    const usd =
      summary.usdAddedSinceStart >= 100
        ? `$${Math.round(summary.usdAddedSinceStart).toLocaleString("en-US")}`
        : `$${summary.usdAddedSinceStart.toFixed(2)}`;
    return `You've added ${usd} toward this goal since you started.`;
  }
  return null;
}

export { PERIOD_DAYS };
