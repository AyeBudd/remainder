import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { prettyDate } from "@/lib/dca-pace";
import { frequencyNoun } from "@/lib/dca-periods";
import { formatCoins, formatPercent, formatUsd } from "@/lib/format";
import { veil } from "@/lib/privacy";
import {
  PROGRESS_RANGES,
  estimatedMilestoneDate,
  sliceSnapshots,
  summarizeProgress,
  type HoldingMilestone,
  type HoldingSnapshot,
  type PlanVersion,
  type ProgressRange,
} from "@/lib/progress";
import type { DcaPlan } from "@/lib/types";

type ChartMode = "qty" | "pct" | "remain";

type Props = {
  symbol: string;
  snapshots: HoldingSnapshot[];
  milestones: HoldingMilestone[];
  versions: PlanVersion[];
  plan: DcaPlan | null;
  hideAmounts?: boolean;
  onAdjustPlan?: () => void;
};

export function ProgressPanel({
  symbol,
  snapshots,
  milestones,
  versions,
  plan,
  hideAmounts,
  onAdjustPlan,
}: Props) {
  const [range, setRange] = useState<ProgressRange>("90d");
  const [mode, setMode] = useState<ChartMode>("qty");
  const summary = useMemo(() => summarizeProgress(snapshots, plan), [snapshots, plan]);
  const series = useMemo(() => sliceSnapshots(snapshots, range), [snapshots, range]);
  const haveHistory = snapshots.length >= 2;

  const chart = series.map((s) => ({
    t: new Date(`${s.takenAt}T00:00:00`).getTime(),
    qty: s.assetQuantity,
    pct: s.completionPct,
    remain: s.remainingQuantity,
    takenAt: s.takenAt,
  }));

  const yKey = mode === "qty" ? "qty" : mode === "pct" ? "pct" : "remain";
  const stroke = "var(--color-foreground)";

  return (
    <section className="mt-8 rounded-xl bg-card p-4 shadow-[var(--shadow-border)] sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">{symbol} accumulated</p>
          <h2 className="mt-1 font-serif text-3xl tracking-tight">Progress</h2>
        </div>
        <div className="flex gap-1">
          {PROGRESS_RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRange(r.id)}
              className={
                range === r.id
                  ? "min-h-11 rounded-md bg-secondary px-3 text-sm"
                  : "min-h-11 rounded-md px-3 text-sm text-muted-foreground hover:text-foreground"
              }
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Current"
          value={hideAmounts ? veil(true, formatCoins(summary.current, symbol)) : `${formatCoins(summary.current, symbol)} ${symbol}`}
        />
        <Stat
          label="Since starting"
          value={
            hideAmounts
              ? formatPercent(summary.completionPct)
              : `${summary.addedSinceStart >= 0 ? "+" : ""}${formatCoins(summary.addedSinceStart, symbol)} ${symbol}`
          }
        />
        <Stat label="Complete" value={formatPercent(summary.completionPct)} />
        <Stat
          label="Last 30 days"
          value={
            hideAmounts
              ? "—"
              : `${summary.last30d >= 0 ? "+" : ""}${formatCoins(summary.last30d, symbol)} ${symbol}`
          }
        />
      </dl>

      {summary.perWeek != null && (
        <p className="mt-3 text-sm text-muted-foreground">
          Average {hideAmounts ? "—" : `${formatCoins(summary.perWeek, symbol)} ${symbol}`}/week over the last month.
        </p>
      )}

      <div className="mt-5 flex gap-2">
        {(
          [
            ["qty", `${symbol}`],
            ["pct", "% of target"],
            ["remain", "Remaining"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={
              mode === id
                ? "min-h-11 rounded-md bg-secondary px-3 text-sm"
                : "min-h-11 rounded-md px-3 text-sm text-muted-foreground"
            }
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 h-56 w-full min-w-0 sm:h-72">
        {!haveHistory ? (
          <p className="grid h-full place-items-center text-center text-sm text-muted-foreground">
            History builds as you use Remaindr. Check back tomorrow for the first trend.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="progressFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={stroke} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={stroke} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="t"
                type="number"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(v) =>
                  new Date(Number(v)).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                }
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                minTickGap={28}
              />
              <YAxis
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={52}
                tickFormatter={(v) =>
                  mode === "pct"
                    ? formatPercent(Number(v))
                    : hideAmounts
                      ? ""
                      : formatCoins(Number(v), symbol)
                }
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null;
                  const row = payload[0].payload as (typeof chart)[number];
                  return (
                    <div className="rounded-md bg-popover px-3 py-2 text-sm shadow-[var(--shadow-border)]">
                      <p className="text-xs text-muted-foreground">{prettyDate(row.takenAt)}</p>
                      <p className="font-mono tabular-nums">
                        {mode === "pct"
                          ? formatPercent(row.pct)
                          : hideAmounts
                            ? "••••"
                            : `${formatCoins(mode === "remain" ? row.remain : row.qty, symbol)} ${symbol}`}
                      </p>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey={yKey}
                stroke={stroke}
                strokeWidth={2}
                fill="url(#progressFill)"
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <div>
          <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Projection</p>
          <p className="mt-2 text-sm">
            Current pace:{" "}
            {summary.projectedDate ? prettyDate(summary.projectedDate) : "Not enough history yet"}
          </p>
          {summary.originalDate && (
            <p className="mt-1 text-sm text-muted-foreground">Original target: {prettyDate(summary.originalDate)}</p>
          )}
          {summary.daysDelta != null && summary.daysDelta !== 0 && (
            <p className="mt-1 text-sm text-muted-foreground">
              {summary.daysDelta > 0
                ? `Behind by ${summary.daysDelta} day${summary.daysDelta === 1 ? "" : "s"}`
                : `Ahead by ${Math.abs(summary.daysDelta)} day${Math.abs(summary.daysDelta) === 1 ? "" : "s"}`}
            </p>
          )}
        </div>

        <div>
          <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Plan performance</p>
          {plan ? (
            <>
              {summary.plannedUsdPerBuy != null ? (
                <>
                  <p className="mt-2 text-sm">
                    Planned: {formatUsd(summary.plannedUsdPerBuy, { precise: summary.plannedUsdPerBuy < 100 })}/
                    {frequencyNoun(plan.frequency)}
                  </p>
                  <p className="mt-1 text-sm">
                    Actual:{" "}
                    {summary.actualUsdPerWeek != null
                      ? `${formatUsd(summary.actualUsdPerWeek, { precise: summary.actualUsdPerWeek < 100 })}/week`
                      : "Shows after a few days of holdings"}
                  </p>
                  {summary.actualVsPlan != null && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {summary.contributionStatus === "ahead"
                        ? `You're contributing ${Math.round(Math.abs(summary.actualVsPlan) * 100)}% more than planned.`
                        : summary.contributionStatus === "on-track"
                          ? "You're contributing about as planned."
                          : `You're contributing ${Math.round(Math.abs(summary.actualVsPlan) * 100)}% less than planned.`}
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  Plan is set. Actual vs planned shows after a few days with prices.
                </p>
              )}
              {onAdjustPlan && (
                <ButtonLink onClick={onAdjustPlan}>Adjust plan</ButtonLink>
              )}
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No contribution plan on this target.</p>
          )}
        </div>
      </div>

      <MilestoneList
        symbol={symbol}
        current={summary.current}
        target={snapshots[snapshots.length - 1]?.targetQuantity ?? 0}
        perWeek={summary.perWeek}
        milestones={milestones}
      />

      {versions.length > 0 && (
        <div className="mt-8">
          <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Target history</p>
          <ol className="mt-3 space-y-3">
            {versions.map((v, i) => (
              <li key={v.id} className="text-sm">
                <p className="font-medium">
                  {formatCoins(v.targetQuantity, symbol)} {symbol}
                  {v.targetDate ? ` by ${prettyDate(v.targetDate)}` : " · no deadline"}
                </p>
                <p className="text-muted-foreground">
                  {i === 0 ? "Created" : "Changed"} {prettyDate(v.createdAt.slice(0, 10))}
                </p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-1 font-serif text-2xl tracking-tight tabular-nums">{value}</dd>
    </div>
  );
}

function ButtonLink({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 min-h-11 text-sm underline-offset-4 hover:underline"
    >
      {children}
    </button>
  );
}

function MilestoneList({
  symbol,
  current,
  target,
  perWeek,
  milestones,
}: {
  symbol: string;
  current: number;
  target: number;
  perWeek: number | null;
  milestones: HoldingMilestone[];
}) {
  const have = new Map(milestones.map((m) => [m.pct, m]));
  return (
    <div className="mt-8">
      <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Milestones</p>
      <ul className="mt-3 space-y-2">
        {([25, 50, 75, 100] as const).map((pct) => {
          const hit = have.get(pct);
          const eta = hit ? null : estimatedMilestoneDate(pct, current, target, perWeek);
          return (
            <li key={pct} className="flex items-baseline justify-between gap-3 text-sm">
              <span>
                {hit ? "Reached" : "Open"} {pct}%
              </span>
              <span className="font-mono tabular-nums text-muted-foreground">
                {hit ? prettyDate(hit.achievedAt) : eta ? `Est. ${prettyDate(eta)}` : "—"}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">
        Dates stay put if the stack later dips. {symbol} only.
      </p>
    </div>
  );
}
