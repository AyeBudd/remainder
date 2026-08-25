import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { loadMarket } from "@/lib/catalog";
import {
  buildSnapshot,
  detectNewMilestones,
  planVersionFrom,
  versionChanged,
  type HoldingMilestone,
  type HoldingSnapshot,
  type PlanVersion,
  type ProgressBundle,
} from "@/lib/progress";
import type { DcaFrequency, DcaPlan, Holding } from "@/lib/types";

function num(v: string | number | null | undefined): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function numOrNull(v: string | number | null | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function dateOnly(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const s = String(value ?? "");
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : s.slice(0, 10);
}

type SnapRow = {
  id: number;
  holding_id: number;
  taken_at: string;
  symbol: string;
  asset_quantity: string | number;
  target_quantity: string | number;
  remaining_quantity: string | number;
  completion_pct: string | number;
  asset_price: string | number | null;
  holdings_usd: string | number | null;
  target_usd: string | number | null;
  usd_per_buy: string | number | null;
  projected_date: string | null;
  target_date: string | null;
  plan_status: string;
};

type MileRow = {
  id: number;
  holding_id: number;
  pct: number;
  achieved_at: string;
};

type VerRow = {
  id: number;
  holding_id: number;
  created_at: string;
  target_quantity: string | number;
  target_date: string | null;
  frequency: string | null;
  usd_per_buy: string | number | null;
  assumed_price: string | number | null;
};

function toSnap(row: SnapRow): HoldingSnapshot {
  return {
    id: String(row.id),
    holdingId: String(row.holding_id),
    takenAt: dateOnly(row.taken_at),
    symbol: row.symbol,
    assetQuantity: num(row.asset_quantity),
    targetQuantity: num(row.target_quantity),
    remainingQuantity: num(row.remaining_quantity),
    completionPct: num(row.completion_pct),
    assetPrice: numOrNull(row.asset_price),
    holdingsUsd: numOrNull(row.holdings_usd),
    targetUsd: numOrNull(row.target_usd),
    usdPerBuy: numOrNull(row.usd_per_buy),
    projectedDate: row.projected_date ? dateOnly(row.projected_date) : null,
    targetDate: row.target_date ? dateOnly(row.target_date) : null,
    planStatus: (row.plan_status as HoldingSnapshot["planStatus"]) || "none",
  };
}

function toMile(row: MileRow): HoldingMilestone {
  const pct = Number(row.pct) as 25 | 50 | 75 | 100;
  return {
    id: String(row.id),
    holdingId: String(row.holding_id),
    pct,
    achievedAt: dateOnly(row.achieved_at),
  };
}

function toVer(row: VerRow): PlanVersion {
  return {
    id: String(row.id),
    holdingId: String(row.holding_id),
    createdAt: typeof row.created_at === "string" ? row.created_at : new Date(row.created_at).toISOString(),
    targetQuantity: num(row.target_quantity),
    targetDate: row.target_date ? dateOnly(row.target_date) : null,
    frequency: (row.frequency as DcaFrequency | null) ?? null,
    usdPerBuy: numOrNull(row.usd_per_buy),
    assumedPrice: numOrNull(row.assumed_price),
  };
}

export const listProgress = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ holdingId: z.string().min(1) }).parse(input))
  .handler(async ({ context, data }): Promise<ProgressBundle> => {
    const sql = await getSql();
    const hid = Number(data.holdingId);
    const [snaps, miles, vers] = await Promise.all([
      sql<SnapRow>`
        select id, holding_id, taken_at, symbol, asset_quantity, target_quantity, remaining_quantity,
               completion_pct, asset_price, holdings_usd, target_usd, usd_per_buy, projected_date,
               target_date, plan_status
        from holding_snapshots
        where user_id = ${context.userId} and holding_id = ${hid}
        order by taken_at asc
      `,
      sql<MileRow>`
        select id, holding_id, pct, achieved_at
        from holding_milestones
        where user_id = ${context.userId} and holding_id = ${hid}
        order by pct asc
      `,
      sql<VerRow>`
        select id, holding_id, created_at, target_quantity, target_date, frequency, usd_per_buy, assumed_price
        from holding_plan_versions
        where user_id = ${context.userId} and holding_id = ${hid}
        order by created_at asc
      `,
    ]);
    return {
      snapshots: snaps.map(toSnap),
      milestones: miles.map(toMile),
      versions: vers.map(toVer),
    };
  });

