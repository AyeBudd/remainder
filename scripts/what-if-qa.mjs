import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:8080/";
const out = process.argv[3] || "screenshots/what-if.png";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const log = [];

try {
  await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForSelector("text=Remainder", { timeout: 20000 });

  const menu = page.getByRole("button", { name: "Open pages" });
  const menuVisible = await menu.isVisible();
  log.push({ menuVisible });
  if (!menuVisible) throw new Error("menu button missing");

  await menu.click();
  await page.waitForSelector("#app-pages", { timeout: 5000 });
  const items = await page.locator("#app-pages button").allTextContents();
  log.push({ navItems: items.map((t) => t.replace(/\s+/g, " ").trim()) });

  await page.getByRole("button", { name: /What if\?/ }).click();
  await page.waitForSelector("text=What if these prices hit", { timeout: 8000 });
  await page.waitForTimeout(800);

  const cards = await page.locator("article").count();
  const hasBtc = await page.getByRole("heading", { name: "BTC", exact: true }).count();
  const hasEth = await page.getByRole("heading", { name: "ETH", exact: true }).count();
  const hasSol = await page.getByRole("heading", { name: "SOL", exact: true }).count();
  log.push({ cards, hasBtc, hasEth, hasSol });

  const btcInput = page.getByLabel("BTC what-if price");
  await btcInput.waitFor({ timeout: 8000 });
  await btcInput.fill("200000");
  await page.waitForTimeout(200);

  const hero = await page.locator("h1").first().innerText();
  const btcHeld = await page.locator("article").filter({ hasText: "BTC" }).locator("p.font-serif").first().innerText();
  log.push({ heroAfterBtc: hero, btcHeld });

  await page.screenshot({ path: out, fullPage: true });

  await page.getByRole("button", { name: "Use live prices" }).click();
  await page.waitForTimeout(200);

  await page.getByRole("button", { name: "Open pages" }).click();
  await page.getByRole("button", { name: /Ledger/ }).click();
  await page.waitForSelector("text=Remaining to hit targets", { timeout: 8000 });
  const backOnLedger = await page.getByText("Remaining to hit targets").isVisible();
  log.push({ backOnLedger });

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto(url, { waitUntil: "networkidle", timeout: 45000 });
  await mobile.getByRole("button", { name: "Open pages" }).click();
  await mobile.getByRole("button", { name: /What if\?/ }).click();
  await mobile.waitForSelector("text=What if these prices hit");
  await mobile.screenshot({ path: out.replace(".png", "-mobile.png"), fullPage: true });

  console.log(JSON.stringify({ ok: true, log }, null, 2));
} catch (err) {
  await page.screenshot({ path: "screenshots/what-if-fail.png", fullPage: true }).catch(() => {});
  console.error(JSON.stringify({ ok: false, error: String(err), log }, null, 2));
  process.exit(1);
} finally {
  await browser.close();
}
