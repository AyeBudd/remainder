import assert from "node:assert/strict";
import test from "node:test";
import { addDays, format, startOfDay } from "date-fns";
import {
  buildSnapshot,
  detectNewMilestones,
  estimatedMilestoneDate,
  planVersionFrom,
  progressMoment,
  sliceSnapshots,
  summarizeProgress,
  versionChanged,
  type HoldingSnapshot,
} from "./progress.ts";
import type { DcaPlan, Holding, PriceMap } from "./types.ts";

const now = startOfDay(new Date("2026-09-01T12:00:00Z"));

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

function snap(partial: Partial<HoldingSnapshot> & { takenAt: string; assetQuantity: number }): HoldingSnapshot {
  const qty = partial.assetQuantity;
  const target = partial.targetQuantity ?? 1;
  return {
    id: `1:${partial.takenAt}`,
    holdingId: "1",
    symbol: "BTC",
    targetQuantity: target,
    remainingQuantity: Math.max(0, target - qty),
    completionPct: target > 0 ? qty / target : 0,
    assetPrice: 80_000,
    holdingsUsd: qty * 80_000,
    targetUsd: target * 80_000,
    usdPerBuy: 150,
    projectedDate: "2027-02-01",
    targetDate: "2027-01-01",
    planStatus: "on-track",
    ...partial,
  };
}

test("snapshot stores live price and derived usd", () => {
  const prices: PriceMap = { bitcoin: 80_000 };
  const row = buildSnapshot(holding(), plan(), prices, now);
  assert.equal(row.takenAt, "2026-09-01");
  assert.equal(row.assetQuantity, 0.4);
  assert.equal(row.assetPrice, 80_000);
  assert.equal(row.holdingsUsd, 32_000);
  assert.equal(row.targetUsd, 80_000);
  assert.ok(row.usdPerBuy != null && row.usdPerBuy > 0);
});

test("missing price keeps coin history and skips fiat", () => {
  const row = buildSnapshot(holding(), plan(), {}, now);
  assert.equal(row.assetQuantity, 0.4);
  assert.equal(row.assetPrice, null);
  assert.equal(row.holdingsUsd, null);
  assert.equal(row.targetUsd, null);
});

test("no plan still snapshots quantities", () => {
  const row = buildSnapshot(holding(), null, { bitcoin: 80_000 }, now);
  assert.equal(row.planStatus, "none");
  assert.equal(row.targetDate, null);
  assert.equal(row.assetPrice, 80_000);
});

test("complete holding is marked complete even without a plan", () => {
  const row = buildSnapshot(holding({ currentAmount: 1.1, manualAmount: 1.1 }), null, { bitcoin: 80_000 }, now);
  assert.equal(row.planStatus, "complete");
  assert.equal(row.remainingQuantity, 0);
});

test("milestones fire once when crossing each band", () => {
  const first = detectNewMilestones("1", 0.1, 0.26, [], "2026-08-12");
  assert.deepEqual(
    first.map((m) => m.pct),
    [25],
  );
  const again = detectNewMilestones("1", 0.26, 0.3, first, "2026-08-20");
  assert.equal(again.length, 0);
  const fifty = detectNewMilestones("1", 0.4, 0.51, first, "2026-09-28");
  assert.equal(fifty[0]?.pct, 50);
});

test("dropping below a reached milestone does not un-record it", () => {
  const have = detectNewMilestones("1", 0.2, 0.55, [], "2026-09-01");
  assert.deepEqual(
    have.map((m) => m.pct),
    [25, 50],
  );
  const drop = detectNewMilestones("1", 0.55, 0.4, have, "2026-09-10");
  assert.equal(drop.length, 0);
});

test("100% milestone on completion", () => {
  const got = detectNewMilestones("1", 0.9, 1, [], "2026-12-01");
  assert.ok(got.some((m) => m.pct === 100));
});

test("summarize uses first and last snapshots for added-since-start", () => {
  const snaps = [
    snap({ takenAt: "2026-08-01", assetQuantity: 0.21 }),
    snap({ takenAt: "2026-08-15", assetQuantity: 0.27 }),
    snap({ takenAt: "2026-09-01", assetQuantity: 0.39 }),
  ];
  const s = summarizeProgress(snaps, plan(), now);
  assert.equal(s.current, 0.39);
  assert.ok(Math.abs(s.addedSinceStart - 0.18) < 1e-9);
  assert.ok(s.last30d > 0);
  assert.ok(s.usdAddedSinceStart != null && s.usdAddedSinceStart > 0);
});

