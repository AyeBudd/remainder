import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:8080/";
const out = process.argv[3] || "screenshots/dca-notice.png";
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();
await page.setViewportSize({ width: 1280, height: 900 });
const log = [];

function slipPlans(raw) {
  if (!raw) return raw;
  const parsed = JSON.parse(raw);
  parsed.plans = (parsed.plans || []).map((p) => ({
    ...p,
    baselineAt: "2026-01-01",
    baselineDays: 180,
    baselineUsdPerBuy: 1,
    baselinePrice: 10_000,
    baselineRemaining: 0.63,
    baselineTargetAmount: 1,
    baselineCurrentAmount: 0.37,
    baselineTargetDate: p.targetDate,
  }));
  return JSON.stringify(parsed);
}

function sampleTargetDate() {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 6, 19));
  return d.toISOString().slice(0, 10);
}

function sampleLedger() {
  const targetDate = sampleTargetDate();
  return JSON.stringify({
    holdings: [
      {
        id: "sample-btc",
        symbol: "BTC",
        name: "Bitcoin",
        coingeckoId: "bitcoin",
        targetAmount: 1,
        currentAmount: 0.37,
        source: "manual",
        walletAddress: null,
        walletAmount: 0,
        manualAmount: 0.37,
        costBasisUsd: null,
      },
      {
        id: "sample-eth",
        symbol: "ETH",
        name: "Ethereum",
        coingeckoId: "ethereum",
        targetAmount: 16,
        currentAmount: 8.4,
        source: "manual",
        walletAddress: null,
        walletAmount: 0,
        manualAmount: 8.4,
        costBasisUsd: null,
      },
      {
        id: "sample-sol",
        symbol: "SOL",
        name: "Solana",
        coingeckoId: "solana",
        targetAmount: 250,
        currentAmount: 64,
        source: "manual",
        walletAddress: null,
        walletAmount: 0,
        manualAmount: 64,
        costBasisUsd: null,
      },
    ],
    plans: [
      {
        id: "sample-dca-btc",
        holdingId: "sample-btc",
        targetDate,
        frequency: "weekly",
        assumedPrice: null,
      },
    ],
  });
}

try {
  await context.addInitScript(
    ([ledger, onboard]) => {
      localStorage.setItem("remainder.v1", ledger);
      localStorage.setItem("remainder.onboarding.v1", onboard);
    },
    [sampleLedger(), JSON.stringify({ completed: true, draft: null })],
  );
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForSelector("text=Remaindr", { timeout: 20000 });
  await page.waitForSelector("text=Holdings", { timeout: 20000 });
  await page.waitForSelector("text=On track", { timeout: 25000 });
  const onTrack = await page.getByText("On track").count();
  log.push({ loaded: true, onTrack });
  await page.screenshot({ path: out, fullPage: false });

  const slipped = await page.evaluate(() => localStorage.getItem("remainder.v1"));
  await context.addInitScript((value) => {
    if (value) localStorage.setItem("remainder.v1", value);
  }, slipPlans(slipped));
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("text=Plan slipping", { timeout: 25000 });
  const slippingCopy = await page.getByText(/target is slipping/i).isVisible();
  const recs = await page.getByRole("button", { name: /Increase contribution/i }).isVisible();
  const keepPace = await page.getByRole("button", { name: /Keep current pace/i }).isVisible();
  const adjust = await page.getByRole("button", { name: /Adjust target/i }).isVisible();
  const stillDisclaimer = await page.getByText(/25% change in estimated time to target/i).isVisible();
  log.push({ offTrack: true, slippingCopy, recs, keepPace, adjust, stillDisclaimer });
  await page.screenshot({ path: out.replace(".png", "-red.png"), fullPage: false });

  const mobile = await context.newPage();
  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await mobile.waitForSelector("text=Plan slipping", { timeout: 25000 });
  await mobile.screenshot({ path: out.replace(".png", "-mobile.png"), fullPage: false });
  await mobile.close();

  await page.getByRole("button", { name: /Increase contribution/i }).click();
  await page.waitForSelector("text=On track", { timeout: 20000 });
  const afterApply = await page.getByText("Plan slipping").count();
  log.push({ appliedContribute: true, slippingGone: afterApply === 0 });

  const ok = slippingCopy && recs && keepPace && adjust && stillDisclaimer && afterApply === 0;
  console.log(JSON.stringify({ ok, log }, null, 2));
  if (!ok) process.exit(1);
} catch (err) {
  await page.screenshot({ path: "screenshots/dca-notice-fail.png", fullPage: true }).catch(() => {});
  console.error(JSON.stringify({ ok: false, error: String(err), log }, null, 2));
  process.exit(1);
} finally {
  await browser.close();
}
