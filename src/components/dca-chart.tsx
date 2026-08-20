import {
  Area,
  CartesianGrid,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
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
  const dots = series.filter((p) => p.milestone != null);
  const ticks = [
    series[0]?.date,
    ...milestones.map((m) => m.date),
    series[series.length - 1]?.date,
  ].filter((d, i, a): d is string => Boolean(d) && a.indexOf(d) === i);

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
          <ComposedChart data={series} margin={{ top: 12, right: 10, left: 0, bottom: 4 }}>
            <defs>
              <linearGradient id="remainFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-foreground)" stopOpacity={0.2} />
                <stop offset="100%" stopColor="var(--color-foreground)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--color-border)" vertical={false} />
            <XAxis
              dataKey="date"
              ticks={ticks}
              tickFormatter={(value) => {
                const mark = milestones.find((m) => m.date === value);
                if (mark) return `${mark.pct}%`;
                if (value === series[0]?.date) return "Now";
                const last = series[series.length - 1];
                return last?.label ?? "";
              }}
              tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              minTickGap={8}
            />
            <YAxis
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
                x={m.date}
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
              dot={false}
              activeDot={{ r: 5, fill: "var(--color-foreground)", stroke: "var(--color-card)", strokeWidth: 2 }}
              isAnimationActive={false}
            />
            <Scatter
              data={dots}
              dataKey="amount"
              fill="var(--color-foreground)"
              shape={<HoldDot />}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function HoldDot(props: { cx?: number; cy?: number }) {
  const { cx, cy } = props;
  if (cx == null || cy == null) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={9} fill="var(--color-foreground)" fillOpacity={0.16} />
      <circle cx={cx} cy={cy} r={5} fill="var(--color-foreground)" />
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
        <p className="mt-0.5 text-xs text-muted-foreground">{point.milestone}% mark</p>
      )}
    </div>
  );
}
