import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import type { DcaFrequency, DcaPlan, Holding, HoldingInput, HoldingSource } from "./types";
import { rollCostBasis } from "@/lib/pnl";

function num(v: string | number | null | undefined): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

type HoldingRow = {
  id: number;
  symbol: string;
  name: string;
  coingecko_id: string;
  target_amount: string | number;
  current_amount: string | number;
  source: string;
  wallet_address: string | null;
  wallet_amount?: string | number | null;
  manual_amount?: string | number | null;
  cost_basis_usd?: string | number | null;
};

type PlanRow = {
  id: number;
  holding_id: number;
  target_date: string;
  frequency: string;
  assumed_price: string | number | null;
  baseline?: unknown;
};

function sourceOf(walletAmount: number, manualAmount: number): HoldingSource {
  if (walletAmount > 0 && manualAmount > 0) return "mixed";
  if (walletAmount > 0) return "wallet";
  return "manual";
}

function toHolding(row: HoldingRow): Holding {
  const currentAmount = num(row.current_amount);
  const walletAmount = num(row.wallet_amount);
  const manualAmount =
    row.manual_amount == null
      ? row.source === "wallet"
        ? 0
        : currentAmount
      : num(row.manual_amount);
  return {
    id: String(row.id),
    symbol: row.symbol,
    name: row.name,
    coingeckoId: row.coingecko_id,
    targetAmount: num(row.target_amount),
    currentAmount,
    source: sourceOf(walletAmount, manualAmount),
    walletAddress: row.wallet_address,
    walletAmount,
    manualAmount,
    costBasisUsd: row.cost_basis_usd == null ? null : num(row.cost_basis_usd),
  };
}

function dateOnly(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const s = String(value ?? "");
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return "";
}

function toPlan(row: PlanRow): DcaPlan {
  const base = parseBaseline(row.baseline);
  return {
    id: String(row.id),
    holdingId: String(row.holding_id),
    targetDate: dateOnly(row.target_date),
    frequency: row.frequency as DcaFrequency,
    assumedPrice: row.assumed_price == null ? null : num(row.assumed_price),
    ...base,
  };
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

function baselineJson(data: {
  baselineAt?: string | null;
  baselineDays?: number | null;
  baselineUsdPerBuy?: number | null;
  baselinePrice?: number | null;
  baselineRemaining?: number | null;
}): string | null {
  if (!(data.baselineDays && data.baselineDays > 0 && data.baselineUsdPerBuy && data.baselineUsdPerBuy > 0)) {
    return null;
  }
  return JSON.stringify({
    baselineAt: data.baselineAt ?? null,
    baselineDays: data.baselineDays,
    baselineUsdPerBuy: data.baselineUsdPerBuy,
    baselinePrice: data.baselinePrice ?? null,
    baselineRemaining: data.baselineRemaining ?? null,
  });
}

const holdingInput = z.object({
  symbol: z.string().min(1).max(16),
  name: z.string().min(1).max(80),
  coingeckoId: z.string().min(1).max(80),
  targetAmount: z.number().positive(),
  currentAmount: z.number().min(0),
  source: z.enum(["manual", "wallet", "mixed"]),
  walletAddress: z.string().nullable().optional(),
  walletAmount: z.number().min(0).optional(),
  manualAmount: z.number().min(0).optional(),
  costBasisUsd: z.number().min(0).nullable().optional(),
  markPrice: z.number().positive().optional(),
});

const holdingPatch = z.object({
  id: z.string().min(1),
  targetAmount: z.number().positive().optional(),
  currentAmount: z.number().min(0).optional(),
  source: z.enum(["manual", "wallet", "mixed"]).optional(),
  walletAddress: z.string().nullable().optional(),
  walletAmount: z.number().min(0).optional(),
  manualAmount: z.number().min(0).optional(),
  costBasisUsd: z.number().min(0).nullable().optional(),
  markPrice: z.number().positive().optional(),
});

const planInput = z.object({
  holdingId: z.string().min(1),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  frequency: z.enum(["daily", "weekly", "biweekly", "monthly"]),
  assumedPrice: z.number().positive().nullable(),
  baselineAt: z.string().nullable().optional(),
  baselineDays: z.number().positive().nullable().optional(),
  baselineUsdPerBuy: z.number().positive().nullable().optional(),
  baselinePrice: z.number().positive().nullable().optional(),
  baselineRemaining: z.number().min(0).nullable().optional(),
});

export const listHoldings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<HoldingRow>`
      select id, symbol, name, coingecko_id, target_amount, current_amount, source, wallet_address, wallet_amount, manual_amount, cost_basis_usd
      from holdings
      where user_id = ${context.userId}
      order by id asc
    `;
    return rows.map(toHolding);
  });

export const listDcaPlans = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<PlanRow>`
      select id, holding_id, target_date, frequency, assumed_price, baseline
      from dca_plans
      where user_id = ${context.userId}
    `;
    return rows.map(toPlan);
  });

