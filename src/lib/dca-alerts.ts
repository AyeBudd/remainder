import { assessDcaPace } from "@/lib/dca";
import { loadMarket } from "@/lib/catalog";
import { getSql } from "@/lib/db";
import { sendMail, wrapEmail, mailerReady } from "@/lib/mail";
import type { DcaFrequency, DcaPlan, Holding } from "@/lib/types";

function num(v: string | number | null | undefined): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function dateOnly(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const s = String(value ?? "");
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : s.slice(0, 10);
}

function parseBaseline(raw: unknown): Partial<DcaPlan> {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const days = num(o.baselineDays as string | number);
  const usd = num(o.baselineUsdPerBuy as string | number);
  return {
    baselineAt: typeof o.baselineAt === "string" ? o.baselineAt : null,
    baselineDays: days > 0 ? days : null,
    baselineUsdPerBuy: usd > 0 ? usd : null,
    baselinePrice: o.baselinePrice == null ? null : num(o.baselinePrice as string | number),
    baselineRemaining: o.baselineRemaining == null ? null : num(o.baselineRemaining as string | number),
  };
}

export function cronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  const header = request.headers.get("authorization") ?? "";
  if (secret && header === `Bearer ${secret}`) return true;
  if (request.headers.get("x-vercel-cron") === "1") return true;
  if (!secret && !process.env.VERCEL) return true;
  return false;
}

export async function runDcaAlerts(): Promise<{ checked: number; mailed: number; skipped: string | null }> {
  if (!mailerReady()) return { checked: 0, mailed: 0, skipped: "no-mailer" };
  const sql = await getSql();
  const users = await sql<{ user_id: string; email: string; name: string }>`
    select s.user_id, u.email, u.name
    from user_settings s
    join "user" u on u.id = s.user_id
    where s.dca_alerts = true
      and u.email is not null
      and (
        s.last_dca_alert_at is null
        or s.last_dca_alert_at < now() - interval '6 days'
      )
  `;
  if (users.length === 0) return { checked: 0, mailed: 0, skipped: null };

  const market = await loadMarket();
  let mailed = 0;

  for (const user of users) {
    const holdingRows = await sql<{
      id: number;
      symbol: string;
      name: string;
      coingecko_id: string;
      target_amount: string | number;
      current_amount: string | number;
      source: string;
      wallet_address: string | null;
    }>`
      select id, symbol, name, coingecko_id, target_amount, current_amount, source, wallet_address
      from holdings where user_id = ${user.user_id}
    `;
    const planRows = await sql<{
      id: number;
      holding_id: number;
      target_date: string;
      frequency: string;
      assumed_price: string | number | null;
      baseline: unknown;
    }>`
      select id, holding_id, target_date, frequency, assumed_price, baseline
      from dca_plans where user_id = ${user.user_id}
    `;
    const holdings: Holding[] = holdingRows.map((row) => ({
      id: String(row.id),
      symbol: row.symbol,
      name: row.name,
      coingeckoId: row.coingecko_id,
      targetAmount: num(row.target_amount),
      currentAmount: num(row.current_amount),
      source: row.source === "wallet" ? "wallet" : row.source === "mixed" ? "mixed" : "manual",
      walletAddress: row.wallet_address,
      walletAmount: 0,
      manualAmount: num(row.current_amount),
      costBasisUsd: null,
    }));
    const plans: DcaPlan[] = planRows.map((row) => ({
      id: String(row.id),
      holdingId: String(row.holding_id),
      targetDate: dateOnly(row.target_date),
      frequency: row.frequency as DcaFrequency,
      assumedPrice: row.assumed_price == null ? null : num(row.assumed_price),
      ...parseBaseline(row.baseline),
    }));

    const off = plans
      .map((plan) => {
        const holding = holdings.find((h) => h.id === plan.holdingId);
        if (!holding) return null;
        const pace = assessDcaPace(holding, plan, market.prices);
        if (pace.status !== "off-track") return null;
        const pct = pace.change != null ? Math.round(Math.abs(pace.change) * 100) : null;
        return { symbol: holding.symbol, pct };
      })
      .filter((row): row is { symbol: string; pct: number | null } => row != null);

    if (off.length === 0) continue;

    const lines = off
      .map((row) =>
        row.pct != null
          ? `<li><strong>${row.symbol}</strong> — ETA moved about ${row.pct}% from when you set the plan.</li>`
          : `<li><strong>${row.symbol}</strong> — off the original pace.</li>`,
      )
      .join("");
    const result = await sendMail({
      to: user.email,
      subject: "Remaindr — a DCA plan is off target",
      html: wrapEmail(
        "Re-check a DCA plan",
        `<p>Hey ${user.name || "there"} — at least one saved plan moved more than 25% from the original ETA.</p>
         <ul>${lines}</ul>
         <p>Recommend re-evaluating DCA due to price change. Open Remaindr to update the plan.</p>`,
      ),
      text: `A Remaindr DCA plan is off target (25% ETA change). Symbols: ${off.map((r) => r.symbol).join(", ")}.`,
    });
    if (result.sent) {
      mailed += 1;
      await sql`
        update user_settings set last_dca_alert_at = now() where user_id = ${user.user_id}
      `;
    }
  }

  return { checked: users.length, mailed, skipped: null };
}