export const listAllProgress = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<ProgressBundle> => {
    const sql = await getSql();
    const [snaps, miles, vers] = await Promise.all([
      sql<SnapRow>`
        select id, holding_id, taken_at, symbol, asset_quantity, target_quantity, remaining_quantity,
               completion_pct, asset_price, holdings_usd, target_usd, usd_per_buy, projected_date,
               target_date, plan_status
        from holding_snapshots
        where user_id = ${context.userId}
        order by taken_at asc
      `,
      sql<MileRow>`
        select id, holding_id, pct, achieved_at
        from holding_milestones
        where user_id = ${context.userId}
        order by pct asc
      `,
      sql<VerRow>`
        select id, holding_id, created_at, target_quantity, target_date, frequency, usd_per_buy, assumed_price
        from holding_plan_versions
        where user_id = ${context.userId}
        order by created_at asc
      `,
    ]);
    return {
      snapshots: snaps.map(toSnap),
      milestones: miles.map(toMile),
      versions: vers.map(toVer),
    };
  });

const snapInput = z.object({
  holdingId: z.string().min(1),
  takenAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  symbol: z.string().min(1).max(16),
  assetQuantity: z.number(),
  targetQuantity: z.number(),
  remainingQuantity: z.number(),
  completionPct: z.number(),
  assetPrice: z.number().positive().nullable(),
  holdingsUsd: z.number().nullable(),
  targetUsd: z.number().nullable(),
  usdPerBuy: z.number().nullable(),
  projectedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  planStatus: z.string().min(1).max(24),
});

export const saveSnapshot = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => snapInput.parse(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const hid = Number(data.holdingId);
    const owned = await sql<{ id: number }>`
      select id from holdings where id = ${hid} and user_id = ${context.userId}
    `;
    if (!owned[0]) throw new Error("Holding not found");
    const rows = await sql<SnapRow>`
      insert into holding_snapshots (
        user_id, holding_id, taken_at, symbol, asset_quantity, target_quantity, remaining_quantity,
        completion_pct, asset_price, holdings_usd, target_usd, usd_per_buy, projected_date, target_date, plan_status
      ) values (
        ${context.userId}, ${hid}, ${data.takenAt}, ${data.symbol}, ${data.assetQuantity}, ${data.targetQuantity},
        ${data.remainingQuantity}, ${data.completionPct}, ${data.assetPrice}, ${data.holdingsUsd}, ${data.targetUsd},
        ${data.usdPerBuy}, ${data.projectedDate}, ${data.targetDate}, ${data.planStatus}
      )
      on conflict (holding_id, taken_at) do update set
        symbol = excluded.symbol,
        asset_quantity = excluded.asset_quantity,
        target_quantity = excluded.target_quantity,
        remaining_quantity = excluded.remaining_quantity,
        completion_pct = excluded.completion_pct,
        asset_price = excluded.asset_price,
        holdings_usd = excluded.holdings_usd,
        target_usd = excluded.target_usd,
        usd_per_buy = excluded.usd_per_buy,
        projected_date = excluded.projected_date,
        target_date = excluded.target_date,
        plan_status = excluded.plan_status
      returning id, holding_id, taken_at, symbol, asset_quantity, target_quantity, remaining_quantity,
                completion_pct, asset_price, holdings_usd, target_usd, usd_per_buy, projected_date,
                target_date, plan_status
    `;
    const row = rows[0];
    if (!row) throw new Error("Failed to save snapshot");
    return toSnap(row);
  });

