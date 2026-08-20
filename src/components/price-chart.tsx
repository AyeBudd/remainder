import { Area, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, AreaChart } from "recharts";
import type { ChartPoint } from "@/lib/asset-market";
import { formatUsd } from "@/lib/format";

type Props = {
  series: ChartPoint[];
  up: boolean;
};

export function PriceChart({ series, up }: Props) {
  if (series.length < 2) {
    return <p className="py-16 text-center text-sm text-muted-foreground">No chart data for this range.</p>;
  }
  const stroke = up ? "var(--color-success)" : "var(--color-destructive)";
  return (
    <div className="h-64 w-full min-w-0 sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="assetFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.28} />
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
            domain={["auto", "auto"]}
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={64}
            tickFormatter={(v) => formatUsd(Number(v), { compact: true })}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const row = payload[0].payload as ChartPoint;
              return (
                <div className="rounded-md bg-popover px-3 py-2 text-sm shadow-[var(--shadow-border)]">
                  <p className="text-xs text-muted-foreground">
                    {new Date(row.t).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  <p className="font-mono tabular-nums">{formatUsd(row.price, { precise: true })}</p>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke={stroke}
            strokeWidth={2}
            fill="url(#assetFill)"
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}