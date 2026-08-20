import { differenceInCalendarDays, format, parseISO, startOfDay } from "date-fns";
import { remainingCoins, fillRatio } from "@/lib/assets";
import { quoteDca } from "@/lib/dca";
import { unrealizedPnl } from "@/lib/pnl";
import type { DcaPlan, Holding, PriceMap } from "@/lib/types";

function cell(value: string | number | null | undefined): string {
  if (value == null) return "";
  const s = typeof value === "number" && Number.isFinite(value) ? String(value) : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function etaDays(plan: DcaPlan | undefined, now: Date): number | null {
  if (!plan?.targetDate) return null;
  const target = parseISO(plan.targetDate);
  if (Number.isNaN(target.getTime())) return null;
  return differenceInCalendarDays(startOfDay(target), startOfDay(now));
}

export const LEDGER_CSV_HEADERS = [
  "symbol",
  "name",
  "coingecko_id",
  "source",
  "current_amount",
  "target_amount",
  "fill_pct",
  "price_usd",
  "held_usd",
  "remaining_coins",
  "remaining_usd",
  "cost_basis_usd",
  "pnl_usd",
  "pnl_pct",
  "dca_frequency",
  "dca_target_date",
  "dca_eta_days",
  "dca_usd_per_buy",
  "dca_buys_remaining",
] as const;

export function ledgerCsv(holdings: Holding[], plans: DcaPlan[], prices: PriceMap, now = new Date()): string {
  const lines = [LEDGER_CSV_HEADERS.join(",")];
  for (const holding of holdings) {
    const price = prices[holding.coingeckoId];
    const remain = remainingCoins(holding.currentAmount, holding.targetAmount);
    const fill = fillRatio(holding.currentAmount, holding.targetAmount);
    const plan = plans.find((p) => p.holdingId === holding.id);
    const quote = plan ? quoteDca(holding, plan, prices, now) : null;
    const pnl = unrealizedPnl(holding.currentAmount, holding.costBasisUsd, price);
    const eta = etaDays(plan, now);
    lines.push(
      [
        holding.symbol,
        holding.name,
        holding.coingeckoId,
        holding.source,
        holding.currentAmount,
        holding.targetAmount,
        Number.isFinite(fill) ? Math.round(fill * 1000) / 10 : "",
        price ?? "",
        price != null ? holding.currentAmount * price : "",
        remain,
        price != null ? remain * price : "",
        holding.costBasisUsd ?? "",
        pnl?.usd ?? "",
        pnl?.ratio != null ? Math.round(pnl.ratio * 1000) / 10 : "",
        plan?.frequency ?? "",
        plan?.targetDate ?? "",
        eta ?? "",
        quote?.usdPerBuy ?? "",
        quote && !quote.alreadyMet && !quote.pastDue ? quote.periods : "",
      ]
        .map(cell)
        .join(","),
    );
  }
  return lines.join("\n");
}

export function downloadLedgerCsv(holdings: Holding[], plans: DcaPlan[], prices: PriceMap): void {
  const csv = `\uFEFF${ledgerCsv(holdings, plans, prices)}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `remaindr-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.rel = "noopener";
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
