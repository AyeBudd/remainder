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
  series: { date: string; label: string; amount: number; target: number }[];
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
      series: [
        {
          date: format(now, "yyyy-MM-dd"),
          label: "Now",
          amount: holding.currentAmount,
          target: holding.targetAmount,
        },
      ],
    };
  }

  const periods = countPeriods(now, target, plan.frequency);
  const coinsPerBuy = remain / periods;
  const usdPerBuy = remainingUsd != null ? remainingUsd / periods : null;

  const schedule: DcaQuote["schedule"] = [];
  const series: DcaQuote["series"] = [
    {
      date: format(now, "yyyy-MM-dd"),
      label: "Now",
      amount: holding.currentAmount,
      target: holding.targetAmount,
    },
  ];

  const previewCount = Math.min(periods, 8);
  for (let i = 1; i <= periods; i += 1) {
    const date = stepDate(now, plan.frequency, i);
    const amount = Math.min(holding.targetAmount, holding.currentAmount + coinsPerBuy * i);
    const point = {
      date: format(date, "yyyy-MM-dd"),
      label: format(date, "MMM d"),
      amount,
      usd: usdPerBuy,
    };
    if (i <= previewCount || i === periods) {
      schedule.push({ ...point, usd: usdPerBuy });
    }
    series.push({
      date: point.date,
      label: point.label,
      amount,
      target: holding.targetAmount,
    });
  }

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
  };
}

export function defaultTargetDate(monthsAhead = 6): string {
  return format(addMonths(new Date(), monthsAhead), "yyyy-MM-dd");
}
