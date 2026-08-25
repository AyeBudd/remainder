import type { DcaFrequency, DcaPlanInput, Holding, HoldingInput } from "./types.ts";

export type OnboardingStep = 1 | 2 | 3 | 4 | 5;
export type GoalMode = "coins" | "usd";
export type DeadlineMode = "date" | "none";

export type OnboardingDraft = {
  step: OnboardingStep;
  symbol: string | null;
  name: string | null;
  coingeckoId: string | null;
  goalMode: GoalMode;
  goalValue: string;
  current: string;
  deadlineMode: DeadlineMode;
  targetDate: string;
  frequency: DcaFrequency;
};

export const ONBOARDING_STEPS = 5;

export const FEATURED_SYMBOLS = ["BTC", "ETH", "SOL"] as const;

export function defaultOnboardingDate(monthsAhead = 6): string {
  const d = new Date();
  d.setMonth(d.getMonth() + monthsAhead);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function emptyDraft(): OnboardingDraft {
  return {
    step: 1,
    symbol: null,
    name: null,
    coingeckoId: null,
    goalMode: "coins",
    goalValue: "",
    current: "",
    deadlineMode: "date",
    targetDate: defaultOnboardingDate(6),
    frequency: "weekly",
  };
}

export function shouldShowOnboarding(opts: {
  booted: boolean;
  completed: boolean;
  holdingsCount: number;
}): boolean {
  if (!opts.booted) return false;
  if (opts.completed) return false;
  if (opts.holdingsCount > 0) return false;
  return true;
}

export function parsePositive(raw: string): number | null {
  const cleaned = raw.replace(/,/g, "").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function parseNonNegative(raw: string): number | null {
  const cleaned = raw.replace(/,/g, "").trim();
  if (!cleaned) return 0;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export function coinsFromUsd(usd: number, price: number | null): number | null {
  if (!(usd > 0) || price == null || !(price > 0)) return null;
  return usd / price;
}

export function resolveTargetCoins(draft: OnboardingDraft, price: number | null): number | null {
  const goal = parsePositive(draft.goalValue);
  if (goal == null) return null;
  if (draft.goalMode === "coins") return goal;
  return coinsFromUsd(goal, price);
}

export function prefillCurrent(draft: OnboardingDraft, holdings: Holding[]): OnboardingDraft {
  if (!draft.symbol) return draft;
  if (draft.current.trim() !== "") return draft;
  const existing = holdings.find((h) => h.symbol === draft.symbol || h.coingeckoId === draft.coingeckoId);
  if (!existing) return draft;
  return { ...draft, current: String(existing.currentAmount) };
}

export type OnboardingPayload = {
  holding: HoldingInput;
  plan: Omit<DcaPlanInput, "holdingId"> | null;
  remaining: number;
  targetCoins: number;
  currentCoins: number;
};

export function buildOnboardingPayload(
  draft: OnboardingDraft,
  price: number | null,
): { ok: true; value: OnboardingPayload } | { ok: false; error: string } {
  if (!draft.symbol || !draft.coingeckoId) return { ok: false, error: "Pick an asset." };
  const targetCoins = resolveTargetCoins(draft, price);
  if (targetCoins == null || !(targetCoins > 0)) {
    return {
      ok: false,
      error:
        draft.goalMode === "usd" && (price == null || !(price > 0))
          ? "Need a live price to set a dollar target."
          : "Enter a target greater than zero.",
    };
  }
  const currentCoins = parseNonNegative(draft.current);
  if (currentCoins == null) return { ok: false, error: "Current holding must be a number." };
  if (draft.deadlineMode === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(draft.targetDate)) {
    return { ok: false, error: "Pick a target date, or choose no deadline." };
  }
  const holding: HoldingInput = {
    symbol: draft.symbol,
    name: draft.name ?? draft.symbol,
    coingeckoId: draft.coingeckoId,
    targetAmount: targetCoins,
    currentAmount: currentCoins,
    source: "manual",
    walletAddress: null,
    walletAmount: 0,
    manualAmount: currentCoins,
    markPrice: price && price > 0 ? price : undefined,
  };
  const remaining = Math.max(0, targetCoins - currentCoins);
  const plan =
    draft.deadlineMode === "date"
      ? { targetDate: draft.targetDate, frequency: draft.frequency, assumedPrice: null as number | null }
      : null;
  return {
    ok: true,
    value: { holding, plan, remaining, targetCoins, currentCoins },
  };
}

export function clampStep(step: number): OnboardingStep {
  if (step < 1) return 1;
  if (step > 5) return 5;
  return step as OnboardingStep;
}
