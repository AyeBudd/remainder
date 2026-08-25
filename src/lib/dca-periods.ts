import { addDays, addMonths, addWeeks, differenceInCalendarDays, differenceInCalendarMonths, isAfter, startOfDay } from "date-fns";
import type { DcaFrequency } from "./types";

export const PERIOD_DAYS: Record<DcaFrequency, number> = {
  daily: 1,
  weekly: 7,
  biweekly: 14,
  monthly: 365 / 12,
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

export function stepDate(from: Date, freq: DcaFrequency, n: number): Date {
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