test("actual vs planned contribution from snapshot diffs", () => {
  const snaps = [
    snap({ takenAt: "2026-08-04", assetQuantity: 0.3, assetPrice: 20_000, usdPerBuy: 150 }),
    snap({ takenAt: "2026-08-11", assetQuantity: 0.3075, assetPrice: 20_000, usdPerBuy: 150 }),
    snap({ takenAt: "2026-08-18", assetQuantity: 0.315, assetPrice: 20_000, usdPerBuy: 150 }),
    snap({ takenAt: "2026-08-25", assetQuantity: 0.3225, assetPrice: 20_000, usdPerBuy: 150 }),
    snap({ takenAt: "2026-09-01", assetQuantity: 0.33, assetPrice: 20_000, usdPerBuy: 150 }),
  ];
  const s = summarizeProgress(snaps, plan(), now);
  assert.ok(s.actualUsdPerWeek != null);
  assert.ok(s.actualVsPlan != null);
  assert.ok(s.contributionStatus !== "unknown");
});

test("no plan and thin history leave contribution unknown", () => {
  const snaps = [snap({ takenAt: "2026-09-01", assetQuantity: 0.4 })];
  const s = summarizeProgress(snaps, null, now);
  assert.equal(s.contributionStatus, "unknown");
  assert.equal(s.actualUsdPerWeek, null);
});

test("no deadline still projects from observed weekly coins", () => {
  const snaps = [
    snap({ takenAt: "2026-08-01", assetQuantity: 0.2, targetDate: null }),
    snap({ takenAt: "2026-09-01", assetQuantity: 0.4, targetDate: null }),
  ];
  const s = summarizeProgress(snaps, null, now);
  assert.ok(s.perWeek != null && s.perWeek > 0);
  assert.ok(s.projectedDate);
});

test("old snapshots keep their own target and price after a target change", () => {
  const old = snap({ takenAt: "2026-08-01", assetQuantity: 0.2, targetQuantity: 1, assetPrice: 50_000 });
  const next = snap({ takenAt: "2026-09-01", assetQuantity: 0.4, targetQuantity: 2, assetPrice: 80_000 });
  assert.equal(old.targetQuantity, 1);
  assert.equal(old.assetPrice, 50_000);
  assert.equal(next.targetQuantity, 2);
  const s = summarizeProgress([old, next], plan({ baselineTargetAmount: 1 }), now);
  assert.equal(s.current, 0.4);
});

test("versionChanged is true when date or target moves", () => {
  const a = planVersionFrom(holding(), plan(), 150, now);
  const b = planVersionFrom(holding({ targetAmount: 1.5 }), plan(), 150, now);
  assert.equal(versionChanged(undefined, a), true);
  assert.equal(versionChanged(a, a), false);
  assert.equal(versionChanged(a, b), true);
  const c = planVersionFrom(holding(), plan({ targetDate: "2027-03-01" }), 150, now);
  assert.equal(versionChanged(a, c), true);
});

test("slice 7d keeps daily points", () => {
  const snaps = Array.from({ length: 20 }, (_, i) =>
    snap({ takenAt: format(addDays(now, i - 19), "yyyy-MM-dd"), assetQuantity: 0.2 + i * 0.01 }),
  );
  const week = sliceSnapshots(snaps, "7d", now);
  assert.ok(week.length >= 7);
  assert.ok(week.length <= 9);
});

test("estimated remaining milestone stays in the future", () => {
  const date = estimatedMilestoneDate(75, 0.4, 1, 0.05, now);
  assert.ok(date);
  assert.ok(date > "2026-09-01");
});

test("tiny remainder still snapshots", () => {
  const row = buildSnapshot(
    holding({ currentAmount: 0.999999, targetAmount: 1, manualAmount: 0.999999 }),
    plan(),
    { bitcoin: 80_000 },
    now,
  );
  assert.ok(row.remainingQuantity < 0.001);
  assert.ok(row.completionPct > 0.99);
});

test("progress moment prefers this-month accumulation", () => {
  const s = summarizeProgress(
    [snap({ takenAt: "2026-09-01", assetQuantity: 0.3 }), snap({ takenAt: "2026-09-20", assetQuantity: 0.38 })],
    plan(),
    now,
  );
  const line = progressMoment(s, "BTC");
  assert.ok(line && line.includes("BTC"));
});
