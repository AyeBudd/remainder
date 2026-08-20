import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { formatDayCount, formatShortDate } from "@/lib/btc-cycle";
import { loadBtcTracker, type BtcTracker } from "@/lib/btc-tracker";
import { formatSignedPercent, formatUpdated, formatUsd } from "@/lib/format";
import { usePrices } from "@/hooks/use-prices";
import { Change24 } from "@/components/change-24";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function BtcTrackerPage() {
  const { prices, changes } = usePrices();
  const [data, setData] = useState<BtcTracker | null>(null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async (force = false) => {
    setRefreshing(true);
    try {
      const next = await loadBtcTracker(force);
      setData(next);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setRefreshing(false);
    }
  }, []);

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

  if (!data && !error) {
    return (
      <div className="mt-10 space-y-4">
        <Skeleton className="h-12 w-40" />
        <Skeleton className="h-20 w-64" />
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
            onClick={() => void load(true)}
            disabled={refreshing}
            aria-busy={refreshing}
            aria-label="Refresh Bitcoin stats"
          >
            <RefreshCw className={refreshing ? "animate-spin" : undefined} />
            {refreshing ? "Updating…" : "Update"}
          </Button>
        </div>
      </section>

      <section className="mt-10 grid gap-3 md:grid-cols-2">
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

      {error && !data && (
        <p className="mt-4 text-sm text-muted-foreground">
          Could not reach live Bitcoin stats. Try Update again in a moment.
        </p>
      )}
    </>
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
