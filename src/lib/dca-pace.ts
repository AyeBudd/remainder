import { addDays, differenceInCalendarDays, format, parseISO, startOfDay } from "date-fns";
import { countPeriods, frequencyNoun, PERIOD_DAYS } from "./dca-periods.ts";
import type { DcaFrequency, DcaPlan, Holding, PriceMap } from "./types.ts";

/** Single config for “meaningfully later.” 0.25 = 25% more time-to-target. */
export const SLIP_THRESHOLD = 0.25;

function remainingCoins(current: number, target: number): number {
  return Math.max(0, target - current);
}

function hasBaseline(plan: DcaPlan): boolean {
  return Boolean(plan.baselineDays && plan.baselineDays > 0 && plan.baselineUsdPerBuy && plan.baselineUsdPerBuy > 0);
}

export type PlanStatus = "on-track" | "slipping" | "ahead" | "complete" | "overdue" | "unknown";

export type PaceFix = {
  id: "contribute" | "date" | "target";
  primary: boolean;
  title: string;
  summary: string;
  detail: string;
  usdPerBuy?: number | null;
  targetDate?: string;
  targetAmount?: number;
};

export type PlanPace = {
  status: PlanStatus;
  symbol: string;
  change: number | null;
  daysDelta: number | null;
  impliedDays: number | null;
  projectedDate: string | null;
  originalDate: string;
  originalTarget: number;
  originalUsdPerBuy: number | null;
  requiredUsdPerBuy: number | null;
  achievableTarget: number | null;
  frequency: DcaFrequency;
  threshold: number;
  price: number | null;
  fixes: PaceFix[];
};

function dateOnly(value: string): string {
  const m = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : value.slice(0, 10);
}

function parseDay(value: string): Date | null {
  const iso = parseISO(dateOnly(value));
  if (Number.isNaN(iso.getTime())) return null;
  return startOfDay(iso);
}

export function prettyDate(value: string): string {
  const d = parseDay(value);
  return d ? format(d, "MMM d, yyyy") : value;
}

function money(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (n >= 100) return `$${Math.round(n).toLocaleString("en-US")}`;
  return `$${n.toFixed(2)}`;
}

function coins(n: number, symbol: string): string {
  if (!Number.isFinite(n)) return "—";
  const digits = n >= 100 ? 2 : n >= 1 ? 4 : 6;
  const s = n.toFixed(digits).replace(/\.?0+$/, "");
  return `${s} ${symbol}`;
}

function per(freq: DcaFrequency): string {
  return frequencyNoun(freq);
}

export function projectedCompletionDate(
  remainCoins: number,
  usdPerBuy: number,
  price: number,
  frequency: DcaFrequency,
  now = new Date(),
): { date: string; impliedDays: number } | null {
  if (!(remainCoins > 0 && usdPerBuy > 0 && price > 0)) return null;
  const coinsPerBuy = usdPerBuy / price;
  if (!(coinsPerBuy > 0)) return null;
  const periods = remainCoins / coinsPerBuy;
  const impliedDays = periods * PERIOD_DAYS[frequency];
  if (!Number.isFinite(impliedDays) || impliedDays < 0) return null;
  const date = addDays(startOfDay(now), Math.max(0, Math.ceil(impliedDays)));
  return { date: format(date, "yyyy-MM-dd"), impliedDays };
}

export function requiredContributionToHitDate(
  remainCoins: number,
  price: number,
  frequency: DcaFrequency,
  targetDate: string,
  now = new Date(),
): number | null {
  if (!(remainCoins > 0 && price > 0)) return remainCoins <= 0 ? 0 : null;
  const target = parseDay(targetDate);
  if (!target) return null;
  const periods = countPeriods(now, target, frequency);
  if (periods <= 0) return remainCoins * price;
  return (remainCoins * price) / periods;
}

