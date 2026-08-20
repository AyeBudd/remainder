import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:8080/";
const out = process.argv[3] || "screenshots/btc-tracker.png";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const log = [];

try {
  await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForSelector("text=Remainder", { timeout: 20000 });
  await page.getByRole("button", { name: "Open pages" }).click();
  await page.waitForSelector("#app-pages");
  const nav = await page.locator("#app-pages button").allTextContents();
  log.push({ nav: nav.map((t) => t.replace(/\s+/g, " ").trim()) });
  await page.getByRole("button", { name: /BTC tracker/ }).click();
  await page.waitForSelector("text=All-time high", { timeout: 15000 });
  await page.waitForTimeout(1500);

  const kicker = await page.getByText("Bitcoin", { exact: true }).first().isVisible();
  const ath = await page.getByText("All-time high").isVisible();
  const low = await page.getByText("Cycle low").isVisible();
  const since = await page.getByText(/since Apr/i).count();
  const to = await page.getByText(/^to ~/i).count();
  const hero = await page.locator("h1").first().innerText();
  const athVal = await page.getByText("All-time high").locator("xpath=..").innerText();
  log.push({ kicker, ath, low, since, to, hero, athVal: athVal.replace(/\s+/g, " ") });

  await page.screenshot({ path: out, fullPage: true });
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto(url.includes("#") ? url : url.replace(/\/?$/, "/#/btc"), { waitUntil: "networkidle", timeout: 45000 });
  if (!(await mobile.getByText("All-time high").isVisible().catch(() => false))) {
    await mobile.getByRole("button", { name: "Open pages" }).click();
    await mobile.getByRole("button", { name: /BTC tracker/ }).click();
    await mobile.waitForSelector("text=All-time high", { timeout: 15000 });
  }
  await mobile.screenshot({ path: out.replace(".png", "-mobile.png"), fullPage: true });

  const ok = kicker && ath && low && since > 0 && /\$/.test(hero);
  console.log(JSON.stringify({ ok, log }, null, 2));
  if (!ok) process.exit(1);
} catch (err) {
  await page.screenshot({ path: "screenshots/btc-tracker-fail.png", fullPage: true }).catch(() => {});
  console.error(JSON.stringify({ ok: false, error: String(err), log }, null, 2));
  process.exit(1);
} finally {
  await browser.close();
}
