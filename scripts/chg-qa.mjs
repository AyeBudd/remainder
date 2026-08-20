import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:8080/";
const out = process.argv[3] || "screenshots/chg-24.png";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const log = [];

try {
  await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForSelector("text=Remainder", { timeout: 20000 });
  await page.waitForTimeout(2000);

  const labels = page.locator("p", { hasText: /24h/ });
  await labels.first().waitFor({ timeout: 15000 });
  const texts = (await labels.allTextContents()).map((t) => t.replace(/\s+/g, " ").trim());
  log.push({ ledger24: texts.slice(0, 6) });

  const first = labels.first();
  const color = await first.evaluate((el) => getComputedStyle(el).color);
  log.push({ ledgerColor: color });

  await page.screenshot({ path: out, fullPage: false });

  await page.getByRole("button", { name: "Open pages" }).click();
  await page.getByRole("button", { name: /BTC tracker/ }).click();
  await page.waitForSelector("text=All-time high", { timeout: 15000 });
  await page.waitForTimeout(800);
  const tracker24 = (await page.locator("p", { hasText: /24h/ }).allTextContents()).map((t) =>
    t.replace(/\s+/g, " ").trim(),
  );
  log.push({ tracker24 });
  await page.screenshot({ path: out.replace(".png", "-tracker.png"), fullPage: false });

  const ok = texts.some((t) => /[+\-]\d/.test(t)) && tracker24.some((t) => /[+\-]\d/.test(t) || /24h/.test(t));
  console.log(JSON.stringify({ ok, log }, null, 2));
  if (!ok) process.exit(1);
} catch (err) {
  await page.screenshot({ path: "screenshots/chg-24-fail.png", fullPage: true }).catch(() => {});
  console.error(JSON.stringify({ ok: false, error: String(err), log }, null, 2));
  process.exit(1);
} finally {
  await browser.close();
}