export function achievableTargetByDate(
  currentAmount: number,
  usdPerBuy: number,
  price: number,
  frequency: DcaFrequency,
  targetDate: string,
  now = new Date(),
): number | null {
  if (!(usdPerBuy > 0 && price > 0)) return null;
  const target = parseDay(targetDate);
  if (!target) return null;
  const periods = countPeriods(now, target, frequency);
  if (periods <= 0) return currentAmount;
  return currentAmount + (usdPerBuy / price) * periods;
}

export function timeDeviation(impliedDays: number, baselineDays: number): number | null {
  if (!(baselineDays > 0) || !Number.isFinite(impliedDays)) return null;
  return (impliedDays - baselineDays) / baselineDays;
}

function priceUsed(holding: Holding, plan: DcaPlan, prices: PriceMap): number | null {
  if (plan.assumedPrice && plan.assumedPrice > 0) return plan.assumedPrice;
  const live = prices[holding.coingeckoId];
  return Number.isFinite(live) && live > 0 ? live : null;
}

export function evaluatePlanPace(
  holding: Holding,
  plan: DcaPlan,
  prices: PriceMap,
  now = new Date(),
  threshold = SLIP_THRESHOLD,
): PlanPace {
  const originalDate = dateOnly(plan.baselineTargetDate || plan.targetDate);
  const originalTarget = plan.baselineTargetAmount && plan.baselineTargetAmount > 0
    ? plan.baselineTargetAmount
    : holding.targetAmount;
  const originalUsd = plan.baselineUsdPerBuy && plan.baselineUsdPerBuy > 0 ? plan.baselineUsdPerBuy : null;
  const remain = remainingCoins(holding.currentAmount, holding.targetAmount);
  const price = priceUsed(holding, plan, prices);
  const required = price != null ? requiredContributionToHitDate(remain, price, plan.frequency, plan.targetDate, now) : null;
  const targetDay = parseDay(plan.targetDate);
  const pastDue = !targetDay || targetDay.getTime() <= startOfDay(now).getTime();

  const base: Omit<PlanPace, "status" | "fixes"> = {
    symbol: holding.symbol,
    change: null,
    daysDelta: null,
    impliedDays: null,
    projectedDate: null,
    originalDate,
    originalTarget,
    originalUsdPerBuy: originalUsd,
    requiredUsdPerBuy: required,
    achievableTarget: null,
    frequency: plan.frequency,
    threshold,
    price,
  };

  if (remain <= 0) {
    return { ...base, status: "complete", change: 0, impliedDays: 0, fixes: [] };
  }

  if (!hasBaseline(plan) || originalUsd == null || price == null) {
    return { ...base, status: "unknown", fixes: [] };
  }

  const projection = projectedCompletionDate(remain, originalUsd, price, plan.frequency, now);
  const impliedDays = projection?.impliedDays ?? null;
  const projectedDate = projection?.date ?? null;
  const change = impliedDays != null && plan.baselineDays ? timeDeviation(impliedDays, plan.baselineDays) : null;
  const projectedDay = projectedDate ? parseDay(projectedDate) : null;
  const daysDelta =
    targetDay && projectedDay ? differenceInCalendarDays(projectedDay, targetDay) : null;

  const achievable = achievableTargetByDate(
    holding.currentAmount,
    originalUsd,
    price,
    plan.frequency,
    originalDate,
    now,
  );

  let status: PlanStatus = "on-track";
  if (pastDue) status = "overdue";
  else if (change != null && change >= threshold) status = "slipping";
  else if (change != null && change <= -threshold) status = "ahead";

  const fixes = buildFixes({
    status,
    holding,
    plan,
    originalUsd,
    originalDate,
    originalTarget,
    required,
    projectedDate,
    achievable,
  });

  return {
    ...base,
    status,
    change,
    daysDelta,
    impliedDays,
    projectedDate,
    requiredUsdPerBuy: required,
    achievableTarget: achievable,
    fixes,
  };
}

