import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  format,
  isAfter,
  parseISO,
  startOfDay,
} from "date-fns";
import type { DcaFrequency, DcaPlan, Holding, PriceMap } from "./types";
import { remainingCoins } from "./assets";

export type DcaPoint = {
  date: string;
  label: string;
  fullDate: string;
  amount: number;
  usd: number | null;
  fill: number;
  target: number;
  milestone?: 25 | 50 | 75;
};

export type DcaMilestone = {
  pct: 25 | 50 | 75;
  date: string;
  label: string;
  fullDate: string;
  amount: number;
  usd: number | null;
};

export type DcaQuote = {
  periods: number;
  remainingCoins: number;
  remainingUsd: number | null;
  coinsPerBuy: number;
  usdPerBuy: number | null;
  priceUsed: number | null;
  usedAssumedPrice: boolean;
  pastDue: boolean;
  alreadyMet: boolean;
  schedule: { date: string; label: string; amount: number; usd: number | null }[];
  series: DcaPoint[];
  milestones: DcaMilestone[];
};

const FREQ_LABEL: Record<DcaFrequency, string> = {
  daily: "day",
  weekly: "week",
  biweekly: "two weeks",
  monthly: "month",
};

export function frequencyNoun(freq: DcaFrequency): string {
  return FREQ_LABEL[freq];
}

function fullDateLabel(d: Date): string {
  return format(d, "MMM d, yyyy");
}

function pointOf(
  date: Date,
  amount: number,
  target: number,
  price: number | null,
  label?: string,
): DcaPoint {
  return {
    date: format(date, "yyyy-MM-dd"),
    label: label ?? format(date, "MMM d"),
    fullDate: fullDateLabel(date),
    amount,
    usd: price != null ? amount * price : null,
    fill: target > 0 ? amount / target : 0,
    target,
  };
}

export function markMilestones(series: DcaPoint[], currentAmount: number, targetAmount: number): DcaMilestone[] {
  if (!(targetAmount > 0) || series.length === 0) return [];
  const out: DcaMilestone[] = [];
  for (const pct of [25, 50, 75] as const) {
    const need = targetAmount * (pct / 100);
    if (currentAmount + 1e-12 >= need) continue;
    const hit = series.find((p) => p.amount + 1e-12 >= need);
    if (!hit) continue;
    hit.milestone = pct;
    out.push({
      pct,
      date: hit.date,
      label: hit.label,
      fullDate: hit.fullDate,
      amount: hit.amount,
      usd: hit.usd,
    });
  }
  return out;
}

export function chartDots(series: DcaPoint[]): DcaPoint[] {
  if (series.length <= 20) return series;
  const keep = new Set<number>([0, series.length - 1]);
  series.forEach((p, i) => {
    if (p.milestone) keep.add(i);
  });
  const step = Math.ceil((series.length - 1) / 12);
  for (let i = 0; i < series.length; i += step) keep.add(i);
  return series.filter((_, i) => keep.has(i));
}

export function countPeriods(from: Date, to: Date, freq: DcaFrequency): number {
  const start = startOfDay(from);
  const end = startOfDay(to);
  if (!isAfter(end, start)) return 0;
  const days = differenceInCalendarDays(end, start);
  switch (freq) {
    case "daily":
      return Math.max(1, days);
    case "weekly":
      return Math.max(1, Math.ceil(days / 7));
    case "biweekly":
      return Math.max(1, Math.ceil(days / 14));
    case "monthly":
      return Math.max(1, differenceInCalendarMonths(end, start) || 1);
  }
}

function stepDate(from: Date, freq: DcaFrequency, n: number): Date {
  switch (freq) {
    case "daily":
      return addDays(from, n);
    case "weekly":
      return addWeeks(from, n);
    case "biweekly":
      return addWeeks(from, n * 2);
    case "monthly":
      return addMonths(from, n);
  }
}

export function quoteDca(
  holding: Holding,
  plan: Pick<DcaPlan, "targetDate" | "frequency" | "assumedPrice">,
  prices: PriceMap,
  now = new Date(),
): DcaQuote {
  const remain = remainingCoins(holding.currentAmount, holding.targetAmount);
  const live = prices[holding.coingeckoId];
  const priceUsed =
    plan.assumedPrice && plan.assumedPrice > 0
      ? plan.assumedPrice
      : Number.isFinite(live)
        ? live
        : null;
  const remainingUsd = priceUsed != null ? remain * priceUsed : null;
  const target = parseISO(plan.targetDate);
  const pastDue = !isAfter(startOfDay(target), startOfDay(now));
  const alreadyMet = remain <= 0;

  if (alreadyMet || pastDue) {
    const nowPoint = pointOf(now, holding.currentAmount, holding.targetAmount, priceUsed, "Now");
    return {
      periods: 0,
      remainingCoins: remain,
      remainingUsd,
      coinsPerBuy: 0,
      usdPerBuy: remainingUsd === 0 ? 0 : null,
      priceUsed,
      usedAssumedPrice: Boolean(plan.assumedPrice && plan.assumedPrice > 0),
      pastDue,
      alreadyMet,
      schedule: [],
      series: [nowPoint],
      milestones: [],
    };
  }

  const periods = countPeriods(now, target, plan.frequency);
  const coinsPerBuy = remain / periods;
  const usdPerBuy = remainingUsd != null ? remainingUsd / periods : null;

  const schedule: DcaQuote["schedule"] = [];
  const series: DcaPoint[] = [
    pointOf(now, holding.currentAmount, holding.targetAmount, priceUsed, "Now"),
  ];

  const previewCount = Math.min(periods, 8);
  for (let i = 1; i <= periods; i += 1) {
    const date = stepDate(now, plan.frequency, i);
    const amount = Math.min(holding.targetAmount, holding.currentAmount + coinsPerBuy * i);
    const point = pointOf(date, amount, holding.targetAmount, priceUsed);
    if (i <= previewCount || i === periods) {
      schedule.push({ date: point.date, label: point.label, amount, usd: usdPerBuy });
    }
    series.push(point);
  }

  const milestones = markMilestones(series, holding.currentAmount, holding.targetAmount);

  return {
    periods,
    remainingCoins: remain,
    remainingUsd,
    coinsPerBuy,
    usdPerBuy,
    priceUsed,
    usedAssumedPrice: Boolean(plan.assumedPrice && plan.assumedPrice > 0),
    pastDue,
    alreadyMet,
    schedule,
    series,
    milestones,
  };
}

export function defaultTargetDate(monthsAhead = 6): string {
  return format(addMonths(new Date(), monthsAhead), "yyyy-MM-dd");
}