const mileInput = z.object({
  holdingId: z.string().min(1),
  pct: z.union([z.literal(25), z.literal(50), z.literal(75), z.literal(100)]),
  achievedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const saveMilestone = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => mileInput.parse(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const hid = Number(data.holdingId);
    const owned = await sql<{ id: number }>`
      select id from holdings where id = ${hid} and user_id = ${context.userId}
    `;
    if (!owned[0]) throw new Error("Holding not found");
    const rows = await sql<MileRow>`
      insert into holding_milestones (user_id, holding_id, pct, achieved_at)
      values (${context.userId}, ${hid}, ${data.pct}, ${data.achievedAt})
      on conflict (holding_id, pct) do nothing
      returning id, holding_id, pct, achieved_at
    `;
    const row = rows[0];
    if (!row) {
      const existing = await sql<MileRow>`
        select id, holding_id, pct, achieved_at from holding_milestones
        where holding_id = ${hid} and pct = ${data.pct} and user_id = ${context.userId}
      `;
      return existing[0] ? toMile(existing[0]) : null;
    }
    return toMile(row);
  });

const verInput = z.object({
  holdingId: z.string().min(1),
  targetQuantity: z.number().positive(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  frequency: z.enum(["daily", "weekly", "biweekly", "monthly"]).nullable(),
  usdPerBuy: z.number().nullable(),
  assumedPrice: z.number().nullable(),
});

export const savePlanVersion = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => verInput.parse(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const hid = Number(data.holdingId);
    const owned = await sql<{ id: number }>`
      select id from holdings where id = ${hid} and user_id = ${context.userId}
    `;
    if (!owned[0]) throw new Error("Holding not found");
    const rows = await sql<VerRow>`
      insert into holding_plan_versions (
        user_id, holding_id, target_quantity, target_date, frequency, usd_per_buy, assumed_price
      ) values (
        ${context.userId}, ${hid}, ${data.targetQuantity}, ${data.targetDate}, ${data.frequency},
        ${data.usdPerBuy}, ${data.assumedPrice}
      )
      returning id, holding_id, created_at, target_quantity, target_date, frequency, usd_per_buy, assumed_price
    `;
    const row = rows[0];
    if (!row) throw new Error("Failed to save plan version");
    return toVer(row);
  });

export const getOnboarding = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{ onboarding_completed: boolean }>`
      select onboarding_completed from user_settings where user_id = ${context.userId}
    `;
    return { completed: Boolean(rows[0]?.onboarding_completed) };
  });

export const setOnboarding = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ completed: z.boolean() }).parse(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`
      insert into user_settings (user_id, onboarding_completed, updated_at)
      values (${context.userId}, ${data.completed}, now())
      on conflict (user_id) do update set
        onboarding_completed = excluded.onboarding_completed,
        updated_at = now()
    `;
    return { completed: data.completed };
  });

type HoldingCronRow = {
  id: number;
  user_id: string;
  symbol: string;
  name: string;
  coingecko_id: string;
  target_amount: string | number;
  current_amount: string | number;
  source: string;
  wallet_address: string | null;
  wallet_amount: string | number | null;
  manual_amount: string | number | null;
  cost_basis_usd: string | number | null;
  plan_id: number | null;
  target_date: string | null;
  frequency: string | null;
  assumed_price: string | number | null;
  baseline: unknown;
};

function holdingFromCron(row: HoldingCronRow): Holding {
  const walletAmount = num(row.wallet_amount);
  const currentAmount = num(row.current_amount);
  const manualAmount = row.manual_amount == null ? Math.max(0, currentAmount - walletAmount) : num(row.manual_amount);
  return {
    id: String(row.id),
    symbol: row.symbol,
    name: row.name,
    coingeckoId: row.coingecko_id,
    targetAmount: num(row.target_amount),
    currentAmount,
    source: walletAmount > 0 && manualAmount > 0 ? "mixed" : walletAmount > 0 ? "wallet" : "manual",
    walletAddress: row.wallet_address,
    walletAmount,
    manualAmount,
    costBasisUsd: numOrNull(row.cost_basis_usd),
  };
}

function planFromCron(row: HoldingCronRow): DcaPlan | null {
  if (row.plan_id == null || !row.target_date || !row.frequency) return null;
  const base = row.baseline && typeof row.baseline === "object" ? (row.baseline as Record<string, unknown>) : null;
  return {
    id: String(row.plan_id),
    holdingId: String(row.id),
    targetDate: dateOnly(row.target_date),
    frequency: row.frequency as DcaFrequency,
    assumedPrice: numOrNull(row.assumed_price),
    baselineAt: typeof base?.baselineAt === "string" ? base.baselineAt : null,
    baselineDays: numOrNull(base?.baselineDays as string | number),
    baselineUsdPerBuy: numOrNull(base?.baselineUsdPerBuy as string | number),
    baselinePrice: numOrNull(base?.baselinePrice as string | number),
    baselineRemaining: numOrNull(base?.baselineRemaining as string | number),
    baselineTargetAmount: numOrNull(base?.baselineTargetAmount as string | number),
    baselineCurrentAmount: numOrNull(base?.baselineCurrentAmount as string | number),
    baselineTargetDate: typeof base?.baselineTargetDate === "string" ? base.baselineTargetDate : null,
  };
}

