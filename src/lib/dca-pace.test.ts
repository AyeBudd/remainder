import assert from "node:assert/strict";
import test from "node:test";
import { addDays, format, startOfDay } from "date-fns";
import {
  achievableTargetByDate,
  evaluatePlanPace,
  projectedCompletionDate,
  requiredContributionToHitDate,
  SLIP_THRESHOLD,
  timeDeviation,
} from "./dca-pace.ts";
import type { DcaPlan, Holding, PriceMap } from "./types.ts";

const now = startOfDay(new Date("2026-01-01T12:00:00Z"));

function holding(partial: Partial<Holding> = {}): Holding {
  return {
    id: "1",
    symbol: "BTC",
    name: "Bitcoin",
    coingeckoId: "bitcoin",
    targetAmount: 1,
    currentAmount: 0.4,
    source: "manual",
    walletAddress: null,
    walletAmount: 0,
    manualAmount: 0.4,
    costBasisUsd: 5000,
    ...partial,
  };
}

function plan(partial: Partial<DcaPlan> = {}): DcaPlan {
  return {
    id: "p1",
    holdingId: "1",
    targetDate: "2027-01-01",
    frequency: "weekly",
    assumedPrice: null,
    baselineAt: "2026-01-01",
    baselineDays: 365,
    baselineUsdPerBuy: 150,
    baselinePrice: 13_000,
    baselineRemaining: 0.6,
    baselineTargetAmount: 1,
    baselineCurrentAmount: 0.4,
    baselineTargetDate: "2027-01-01",
    ...partial,
  };
}

test("SLIP_THRESHOLD defaults to 25%", () => {
  assert.equal(SLIP_THRESHOLD, 0.25);
});

test("projected completion from original $ at a higher price slips", () => {
  const proj = projectedCompletionDate(0.6, 150, 18_000, "weekly", now);
  assert.ok(proj);
  assert.ok(proj.impliedDays > 365);
  assert.match(proj.date, /^\d{4}-\d{2}-\d{2}$/);
});

test("required contribution rises with price to keep the date", () => {
  const need = requiredContributionToHitDate(0.6, 18_000, "weekly", "2027-01-01", now);
  assert.ok(need);
  assert.ok(need > 150);
});

test("achievable target shrinks when price jumps and $ stays put", () => {
  const got = achievableTargetByDate(0.4, 150, 18_000, "weekly", "2027-01-01", now);
  assert.ok(got);
  assert.ok(got < 1);
  assert.ok(got > 0.4);
});

test("time deviation is (implied - baseline) / baseline", () => {
  assert.equal(timeDeviation(500, 400), 0.25);
  assert.equal(timeDeviation(300, 400), -0.25);
});

test("complete when the bag is already full", () => {
  const pace = evaluatePlanPace(holding({ currentAmount: 1, manualAmount: 1 }), plan(), { bitcoin: 18_000 }, now);
  assert.equal(pace.status, "complete");
  assert.equal(pace.fixes.length, 0);
});

test("unknown without a baseline or a price", () => {
  const noBase = evaluatePlanPace(holding(), plan({ baselineUsdPerBuy: null, baselineDays: null }), { bitcoin: 18_000 }, now);
  assert.equal(noBase.status, "unknown");
  const noPrice = evaluatePlanPace(holding(), plan(), {}, now);
  assert.equal(noPrice.status, "unknown");
});

test("on-track when implied time stays inside the threshold", () => {
  const prices: PriceMap = { bitcoin: 13_000 };
  const pace = evaluatePlanPace(holding(), plan(), prices, now);
  assert.equal(pace.status, "on-track");
  assert.ok(pace.fixes.length === 0 || pace.status === "on-track");
});

test("slipping when price jumps enough to blow the 25% ETA", () => {
  const pace = evaluatePlanPace(holding(), plan(), { bitcoin: 20_000 }, now);
  assert.equal(pace.status, "slipping");
  assert.ok(pace.change != null && pace.change >= 0.25);
  assert.ok(pace.daysDelta != null && pace.daysDelta > 0);
  const ids = pace.fixes.map((f) => f.id);
  assert.ok(ids.includes("contribute"));
  assert.ok(ids.includes("date"));
  assert.ok(ids.includes("target"));
  const primary = pace.fixes.find((f) => f.primary);
  assert.equal(primary?.id, "contribute");
  const pay = pace.fixes.find((f) => f.id === "contribute");
  assert.ok(pay?.usdPerBuy && pay.usdPerBuy > 150);
});

test("ahead when price drops enough", () => {
  const pace = evaluatePlanPace(holding(), plan(), { bitcoin: 8_000 }, now);
  assert.equal(pace.status, "ahead");
  assert.ok(pace.change != null && pace.change <= -0.25);
  assert.ok(pace.daysDelta != null && pace.daysDelta < 0);
  const primary = pace.fixes.find((f) => f.primary);
  assert.equal(primary?.id, "date");
});

