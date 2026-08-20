import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { formatDayCount, formatShortDate } from "@/lib/btc-cycle";
import { CHART_RANGES } from "@/lib/asset-market";
import {
  BTC_MAX_SUPPLY,
  formatHashrate,
  GOLD_STOCK_TONNES,
  loadBtcTracker,
  type BtcTracker,
} from "@/lib/btc-tracker";
import {
  formatCompact,
  formatPercent,
  formatSignedPercent,
  formatUpdated,
  formatUsd,
  formatUsdCompact,
} from "@/lib/format";
import { usePrices } from "@/hooks/use-prices";
import { Change24 } from "@/components/change-24";
import { PriceChart } from "@/components/price-chart";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function BtcTrackerPage() {
  const { prices, changes } = usePrices();
  const [days, setDays] = useState<(typeof CHART_RANGES)[number]["id"]>("90");
  const [data, setData] = useState<BtcTracker | null>(null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(
    async (force = false, range = days) => {
      setRefreshing(true);
      try {
        const next = await loadBtcTracker({ data: { force, days: range } });
        setData(next);
        setError(false);
      } catch {
        setError(true);
      } finally {
        setRefreshing(false);
      }
    },
    [days],
  );

  useEffect(() => {
    void load(false);
    const poll = window.setInterval(() => void load(false), 60_000);
    const tick = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => {
      window.clearInterval(poll);
      window.clearInterval(tick);
    };
  }, [load]);

  const price = data?.price ?? prices.bitcoin ?? null;
  const change24 = data?.change24 ?? changes?.bitcoin;
  const fromAth = price != null && data ? price / data.ath.price - 1 : null;
  const fromLow = price != null && data ? price / data.cycleLow.price - 1 : null;
  const first = data?.series[0]?.price;
  const last = data?.series[data.series.length - 1]?.price;
  const chartUp = first != null && last != null ? last >= first : (change24 ?? 0) >= 0;
  const vsGold =
    data?.marketCap && data.goldCap && data.goldCap > 0 ? data.marketCap / data.goldCap : null;
  const issued =
    data?.circulating != null ? data.circulating / (data.maxSupply || BTC_MAX_SUPPLY) : null;
  const satsPerDollar = price && price > 0 ? 100_000_000 / price : null;

  if (!data && !error) {
    return (
      <div className="mt-10 space-y-4">
        <Skeleton className="h-12 w-40" />
        <Skeleton className="h-20 w-64" />
        <Skeleton className="h-64" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
      </div>
    );
  }

  return (
    <>
      <section className="mt-8 sm:mt-12">
        <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Bitcoin</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-serif text-6xl leading-none tracking-tight tabular-nums sm:text-7xl">
            {price != null ? formatUsd(price) : "—"}
          </h1>
          <div className="pb-1">
            <Change24 change={change24} />
            {fromAth != null && (
              <p className="font-mono text-sm tabular-nums text-muted-foreground">
                {formatSignedPercent(fromAth)} vs ATH
              </p>
            )}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {data?.updatedAt ? `Updated ${formatUpdated(data.updatedAt, now)}` : "Fetching…"}
          </p>
          <Button
            variant="outline"
            onClick={() => void load(true, days)}
            disabled={refreshing}
            aria-busy={refreshing}
            aria-label="Refresh Bitcoin stats"
          >
            <RefreshCw className={refreshing ? "animate-spin" : undefined} />
            {refreshing ? "Updating…" : "Update"}
          </Button>
        </div>
      </section>

      <section className="mt-8 rounded-xl bg-card p-4 shadow-[var(--shadow-border)] sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-2xl tracking-tight">Price</h2>
          <div className="flex gap-1">
            {CHART_RANGES.map((range) => (
              <button
                key={range.id}
                type="button"
                onClick={() => setDays(range.id)}
                className={
                  days === range.id
                    ? "rounded-md bg-secondary px-3 py-2 text-sm"
                    : "rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
                }
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4">
          {refreshing && !data?.series.length ? (
            <Skeleton className="h-64" />
          ) : (
            <PriceChart series={data?.series ?? []} up={chartUp} />
          )}
        </div>
      </section>

      {data && (
        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="BTC market cap" value={data.marketCap != null ? formatUsdCompact(data.marketCap) : "—"} />
          <Stat
            label="Total crypto cap"
            value={data.totalCryptoCap != null ? formatUsdCompact(data.totalCryptoCap) : "—"}
          />
          <Stat label="BTC dominance" value={data.dominance != null ? formatPercent(data.dominance) : "—"} />
          <Stat label="24h volume" value={data.volume24 != null ? formatUsdCompact(data.volume24) : "—"} />
          <Stat
            label="Gold market cap"
            value={data.goldCap != null ? formatUsdCompact(data.goldCap) : "—"}
            hint={data.goldOz != null ? `${formatUsd(data.goldOz, { precise: true })} / oz` : undefined}
          />
          <Stat
            label="BTC vs gold"
            value={vsGold != null ? formatPercent(vsGold) : "—"}
            hint={vsGold != null ? `BTC cap / gold cap` : undefined}
          />
          <Stat
            label="Issued"
            value={
              data.circulating != null
                ? `${formatCompact(data.circulating)} / ${formatCompact(data.maxSupply)}`
                : "—"
            }
            hint={issued != null ? `${formatPercent(issued)} of 21M` : undefined}
          />
          <Stat
            label="Sats / $1"
            value={satsPerDollar != null ? Math.round(satsPerDollar).toLocaleString("en-US") : "—"}
          />
          <Stat
            label="Hashrate"
            value={data.hashrate != null ? formatHashrate(data.hashrate) : "—"}
          />
          <Stat
            label="Difficulty retarget"
            value={
              data.difficultyChange != null ? formatSignedPercent(data.difficultyChange) : "—"
            }
            hint={data.difficultyEta != null ? `~${formatShortDate(data.difficultyEta)}` : undefined}
          />
          <Stat
            label="7d"
            value={data.change7d != null ? formatSignedPercent(data.change7d) : "—"}
            tone={data.change7d}
          />
          <Stat
            label="Block height"
            value={data.cycle.height != null ? data.cycle.height.toLocaleString("en-US") : "—"}
          />
        </dl>
      )}

      <section className="mt-6 grid gap-3 md:grid-cols-2">
        <MarkCard
          label="All-time high"
          value={data ? formatUsd(data.ath.price) : "—"}
          date={data ? formatShortDate(data.ath.at) : "—"}
          note={fromAth != null ? formatSignedPercent(fromAth) : undefined}
        />
        <MarkCard
          label="Cycle low"
          value={data ? formatUsd(data.cycleLow.price) : "—"}
          date={data ? formatShortDate(data.cycleLow.at) : "—"}
          note={fromLow != null ? `${formatSignedPercent(fromLow)} off the floor` : "since ATH"}
        />
      </section>

      {data && (
        <section className="mt-6 rounded-xl bg-card p-4 shadow-[var(--shadow-border)] sm:p-5">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">Halving</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <p className="font-serif text-3xl tracking-tight tabular-nums">
                {formatDayCount(data.cycle.daysSince)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                since {formatShortDate(data.cycle.lastAt)}
              </p>
            </div>
            <div>
              <p className="font-serif text-3xl tracking-tight tabular-nums">
                {formatDayCount(data.cycle.daysTo)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                to ~{formatShortDate(data.cycle.eta)}
              </p>
            </div>
          </div>
          <div className="mt-5">
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.max(4, data.cycle.progress * 100)}%` }}
              />
            </div>
            <p className="mt-2 font-mono text-xs tabular-nums text-muted-foreground">
              {data.cycle.height != null
                ? `Block ${data.cycle.height.toLocaleString("en-US")} · ${
                    data.cycle.blocksLeft?.toLocaleString("en-US") ?? "—"
                  } to subsidy cut`
                : `${Math.round(data.cycle.progress * 100)}% through this epoch`}
            </p>
          </div>
        </section>
      )}

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        Gold market cap is spot × World Gold Council 2024 above-ground stock ({GOLD_STOCK_TONNES.toLocaleString("en-US")}{" "}
        tonnes). Comparison only — not a forecast or a claim that the two should trade at parity.
      </p>

      {error && !data && (
        <p className="mt-4 text-sm text-muted-foreground">
          Could not reach live Bitcoin stats. Try Update again in a moment.
        </p>
      )}
    </>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: number;
}) {
  const color =
    tone == null ? "" : tone > 0 ? " text-success" : tone < 0 ? " text-destructive" : "";
  return (
    <div className="rounded-xl bg-card px-4 py-3 shadow-[var(--shadow-border)]">
      <dt className="text-xs tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className={`mt-1 font-serif text-xl tracking-tight tabular-nums${color}`}>{value}</dd>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function MarkCard({
  label,
  value,
  date,
  note,
}: {
  label: string;
  value: string;
  date: string;
  note?: string;
}) {
  return (
    <article className="rounded-xl bg-card p-4 shadow-[var(--shadow-border)] sm:p-5">
      <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-2 font-serif text-4xl tracking-tight tabular-nums">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{date}</p>
      {note && <p className="mt-1 font-mono text-sm tabular-nums">{note}</p>}
    </article>
  );
}