export async function runDailySnapshots(): Promise<{ holdings: number; snapshots: number; milestones: number }> {
  const sql = await getSql();
  const market = await loadMarket();
  const rows = await sql<HoldingCronRow>`
    select h.id, h.user_id, h.symbol, h.name, h.coingecko_id, h.target_amount, h.current_amount, h.source,
           h.wallet_address, h.wallet_amount, h.manual_amount, h.cost_basis_usd,
           p.id as plan_id, p.target_date, p.frequency, p.assumed_price, p.baseline
    from holdings h
    left join dca_plans p on p.holding_id = h.id
  `;
  let snapshots = 0;
  let milestones = 0;
  const today = new Date();
  for (const row of rows) {
    const holding = holdingFromCron(row);
    const plan = planFromCron(row);
    const snap = buildSnapshot(holding, plan, market.prices, today);
    await sql`
      insert into holding_snapshots (
        user_id, holding_id, taken_at, symbol, asset_quantity, target_quantity, remaining_quantity,
        completion_pct, asset_price, holdings_usd, target_usd, usd_per_buy, projected_date, target_date, plan_status
      ) values (
        ${row.user_id}, ${row.id}, ${snap.takenAt}, ${snap.symbol}, ${snap.assetQuantity}, ${snap.targetQuantity},
        ${snap.remainingQuantity}, ${snap.completionPct}, ${snap.assetPrice}, ${snap.holdingsUsd}, ${snap.targetUsd},
        ${snap.usdPerBuy}, ${snap.projectedDate}, ${snap.targetDate}, ${snap.planStatus}
      )
      on conflict (holding_id, taken_at) do update set
        symbol = excluded.symbol,
        asset_quantity = excluded.asset_quantity,
        target_quantity = excluded.target_quantity,
        remaining_quantity = excluded.remaining_quantity,
        completion_pct = excluded.completion_pct,
        asset_price = excluded.asset_price,
        holdings_usd = excluded.holdings_usd,
        target_usd = excluded.target_usd,
        usd_per_buy = excluded.usd_per_buy,
        projected_date = excluded.projected_date,
        target_date = excluded.target_date,
        plan_status = excluded.plan_status
    `;
    snapshots += 1;
    const prev = await sql<{ completion_pct: string | number }>`
      select completion_pct from holding_snapshots
      where holding_id = ${row.id} and taken_at < ${snap.takenAt}
      order by taken_at desc limit 1
    `;
    const existing = await sql<MileRow>`
      select id, holding_id, pct, achieved_at from holding_milestones
      where holding_id = ${row.id}
    `;
    const priorPct = prev[0] ? num(prev[0].completion_pct) : 0;
    const fresh = detectNewMilestones(holding.id, priorPct, snap.completionPct, existing.map(toMile), snap.takenAt);
    for (const mile of fresh) {
      await sql`
        insert into holding_milestones (user_id, holding_id, pct, achieved_at)
        values (${row.user_id}, ${row.id}, ${mile.pct}, ${mile.achievedAt})
        on conflict (holding_id, pct) do nothing
      `;
      milestones += 1;
    }
    const last = await sql<VerRow>`
      select id, holding_id, created_at, target_quantity, target_date, frequency, usd_per_buy, assumed_price
      from holding_plan_versions
      where holding_id = ${row.id}
      order by created_at desc limit 1
    `;
    const nextVer = planVersionFrom(holding, plan, snap.usdPerBuy, today);
    const prevVer = last[0] ? toVer(last[0]) : undefined;
    if (versionChanged(prevVer, nextVer)) {
      await sql`
        insert into holding_plan_versions (
          user_id, holding_id, target_quantity, target_date, frequency, usd_per_buy, assumed_price
        ) values (
          ${row.user_id}, ${row.id}, ${nextVer.targetQuantity}, ${nextVer.targetDate}, ${nextVer.frequency},
          ${nextVer.usdPerBuy}, ${nextVer.assumedPrice}
        )
      `;
    }
  }
  return { holdings: rows.length, snapshots, milestones };
}
