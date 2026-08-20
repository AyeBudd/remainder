import { format } from "date-fns";
import { getAsset, type Asset } from "@/lib/assets";
import { parseAmount } from "@/lib/format";
import type { DcaFrequency, Holding } from "@/lib/types";

const FREQ = new Set<DcaFrequency>(["daily", "weekly", "biweekly", "monthly"]);

const ALIAS: Record<string, keyof ImportFields> = {
  symbol: "symbol",
  ticker: "symbol",
  name: "name",
  coingecko_id: "coingeckoId",
  coingeckoid: "coingeckoId",
  gecko_id: "coingeckoId",
  id: "coingeckoId",
  current_amount: "current",
  current: "current",
  target_amount: "target",
  target: "target",
  cost_basis_usd: "cost",
  cost_basis: "cost",
  cost: "cost",
  dca_frequency: "frequency",
  frequency: "frequency",
  dca_target_date: "dcaDate",
  target_date: "dcaDate",
};

type ImportFields = {
  symbol: string;
  name: string;
  coingeckoId: string;
  current: string;
  target: string;
  cost: string;
  frequency: string;
  dcaDate: string;
};

export type LedgerImportRow = {
  line: number;
  symbol: string;
  name: string;
  coingeckoId: string;
  currentAmount: number;
  targetAmount: number;
  costBasisUsd: number | null;
  frequency: DcaFrequency | null;
  dcaDate: string | null;
  action: "add" | "update";
  existingId?: string;
};

export type LedgerImport = {
  rows: LedgerImportRow[];
  errors: string[];
};

function parseCsv(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < src.length; i += 1) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        cell += '"';
        i += 1;
        continue;
      }
      if (c === '"') {
        quoted = false;
        continue;
      }
      cell += c;
      continue;
    }
    if (c === '"') {
      quoted = true;
      continue;
    }
    if (c === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i += 1;
      row.push(cell);
      cell = "";
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
      continue;
    }
    cell += c;
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.some((x) => x.trim())) rows.push(row);
  }
  return rows;
}

function keyOf(header: string): keyof ImportFields | null {
  const k = header.trim().toLowerCase().replace(/\s+/g, "_");
  return ALIAS[k] ?? null;
}

function money(raw: string): number | null {
  return parseAmount(raw.replace(/\$/g, ""));
}

function dateOnly(raw: string): string | null {
  const m = raw.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

export function parseLedgerImport(text: string, holdings: Holding[], assets: Asset[]): LedgerImport {
  const table = parseCsv(text);
  const errors: string[] = [];
  if (table.length < 2) {
    return { rows: [], errors: ["Need a header row and at least one asset."] };
  }
  const keys = table[0].map(keyOf);
  if (!keys.includes("symbol") && !keys.includes("coingeckoId")) {
    errors.push("Missing a symbol or coingecko_id column. Download the template if you are starting from scratch.");
  }
  if (!keys.includes("target")) {
    errors.push("Missing target_amount. That is the stack you are aiming for.");
  }
  if (errors.length) return { rows: [], errors };

  const seen = new Set<string>();
  const rows: LedgerImportRow[] = [];

  table.slice(1).forEach((cells, i) => {
    const line = i + 2;
    const get = (k: keyof ImportFields) => {
      const idx = keys.indexOf(k);
      return idx >= 0 ? (cells[idx] ?? "").trim() : "";
    };
    const symbolRaw = get("symbol").toUpperCase();
    const geckoRaw = get("coingeckoId").toLowerCase();
    const asset =
      (geckoRaw ? assets.find((a) => a.coingeckoId === geckoRaw) : undefined) ??
      (symbolRaw ? assets.find((a) => a.symbol === symbolRaw) ?? getAsset(symbolRaw) : undefined);
    const symbol = (symbolRaw || asset?.symbol || "").toUpperCase();
    const coingeckoId = geckoRaw || asset?.coingeckoId || "";
    if (!symbol || !coingeckoId) {
      errors.push(`Row ${line}: need a symbol and CoinGecko id (or a listed ticker).`);
      return;
    }
    const key = coingeckoId;
    if (seen.has(key)) {
      errors.push(`Row ${line}: ${symbol} appears twice.`);
      return;
    }
    seen.add(key);
    const targetAmount = money(get("target"));
    if (targetAmount == null || targetAmount <= 0) {
      errors.push(`Row ${line}: ${symbol} needs a target_amount greater than 0.`);
      return;
    }
    const currentRaw = get("current");
    const currentAmount = currentRaw === "" ? 0 : money(currentRaw);
    if (currentAmount == null) {
      errors.push(`Row ${line}: ${symbol} current_amount is not a number.`);
      return;
    }
    const costRaw = get("cost");
    const costBasisUsd = costRaw === "" ? null : money(costRaw);
    if (costRaw !== "" && costBasisUsd == null) {
      errors.push(`Row ${line}: ${symbol} cost_basis_usd is not a number.`);
      return;
    }
    const freqRaw = get("frequency").toLowerCase();
    const frequency = FREQ.has(freqRaw as DcaFrequency) ? (freqRaw as DcaFrequency) : null;
    if (freqRaw && !frequency) {
      errors.push(`Row ${line}: ${symbol} dca_frequency must be daily, weekly, biweekly, or monthly.`);
      return;
    }
    const dcaDate = dateOnly(get("dcaDate"));
    if (get("dcaDate") && !dcaDate) {
      errors.push(`Row ${line}: ${symbol} dca_target_date must be YYYY-MM-DD.`);
      return;
    }
    const existing = holdings.find(
      (h) => h.coingeckoId === coingeckoId || h.symbol.toUpperCase() === symbol,
    );
    rows.push({
      line,
      symbol,
      name: get("name") || asset?.name || existing?.name || symbol,
      coingeckoId,
      currentAmount,
      targetAmount,
      costBasisUsd,
      frequency,
      dcaDate,
      action: existing ? "update" : "add",
      existingId: existing?.id,
    });
  });

  return { rows, errors };
}

export const LEDGER_TEMPLATE_HEADERS = [
  "symbol",
  "coingecko_id",
  "name",
  "current_amount",
  "target_amount",
  "cost_basis_usd",
  "dca_frequency",
  "dca_target_date",
] as const;

export function ledgerTemplateCsv(): string {
  return [
    LEDGER_TEMPLATE_HEADERS.join(","),
    "BTC,bitcoin,Bitcoin,0.1,1,8500,weekly,2027-04-20",
    "ETH,ethereum,Ethereum,2,16,4800,,",
  ].join("\n");
}

export function downloadLedgerTemplate(): void {
  const blob = new Blob([`\uFEFF${ledgerTemplateCsv()}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `remaindr-template-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.rel = "noopener";
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
