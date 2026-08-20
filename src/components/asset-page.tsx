import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { remainingCoins, fillRatio } from "@/lib/assets";
import { CHART_RANGES, loadAssetMarket, type AssetMarket } from "@/lib/asset-market";
import {
  formatCoins,
  formatCompact,
  formatPercent,
  formatSignedPercent,
  formatSignedUsd,
  formatUsd,
  formatUsdCompact,
} from "@/lib/format";
import { unrealizedPnl } from "@/lib/pnl";
import { veil } from "@/lib/privacy";
import { useHideAmounts } from "@/hooks/use-hide-amounts";
import { usePortfolio } from "@/hooks/use-portfolio";
import { Change24 } from "@/components/change-24";
import { PriceChart } from "@/components/price-chart";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { SiteHeader } from "@/components/site-header";
import { writeAppView, type AppView } from "@/lib/view";

type Props = { coinId: string };

export function AssetPage({ coinId }: Props) {
  const navigate = useNavigate();
  const portfolio = usePortfolio();
  const [days, setDays] = useState<(typeof CHART_RANGES)[number]["id"]>("90");
  const [data, setData] = useState<AssetMarket | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    void loadAssetMarket({ data: { id: coinId, days } })
      .then((next) => {
        if (!cancelled) setData(next);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [coinId, days]);

  const holding = portfolio.holdings.find((h) => h.coingeckoId === coinId);
  const first = data?.series[0]?.price;
  const last = data?.series[data.series.length - 1]?.price;
  const chartUp = first != null && last != null ? last >= first : (data?.change24 ?? 0) >= 0;

  const go = (view: AppView) => {
    writeAppView(view);
    void navigate({ to: "/", hash: view === "ledger" ? "/" : `/${view}` });
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 pb-16 sm:px-6">
      <SiteHeader view="ledger" onViewChange={go} />
      <p className="mt-4">
        <Link to="/" className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          Ledger
        </Link>
      </p>

      {loading && !data ? (
        <div className="mt-8 space-y-4">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-16 w-56" />
          <Skeleton className="h-64" />
        </div>
      ) : error && !data ? (
        <p className="mt-10 text-sm text-destructive">Could not load this asset right now.</p>
      ) : data ? (
        <>
          <section className="mt-4">
            <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
              {data.rank != null ? `Rank ${data.rank}` : "Asset"}
            </p>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="font-serif text-5xl tracking-tight sm:text-6xl">{data.symbol}</h1>
                <p className="mt-1 text-muted-foreground">{data.name}</p>
              </div>
              <div className="text-right">
                <p className="font-serif text-4xl tracking-tight tabular-nums sm:text-5xl">
                  {data.price != null ? formatUsd(data.price, { precise: true }) : "—"}
                </p>
                <div className="mt-1 flex justify-end">
                  <Change24 change={data.change24 ?? undefined} />
                </div>
              </div>
            </div>
          </section>

          {holding && <HoldingStrip holding={holding} price={data.price} />}

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
              {loading ? <Skeleton className="h-64" /> : <PriceChart series={data.series} up={chartUp} />}
            </div>
          </section>

          <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Market cap" value={data.marketCap != null ? formatUsdCompact(data.marketCap) : "—"} />
            <Stat label="24h volume" value={data.volume24 != null ? formatUsdCompact(data.volume24) : "—"} />
            <Stat label="FDV" value={data.fdv != null ? formatUsdCompact(data.fdv) : "—"} />
            <Stat
              label="Vol / cap"
              value={
                data.volume24 != null && data.marketCap && data.marketCap > 0
                  ? formatPercent(data.volume24 / data.marketCap)
                  : "—"
              }
            />
            <Stat label="24h high" value={data.high24 != null ? formatUsd(data.high24, { precise: true }) : "—"} />
            <Stat label="24h low" value={data.low24 != null ? formatUsd(data.low24, { precise: true }) : "—"} />
            <Stat label="7d" value={data.change7d != null ? formatSignedPercent(data.change7d) : "—"} signed={data.change7d} />
            <Stat label="30d" value={data.change30d != null ? formatSignedPercent(data.change30d) : "—"} signed={data.change30d} />
            <Stat
              label="ATH"
              value={data.ath != null ? formatUsd(data.ath, { precise: true }) : "—"}
              hint={data.athDate ?? undefined}
            />
            <Stat
              label="From ATH"
              value={data.athChange != null ? formatSignedPercent(data.athChange) : "—"}
              signed={data.athChange}
            />
            <Stat
              label="ATL"
              value={data.atl != null ? formatUsd(data.atl, { precise: true }) : "—"}
              hint={data.atlDate ?? undefined}
            />
            <Stat
              label="Circulating"
              value={data.circulating != null ? `${formatCompact(data.circulating)} ${data.symbol}` : "—"}
            />
            <Stat
              label="Total supply"
              value={data.totalSupply != null ? `${formatCompact(data.totalSupply)} ${data.symbol}` : "—"}
            />
            <Stat
              label="Max supply"
              value={data.maxSupply != null ? `${formatCompact(data.maxSupply)} ${data.symbol}` : "Uncapped"}
            />
          </dl>

          {data.about && (
            <section className="mt-8">
              <h2 className="font-serif text-2xl tracking-tight">About</h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{data.about}</p>
              {data.homepage && (
                <a
                  href={data.homepage}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block text-sm underline-offset-4 hover:underline"
                >
                  Project site
                </a>
              )}
            </section>
          )}
        </>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  signed,
}: {
  label: string;
  value: string;
  hint?: string;
  signed?: number | null;
}) {
  const tone =
    signed == null ? "" : signed > 0 ? " text-success" : signed < 0 ? " text-destructive" : "";
  return (
    <div className="rounded-xl bg-card px-4 py-3 shadow-[var(--shadow-border)]">
      <dt className="text-xs tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className={`mt-1 font-serif text-xl tracking-tight tabular-nums${tone}`}>{value}</dd>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function HoldingStrip({
  holding,
  price,
}: {
  holding: { currentAmount: number; targetAmount: number; symbol: string; costBasisUsd: number | null };
  price: number | null;
}) {
  const remain = remainingCoins(holding.currentAmount, holding.targetAmount);
  const ratio = fillRatio(holding.currentAmount, holding.targetAmount);
  const remainUsd = price != null ? remain * price : null;
  const met = remain <= 0;
  const pnl = unrealizedPnl(holding.currentAmount, holding.costBasisUsd, price ?? undefined);
  const { hidden: hideAmounts } = useHideAmounts();
  return (
    <section className="mt-6 rounded-xl bg-card p-4 shadow-[var(--shadow-border)] sm:p-5">
      <p className="text-xs tracking-wide text-muted-foreground uppercase">Your target</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <p className="font-mono text-sm tabular-nums">
          {hideAmounts
            ? `${formatPercent(ratio)} of target`
            : `${formatCoins(holding.currentAmount, holding.symbol)} / ${formatCoins(holding.targetAmount, holding.symbol)} ${holding.symbol}`}
        </p>
        <p className={met ? "font-serif text-2xl tracking-tight text-success" : "font-serif text-2xl tracking-tight tabular-nums"}>
          {met ? "Target Hit" : hideAmounts ? formatPercent(ratio) : remainUsd != null ? formatUsd(remainUsd) : formatPercent(ratio)}
        </p>
      </div>
      <Progress
        className={met ? "mt-3 bg-success/25" : "mt-3"}
        indicatorClassName={met ? "bg-success" : undefined}
        value={Math.min(100, ratio * 100)}
      />
      {pnl && (
        <p className={`mt-3 font-mono text-sm tabular-nums ${pnl.usd >= 0 ? "text-success" : "text-destructive"}`}>
          Est. P/L{" "}
          {hideAmounts
            ? pnl.ratio != null
              ? formatSignedPercent(pnl.ratio)
              : veil(true, "")
            : `${formatSignedUsd(pnl.usd, { precise: true })}${
                pnl.ratio != null ? ` (${formatSignedPercent(pnl.ratio)})` : ""
              }`}
        </p>
      )}
    </section>
  );
}