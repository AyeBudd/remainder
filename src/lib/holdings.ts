import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import type { DcaFrequency, DcaPlan, Holding, HoldingInput, HoldingSource } from "./types";

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
};

type PlanRow = {
  id: number;
  holding_id: number;
  target_date: string;
  frequency: string;
  assumed_price: string | number | null;
  baseline?: unknown;
};

function toHolding(row: HoldingRow): Holding {
  return {
    id: String(row.id),
    symbol: row.symbol,
    name: row.name,
    coingeckoId: row.coingecko_id,
    targetAmount: num(row.target_amount),
    currentAmount: num(row.current_amount),
    source: row.source === "wallet" ? "wallet" : "manual",
    walletAddress: row.wallet_address,
  };
}

function toPlan(row: PlanRow): DcaPlan {
  const base = parseBaseline(row.baseline);
  return {
    id: String(row.id),
    holdingId: String(row.holding_id),
    targetDate: String(row.target_date).slice(0, 10),
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
  source: z.enum(["manual", "wallet"]),
  walletAddress: z.string().nullable().optional(),
});

const holdingPatch = z.object({
  id: z.string().min(1),
  targetAmount: z.number().positive().optional(),
  currentAmount: z.number().min(0).optional(),
  source: z.enum(["manual", "wallet"]).optional(),
  walletAddress: z.string().nullable().optional(),
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
      select id, symbol, name, coingecko_id, target_amount, current_amount, source, wallet_address
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
    const rows = await sql<HoldingRow>`
      insert into holdings (user_id, symbol, name, coingecko_id, target_amount, current_amount, source, wallet_address)
      values (
        ${context.userId},
        ${data.symbol.toUpperCase()},
        ${data.name},
        ${data.coingeckoId},
        ${data.targetAmount},
        ${data.currentAmount},
        ${data.source},
        ${data.walletAddress ?? null}
      )
      returning id, symbol, name, coingecko_id, target_amount, current_amount, source, wallet_address
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
      select id, symbol, name, coingecko_id, target_amount, current_amount, source, wallet_address
      from holdings
      where id = ${id} and user_id = ${context.userId}
    `;
    const row = existing[0];
    if (!row) throw new Error("Holding not found");
    const targetAmount = data.targetAmount ?? num(row.target_amount);
    const currentAmount = data.currentAmount ?? num(row.current_amount);
    const source: HoldingSource = data.source ?? (row.source === "wallet" ? "wallet" : "manual");
    const walletAddress =
      data.walletAddress === undefined ? row.wallet_address : data.walletAddress;
    const updated = await sql<HoldingRow>`
      update holdings
      set target_amount = ${targetAmount},
          current_amount = ${currentAmount},
          source = ${source},
          wallet_address = ${walletAddress},
          updated_at = now()
      where id = ${id} and user_id = ${context.userId}
      returning id, symbol, name, coingecko_id, target_amount, current_amount, source, wallet_address
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
