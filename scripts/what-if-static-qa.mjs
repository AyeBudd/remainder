import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:4173/";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const log = [];

try {
  await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForSelector("text=Remainder", { timeout: 20000 });
  await page.getByRole("button", { name: "Open pages" }).click();
  await page.waitForSelector("#app-pages");
  const nav = await page.locator("#app-pages .nav-item").allTextContents();
  log.push({ nav: nav.map((t) => t.replace(/\s+/g, " ").trim()) });
  await page.locator('#app-pages [data-page="what-if"]').click();
  await page.waitForSelector("text=What if these prices hit");
  await page.waitForTimeout(600);
  const cards = await page.locator("article.card").count();
  await page.getByLabel("BTC what-if price").fill("200000");
  await page.waitForTimeout(200);
  const hero = await page.locator("h1").first().innerText();
  const held = await page.locator('[data-wif-card="bitcoin"] [data-wif-row="held"]').innerText();
  const target = await page.locator('[data-wif-card="bitcoin"] [data-wif-row="target"]').innerText();
  log.push({ cards, hero, held, target });
  await page.screenshot({ path: "screenshots/what-if-static.png", fullPage: true });
  const ok = cards >= 3 && held.includes("74,000") && target.includes("200,000");
  console.log(JSON.stringify({ ok, log }, null, 2));
  if (!ok) process.exit(1);
} catch (err) {
  await page.screenshot({ path: "screenshots/what-if-static-fail.png", fullPage: true }).catch(() => {});
  console.error(JSON.stringify({ ok: false, error: String(err), log }, null, 2));
  process.exit(1);
} finally {
  await browser.close();
}