function buildFixes(opts: {
  status: PlanStatus;
  holding: Holding;
  plan: DcaPlan;
  originalUsd: number;
  originalDate: string;
  originalTarget: number;
  required: number | null;
  projectedDate: string | null;
  achievable: number | null;
}): PaceFix[] {
  const { status, holding, plan, originalUsd, originalDate, originalTarget, required, projectedDate, achievable } =
    opts;
  if (status === "complete" || status === "unknown" || status === "on-track") return [];
  const freq = per(plan.frequency);
  const symbol = holding.symbol;
  const orig = money(originalUsd);

  if (status === "ahead") {
    const dateFix: PaceFix | null = projectedDate
      ? {
          id: "date",
          primary: true,
          title: "Keep current pace",
          summary: `Hit the stack on ${prettyDate(projectedDate)}`,
          detail: `instead of ${prettyDate(plan.targetDate)}.`,
          targetDate: projectedDate,
        }
      : null;
    const payFix: PaceFix | null =
      required != null && required < originalUsd
        ? {
            id: "contribute",
            primary: !dateFix,
            title: "Lower the contribution",
            summary: `${orig}/${freq} → ${money(required)}/${freq}`,
            detail: `still fills ${prettyDate(plan.targetDate)}.`,
            usdPerBuy: required,
          }
        : null;
    const targetFix: PaceFix | null =
      achievable != null && achievable > holding.targetAmount
        ? {
            id: "target",
            primary: false,
            title: "Raise the target",
            summary: `${coins(achievable, symbol)} by ${prettyDate(originalDate)}`,
            detail: `Same ${orig}/${freq}, instead of ${coins(originalTarget, symbol)}.`,
            targetAmount: achievable,
          }
        : null;
    return [dateFix, payFix, targetFix].filter((x): x is PaceFix => x != null);
  }

  const payFix: PaceFix | null =
    required != null && required > 0
      ? {
          id: "contribute",
          primary: status !== "overdue",
          title: status === "overdue" ? "Catch up in one buy" : "Increase contribution",
          summary:
            status === "overdue"
              ? `${money(required)} on the next ${freq}`
              : `${orig}/${freq} → ${money(required)}/${freq}`,
          detail:
            status === "overdue"
              ? `Put that into ${symbol} to close the gap.`
              : `Still hits ${prettyDate(plan.targetDate)}.`,
          usdPerBuy: required,
        }
      : null;

  const dateFix: PaceFix | null = projectedDate
    ? {
        id: "date",
        primary: status === "overdue",
        title: "Keep current pace",
        summary: `New target date: ${prettyDate(projectedDate)}`,
        detail: `Keep ${orig}/${freq}.`,
        targetDate: projectedDate,
      }
    : null;

  const targetFix: PaceFix | null =
    achievable != null && achievable < holding.targetAmount
      ? {
          id: "target",
          primary: false,
          title: "Adjust target",
          summary: `${coins(achievable, symbol)} by ${prettyDate(originalDate)}`,
          detail: `Instead of ${coins(originalTarget, symbol)}, same ${orig}/${freq}.`,
          targetAmount: achievable,
        }
      : achievable != null && status === "overdue"
        ? {
            id: "target",
            primary: false,
            title: "Mark the stack you have",
            summary: `${coins(holding.currentAmount, symbol)} held now`,
            detail: "Set the target to what's already in the bag.",
            targetAmount: holding.currentAmount > 0 ? holding.currentAmount : originalTarget,
          }
        : null;

  return [payFix, dateFix, targetFix].filter((x): x is PaceFix => x != null);
}

export function daysCopy(daysDelta: number | null): string | null {
  if (daysDelta == null || !Number.isFinite(daysDelta)) return null;
  const n = Math.abs(Math.round(daysDelta));
  if (n === 0) return "about on the original date";
  if (daysDelta > 0) return `${n} day${n === 1 ? "" : "s"} behind your target`;
  return `${n} day${n === 1 ? "" : "s"} early`;
}
