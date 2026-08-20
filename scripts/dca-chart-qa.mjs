import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:8080/";
const out = process.argv[3] || "screenshots/dca-chart.png";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } });
const log = [];

try {
  await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForSelector("text=DCA path", { timeout: 20000 });
  await page.locator("#dca").scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);

  const marks = (await page.locator("#dca").getByText(/^(25|50|75)%$/).allTextContents()).map((t) =>
    t.trim(),
  );
  log.push({ marks });

  const plot = page.locator(".dca-plot, .recharts-wrapper").first();
  await plot.waitFor({ timeout: 10000 });
  const box = await plot.boundingBox();
  if (!box) throw new Error("no plot box");
  await page.mouse.move(box.x + box.width * 0.62, box.y + box.height * 0.4);
  await page.waitForTimeout(400);

  const tip = page.locator(".dca-tip:not([hidden]), .recharts-tooltip-wrapper").first();
  const tipText = ((await tip.textContent().catch(() => "")) || "").replace(/\s+/g, " ").trim();
  log.push({ tipText });

  await page.screenshot({ path: out, fullPage: false });
  await page.locator("#dca").screenshot({ path: out.replace(".png", "-panel.png") });

  const hasMarks = marks.includes("50%") && marks.includes("75%");
  const hasTip = /20\d{2}/.test(tipText) && /(\d|BTC|ETH|SOL)/.test(tipText);
  const ok = hasMarks && hasTip;
  console.log(JSON.stringify({ ok, hasMarks, hasTip, log }, null, 2));
  if (!ok) process.exit(1);
} catch (err) {
  await page.screenshot({ path: "screenshots/dca-chart-fail.png", fullPage: true }).catch(() => {});
  console.error(JSON.stringify({ ok: false, error: String(err), log }, null, 2));
  process.exit(1);
} finally {
  await browser.close();
}
