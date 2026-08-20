import { differenceInCalendarDays, parseISO, startOfDay } from "date-fns";
import { countPeriods, hasBaseline } from "@/lib/dca";
import type { DcaPlan, Holding } from "@/lib/types";

export type Unrealized = {
  cost: number;
  value: number;
  usd: number;
  ratio: number | null;
};

export function rollCostBasis(
  prevQty: number,
  prevCost: number | null,
  nextQty: number,
  price: number,
): number | null {
  if (!(price > 0) || !Number.isFinite(nextQty) || nextQty < 0) return prevCost;
  if (prevCost == null) return nextQty * price;
  if (nextQty <= 0) return 0;
  const added = nextQty - prevQty;
  if (added > 1e-12) return prevCost + added * price;
  if (added < -1e-12 && prevQty > 0) return prevCost * (nextQty / prevQty);
  return prevCost;
}

export function unrealizedPnl(qty: number, cost: number | null, price: number | undefined): Unrealized | null {
  if (cost == null || price == null || !Number.isFinite(price) || !Number.isFinite(qty)) return null;
  const value = qty * price;
  const usd = value - cost;
  return { cost, value, usd, ratio: cost > 0 ? usd / cost : null };
}

function buysCompleted(daysElapsed: number, freq: DcaPlan["frequency"], periods: number, totalDays: number): number {
  if (daysElapsed <= 0) return 0;
  if (daysElapsed >= totalDays) return periods;
  switch (freq) {
    case "daily":
      return Math.min(periods, daysElapsed);
    case "weekly":
      return Math.min(periods, Math.floor(daysElapsed / 7));
    case "biweekly":
      return Math.min(periods, Math.floor(daysElapsed / 14));
    case "monthly":
      return Math.min(periods, Math.floor((daysElapsed / totalDays) * periods));
  }
}

export type PlanPnl = {
  buys: number;
  spent: number;
  value: number;
  usd: number;
  qty: number;
};

/** Hypothetical P/L if every scheduled buy since the plan was saved happened at the plan price. */
export function planToDatePnl(holding: Holding, plan: DcaPlan, live: number | undefined, now = new Date()): PlanPnl | null {
  if (!hasBaseline(plan) || live == null || !Number.isFinite(live) || live <= 0) return null;
  if (!plan.baselineAt || !plan.baselineUsdPerBuy || !plan.baselineDays) return null;
  const start = startOfDay(parseISO(plan.baselineAt));
  if (Number.isNaN(start.getTime())) return null;
  const target = startOfDay(parseISO(plan.targetDate));
  if (Number.isNaN(target.getTime())) return null;
  const periods = countPeriods(start, target, plan.frequency);
  if (periods <= 0) return null;
  const daysElapsed = Math.max(0, differenceInCalendarDays(startOfDay(now), start));
  const buys = buysCompleted(daysElapsed, plan.frequency, periods, plan.baselineDays);
  const startQty = Math.max(0, holding.targetAmount - (plan.baselineRemaining ?? 0));
  const priceThen = plan.baselinePrice && plan.baselinePrice > 0 ? plan.baselinePrice : live;
  const coinsPerBuy = priceThen > 0 ? plan.baselineUsdPerBuy / priceThen : 0;
  const qty = startQty + coinsPerBuy * buys;
  const spent = startQty * priceThen + plan.baselineUsdPerBuy * buys;
  const value = qty * live;
  return { buys, spent, value, usd: value - spent, qty };
}
