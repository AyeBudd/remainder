import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:8080/";
const out = process.argv[3] || "screenshots/dca-notice.png";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const log = [];

try {
  await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForSelector("text=Remainder", { timeout: 20000 });
  await page.waitForSelector("text=Current DCA plan on schedule", { timeout: 20000 });
  const disclaimer = await page.getByText(/25% change in estimated time to target/i).isVisible();
  log.push({ onSchedule: true, disclaimer });
  await page.screenshot({ path: out, fullPage: false });

  await page.evaluate(() => {
    const raw = localStorage.getItem("remainder.v1");
    if (!raw) return;
    const parsed = JSON.parse(raw);
    parsed.plans = (parsed.plans || []).map((p) => ({
      ...p,
      baselineDays: 180,
      baselineUsdPerBuy: 1,
    }));
    localStorage.setItem("remainder.v1", JSON.stringify(parsed));
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector("text=Recommend re-evaluating DCA due to price change", { timeout: 20000 });
  const stillDisclaimer = await page.getByText(/25% change in estimated time to target/i).isVisible();
  log.push({ offTrack: true, stillDisclaimer });
  await page.screenshot({ path: out.replace(".png", "-red.png"), fullPage: false });

  const ok = disclaimer && stillDisclaimer;
  console.log(JSON.stringify({ ok, log }, null, 2));
  if (!ok) process.exit(1);
} catch (err) {
  await page.screenshot({ path: "screenshots/dca-notice-fail.png", fullPage: true }).catch(() => {});
  console.error(JSON.stringify({ ok: false, error: String(err), log }, null, 2));
  process.exit(1);
} finally {
  await browser.close();
}