export const createHolding = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => holdingInput.parse(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const walletAmount = data.walletAmount ?? (data.source === "wallet" || data.source === "mixed" ? data.currentAmount : 0);
    const manualAmount = data.manualAmount ?? Math.max(0, data.currentAmount - walletAmount);
    const source = sourceOf(walletAmount, manualAmount);
    const costBasisUsd =
      data.costBasisUsd ??
      (data.markPrice && data.markPrice > 0 ? data.currentAmount * data.markPrice : null);
    const rows = await sql<HoldingRow>`
      insert into holdings (user_id, symbol, name, coingecko_id, target_amount, current_amount, source, wallet_address, wallet_amount, manual_amount, cost_basis_usd)
      values (
        ${context.userId},
        ${data.symbol.toUpperCase()},
        ${data.name},
        ${data.coingeckoId},
        ${data.targetAmount},
        ${data.currentAmount},
        ${source},
        ${data.walletAddress ?? null},
        ${walletAmount},
        ${manualAmount},
        ${costBasisUsd}
      )
      returning id, symbol, name, coingecko_id, target_amount, current_amount, source, wallet_address, wallet_amount, manual_amount, cost_basis_usd
    `;
    const created = rows[0];
    if (!created) throw new Error("Failed to create holding");
    return toHolding(created);
  });

export const updateHolding = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => holdingPatch.parse(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const id = Number(data.id);
    const existing = await sql<HoldingRow>`
      select id, symbol, name, coingecko_id, target_amount, current_amount, source, wallet_address, wallet_amount, manual_amount, cost_basis_usd
      from holdings
      where id = ${id} and user_id = ${context.userId}
    `;
    const row = existing[0];
    if (!row) throw new Error("Holding not found");
    const prev = toHolding(row);
    const targetAmount = data.targetAmount ?? prev.targetAmount;
    const walletAmount = data.walletAmount ?? prev.walletAmount;
    let currentAmount = data.currentAmount ?? prev.currentAmount;
    let manualAmount = data.manualAmount ?? prev.manualAmount;
    if (data.walletAmount != null && data.manualAmount == null && data.currentAmount == null) {
      currentAmount = walletAmount + manualAmount;
    } else if (data.currentAmount != null && data.manualAmount == null) {
      manualAmount = Math.max(0, currentAmount - walletAmount);
    } else {
      currentAmount = walletAmount + manualAmount;
    }
    const source = sourceOf(walletAmount, manualAmount);
    const walletAddress =
      data.walletAddress === undefined ? row.wallet_address : data.walletAddress;
    let costBasisUsd = data.costBasisUsd !== undefined ? data.costBasisUsd : prev.costBasisUsd;
    if (data.markPrice && data.markPrice > 0) {
      costBasisUsd = rollCostBasis(prev.currentAmount, costBasisUsd, currentAmount, data.markPrice);
    }
    const updated = await sql<HoldingRow>`
      update holdings
      set target_amount = ${targetAmount},
          current_amount = ${currentAmount},
          source = ${source},
          wallet_address = ${walletAddress},
          wallet_amount = ${walletAmount},
          manual_amount = ${manualAmount},
          cost_basis_usd = ${costBasisUsd},
          updated_at = now()
      where id = ${id} and user_id = ${context.userId}
      returning id, symbol, name, coingecko_id, target_amount, current_amount, source, wallet_address, wallet_amount, manual_amount, cost_basis_usd
    `;
    const next = updated[0];
    if (!next) throw new Error("Failed to update holding");
    return toHolding(next);
  });

export const deleteHolding = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: unknown) => z.string().min(1).parse(id))
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    await sql`delete from holdings where id = ${Number(id)} and user_id = ${context.userId}`;
  });

export const upsertDcaPlan = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => planInput.parse(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const holdingId = Number(data.holdingId);
    const owned = await sql<{ id: number }>`
      select id from holdings where id = ${holdingId} and user_id = ${context.userId}
    `;
    if (!owned[0]) throw new Error("Holding not found");
    const baseline = baselineJson(data);
    const rows = await sql<PlanRow>`
      insert into dca_plans (user_id, holding_id, target_date, frequency, assumed_price, baseline)
      values (${context.userId}, ${holdingId}, ${data.targetDate}, ${data.frequency}, ${data.assumedPrice}, ${baseline}::jsonb)
      on conflict (holding_id) do update set
        target_date = excluded.target_date,
        frequency = excluded.frequency,
        assumed_price = excluded.assumed_price,
        baseline = excluded.baseline,
        updated_at = now()
      returning id, holding_id, target_date, frequency, assumed_price, baseline
    `;
    const row = rows[0];
    if (!row) throw new Error("Failed to save plan");
    return toPlan(row);
  });

export const deleteDcaPlan = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: unknown) => z.string().min(1).parse(id))
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    await sql`delete from dca_plans where id = ${Number(id)} and user_id = ${context.userId}`;
  });

export type { HoldingInput };