test("threshold is configurable", () => {
  const tight = evaluatePlanPace(holding(), plan(), { bitcoin: 14_500 }, now, 0.02);
  assert.equal(tight.status, "slipping");
  const loose = evaluatePlanPace(holding(), plan(), { bitcoin: 14_500 }, now, 0.9);
  assert.equal(loose.status, "on-track");
});

test("overdue when the target date is already past", () => {
  const yesterday = format(addDays(now, -1), "yyyy-MM-dd");
  const pace = evaluatePlanPace(
    holding(),
    plan({ targetDate: yesterday, baselineTargetDate: yesterday, baselineDays: 10 }),
    { bitcoin: 13_000 },
    now,
  );
  assert.equal(pace.status, "overdue");
  assert.ok(pace.fixes.some((f) => f.id === "date" || f.id === "contribute"));
});

test("zero remaining coins is complete even if date passed", () => {
  const yesterday = format(addDays(now, -1), "yyyy-MM-dd");
  const pace = evaluatePlanPace(
    holding({ currentAmount: 1.2, targetAmount: 1, manualAmount: 1.2 }),
    plan({ targetDate: yesterday }),
    { bitcoin: 13_000 },
    now,
  );
  assert.equal(pace.status, "complete");
});

test("zero contribution cannot project a date", () => {
  assert.equal(projectedCompletionDate(0.6, 0, 13_000, "weekly", now), null);
  assert.equal(projectedCompletionDate(0, 150, 13_000, "weekly", now), null);
});

test("recapturing at the required contribution puts the plan on track", () => {
  const slipped = evaluatePlanPace(holding(), plan(), { bitcoin: 20_000 }, now);
  assert.equal(slipped.status, "slipping");
  assert.ok(slipped.requiredUsdPerBuy && slipped.requiredUsdPerBuy > 150);
  const accepted = evaluatePlanPace(
    holding(),
    plan({
      baselineUsdPerBuy: slipped.requiredUsdPerBuy,
      baselineDays: 365,
      baselinePrice: 20_000,
    }),
    { bitcoin: 20_000 },
    now,
  );
  assert.equal(accepted.status, "on-track");
});

test("tiny remainder still projects and can slip", () => {
  const pace = evaluatePlanPace(
    holding({ currentAmount: 0.999, manualAmount: 0.999, targetAmount: 1 }),
    plan({ baselineRemaining: 0.001, baselineUsdPerBuy: 0.5, baselineDays: 365 }),
    { bitcoin: 20_000 },
    now,
  );
  assert.ok(pace.status === "slipping" || pace.status === "on-track" || pace.status === "ahead");
  assert.ok(pace.impliedDays == null || Number.isFinite(pace.impliedDays));
});

test("very large stacks stay finite", () => {
  const pace = evaluatePlanPace(
    holding({ currentAmount: 400, targetAmount: 1000, manualAmount: 400 }),
    plan({
      baselineUsdPerBuy: 50_000,
      baselineRemaining: 600,
      baselineTargetAmount: 1000,
      baselineCurrentAmount: 400,
      baselineDays: 365,
    }),
    { bitcoin: 90_000 },
    now,
  );
  assert.equal(pace.status, "slipping");
  assert.ok(pace.requiredUsdPerBuy && Number.isFinite(pace.requiredUsdPerBuy));
  assert.ok(pace.fixes.every((f) => f.summary.length > 0));
});

test("monthly frequency uses the same rec shape", () => {
  const pace = evaluatePlanPace(
    holding(),
    plan({ frequency: "monthly", baselineUsdPerBuy: 600 }),
    { bitcoin: 20_000 },
    now,
  );
  assert.equal(pace.status, "slipping");
  const pay = pace.fixes.find((f) => f.id === "contribute");
  assert.ok(pay?.summary.includes("/month"));
});

test("two holdings evaluate independently", () => {
  const btc = evaluatePlanPace(holding(), plan(), { bitcoin: 20_000 }, now);
  const eth = evaluatePlanPace(
    holding({ id: "2", symbol: "ETH", coingeckoId: "ethereum", targetAmount: 16, currentAmount: 8 }),
    plan({
      id: "p2",
      holdingId: "2",
      baselineUsdPerBuy: (8 * 200 * 7) / 365,
      baselineTargetAmount: 16,
      baselineCurrentAmount: 8,
      baselineRemaining: 8,
    }),
    { ethereum: 200 },
    now,
  );
  assert.equal(btc.status, "slipping");
  assert.equal(eth.status, "on-track");
});

test("slipping recs lead with numbers", () => {
  const pace = evaluatePlanPace(holding(), plan(), { bitcoin: 20_000 }, now);
  const pay = pace.fixes.find((f) => f.id === "contribute");
  assert.ok(pay?.summary.includes("→"));
  assert.ok(pay?.summary.includes("/week"));
  const date = pace.fixes.find((f) => f.id === "date");
  assert.ok(date?.summary.toLowerCase().includes("date"));
  const target = pace.fixes.find((f) => f.id === "target");
  assert.ok(target?.summary.includes("BTC"));
});
