import assert from "node:assert/strict";
import test from "node:test";
import {
  buildOnboardingPayload,
  coinsFromUsd,
  emptyDraft,
  parseNonNegative,
  parsePositive,
  shouldShowOnboarding,
} from "./onboarding.ts";

test("new users with no holdings see onboarding", () => {
  assert.equal(shouldShowOnboarding({ booted: true, completed: false, holdingsCount: 0 }), true);
});

test("existing holdings skip onboarding", () => {
  assert.equal(shouldShowOnboarding({ booted: true, completed: false, holdingsCount: 2 }), false);
});

test("completed flag skips onboarding", () => {
  assert.equal(shouldShowOnboarding({ booted: true, completed: true, holdingsCount: 0 }), false);
});

test("not booted does not flash onboarding", () => {
  assert.equal(shouldShowOnboarding({ booted: false, completed: false, holdingsCount: 0 }), false);
});

test("usd target converts at the live price", () => {
  assert.equal(coinsFromUsd(100_000, 50_000), 2);
  assert.equal(coinsFromUsd(100_000, null), null);
  assert.equal(coinsFromUsd(100_000, 0), null);
});

test("parse amounts", () => {
  assert.equal(parsePositive("1"), 1);
  assert.equal(parsePositive("0"), null);
  assert.equal(parseNonNegative(""), 0);
  assert.equal(parseNonNegative("0.37"), 0.37);
});

test("coin target with a date builds a plan", () => {
  const draft = {
    ...emptyDraft(),
    symbol: "BTC",
    name: "Bitcoin",
    coingeckoId: "bitcoin",
    goalMode: "coins" as const,
    goalValue: "1",
    current: "0.37",
    deadlineMode: "date" as const,
    targetDate: "2027-01-01",
  };
  const got = buildOnboardingPayload(draft, 80_000);
  assert.equal(got.ok, true);
  if (!got.ok) return;
  assert.equal(got.value.targetCoins, 1);
  assert.equal(got.value.currentCoins, 0.37);
  assert.ok(Math.abs(got.value.remaining - 0.63) < 1e-9);
  assert.equal(got.value.plan?.targetDate, "2027-01-01");
  assert.equal(got.value.plan?.frequency, "weekly");
});

test("no deadline creates a target without a contribution plan", () => {
  const draft = {
    ...emptyDraft(),
    symbol: "ETH",
    name: "Ethereum",
    coingeckoId: "ethereum",
    goalValue: "16",
    current: "0",
    deadlineMode: "none" as const,
  };
  const got = buildOnboardingPayload(draft, 3_000);
  assert.equal(got.ok, true);
  if (!got.ok) return;
  assert.equal(got.value.plan, null);
  assert.equal(got.value.holding.targetAmount, 16);
});

test("dollar target without a price is rejected", () => {
  const draft = {
    ...emptyDraft(),
    symbol: "BTC",
    name: "Bitcoin",
    coingeckoId: "bitcoin",
    goalMode: "usd" as const,
    goalValue: "100000",
  };
  const got = buildOnboardingPayload(draft, null);
  assert.equal(got.ok, false);
});

test("dollar target becomes coins at the quoted price", () => {
  const draft = {
    ...emptyDraft(),
    symbol: "BTC",
    name: "Bitcoin",
    coingeckoId: "bitcoin",
    goalMode: "usd" as const,
    goalValue: "100000",
    current: "0",
    deadlineMode: "none" as const,
  };
  const got = buildOnboardingPayload(draft, 50_000);
  assert.equal(got.ok, true);
  if (!got.ok) return;
  assert.equal(got.value.targetCoins, 2);
});

test("resume keeps draft fields", () => {
  const draft = emptyDraft();
  draft.step = 3;
  draft.symbol = "SOL";
  draft.goalValue = "250";
  assert.equal(draft.step, 3);
  assert.equal(draft.symbol, "SOL");
  assert.equal(draft.goalValue, "250");
});
