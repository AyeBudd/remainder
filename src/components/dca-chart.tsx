import {
  Area,
  CartesianGrid,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { type DcaMilestone, type DcaPoint } from "@/lib/dca";
import { formatCoins, formatPercent, formatUsd } from "@/lib/format";

type Props = {
  series: DcaPoint[];
  milestones: DcaMilestone[];
  symbol: string;
};

export function DcaChart({ series, milestones, symbol }: Props) {
  if (series.length < 2) return null;
  const start = series[0];
  const end = series[series.length - 1];
  const tMin = start.t;
  const tMax = end.t;
  const yMax = end.target > 0 ? end.target : Math.max(...series.map((p) => p.amount));
  const yMin = Math.min(...series.map((p) => p.amount));
  const ticks = [tMin, ...milestones.map((m) => m.t), tMax].filter(
    (t, i, a) => Number.isFinite(t) && a.indexOf(t) === i,
  );

  return (
    <div className="mt-6">
      {milestones.length > 0 && (
        <div className="mb-3 grid grid-cols-3 gap-2">
          {milestones.map((m) => (
            <div key={m.pct}>
              <p className="font-serif text-2xl tracking-tight">{m.pct}%</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{m.fullDate}</p>
            </div>
          ))}
        </div>
      )}
      <div className="h-64 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={series} margin={{ top: 12, right: 16, left: 0, bottom: 4 }}>
            <defs>
              <linearGradient id="remainFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-foreground)" stopOpacity={0.2} />
                <stop offset="100%" stopColor="var(--color-foreground)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--color-border)" vertical={false} />
            <XAxis
              type="number"
              dataKey="t"
              domain={[tMin, tMax]}
              ticks={ticks}
              tickFormatter={(value) => {
                const t = Number(value);
                if (t === tMin) return "Now";
                const mark = milestones.find((m) => m.t === t);
                if (mark) return `${mark.pct}%`;
                if (t === tMax) return "100%";
                return "";
              }}
              tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              minTickGap={4}
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={52}
              tickFormatter={(v) => formatCoins(Number(v), symbol)}
            />
            <Tooltip
              cursor={{ stroke: "var(--color-foreground)", strokeOpacity: 0.25 }}
              content={<DcaTooltip symbol={symbol} />}
            />
            {milestones.map((m) => (
              <ReferenceLine
                key={m.pct}
                x={m.t}
                stroke="var(--color-foreground)"
                strokeOpacity={0.18}
              />
            ))}
            <Area
              type="monotone"
              dataKey="amount"
              stroke="var(--color-foreground)"
              fill="url(#remainFill)"
              strokeWidth={1.6}
              dot={<PlanDot />}
              activeDot={{ r: 5, fill: "var(--color-foreground)", stroke: "var(--color-card)", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function PlanDot(props: { cx?: number; cy?: number; payload?: DcaPoint }) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return null;
  if (payload?.milestone == null) return <g />;
  const end = payload.milestone === 100;
  return (
    <g>
      <circle cx={cx} cy={cy} r={end ? 7 : 9} fill="var(--color-foreground)" fillOpacity={0.16} />
      <circle cx={cx} cy={cy} r={end ? 4 : 5} fill="var(--color-foreground)" />
    </g>
  );
}

function DcaTooltip({
  active,
  payload,
  symbol,
}: {
  active?: boolean;
  payload?: { payload: DcaPoint }[];
  symbol: string;
}) {
  if (!active || !payload?.[0]) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg bg-popover px-3 py-2 shadow-[var(--shadow-border)]">
      <p className="font-serif text-lg tracking-tight">{point.fullDate}</p>
      <p className="mt-1 font-mono text-sm tabular-nums">
        {formatCoins(point.amount, symbol)} {symbol}
      </p>
      {point.usd != null && (
        <p className="text-sm tabular-nums text-muted-foreground">{formatUsd(point.usd)}</p>
      )}
      <p className="mt-1 text-xs text-muted-foreground">{formatPercent(point.fill)} of target</p>
      {point.milestone != null && (
        <p className="mt-0.5 text-xs text-muted-foreground">{point.milestone}% of plan</p>
      )}
    </div>
  );
}
