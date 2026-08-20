import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpDown, Check, Plus, RefreshCw, Wallet } from "lucide-react";
import { remainingCoins } from "@/lib/assets";
import { formatPercent, formatUpdated, formatUsd } from "@/lib/format";
import {
  HOLDING_SORTS,
  readHoldingSort,
  sortHoldings,
  writeHoldingSort,
  type HoldingSort,
} from "@/lib/sort-holdings";
import type { Holding, HoldingInput } from "@/lib/types";
import { usePortfolio } from "@/hooks/use-portfolio";
import { usePrices } from "@/hooks/use-prices";
import { AddHoldingDialog } from "@/components/add-holding-dialog";
import { DcaNotices } from "@/components/dca-notices";
import { DcaPanel } from "@/components/dca-panel";
import { HoldingCard } from "@/components/holding-card";
import { WalletDialog } from "@/components/wallet-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

export function Dashboard() {
  const portfolio = usePortfolio();
  const { prices, changes, status: priceStatus, assets, updatedAt, refreshing, refresh } = usePrices();
  const [addOpen, setAddOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [editing, setEditing] = useState<Holding | null>(null);
  const [dcaId, setDcaId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [sort, setSort] = useState<HoldingSort>(() => readHoldingSort());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  const holdings = portfolio.holdings;
  const visibleHoldings = useMemo(
    () => sortHoldings(holdings, prices, sort),
    [holdings, prices, sort],
  );

  useEffect(() => {
    if (!holdings.length || !portfolio.plans.length) return;
    if (Object.keys(prices).length < 1) return;
    portfolio.ensureBaselines(prices);
  }, [holdings, prices, portfolio.plans, portfolio.ensureBaselines]);

  const chooseSort = (next: HoldingSort) => {
    setSort(next);
    writeHoldingSort(next);
  };

  const totals = useMemo(() => {
    let currentUsd = 0;
    let targetUsd = 0;
    let remainUsd = 0;
    let priced = 0;
    const slices: { id: string; symbol: string; remainUsd: number }[] = [];
    for (const h of holdings) {
      const price = prices[h.coingeckoId];
      if (price == null) continue;
      priced += 1;
      const remain = remainingCoins(h.currentAmount, h.targetAmount);
      currentUsd += h.currentAmount * price;
      targetUsd += h.targetAmount * price;
      const gap = remain * price;
      remainUsd += gap;
      if (gap > 0) slices.push({ id: h.id, symbol: h.symbol, remainUsd: gap });
    }
    const fill = targetUsd > 0 ? currentUsd / targetUsd : 0;
    return { currentUsd, targetUsd, remainUsd, priced, fill, slices };
  }, [holdings, prices]);

  const saveHolding = async (input: HoldingInput, id?: string) => {
    if (id) await portfolio.update(id, input);
    else await portfolio.add(input);
  };

  const applyWallet = async (
    updates: { id: string; currentAmount: number; walletAddress: string }[],
  ) => {
    for (const u of updates) {
      await portfolio.update(u.id, {
        currentAmount: u.currentAmount,
        source: "wallet",
        walletAddress: u.walletAddress,
      });
    }
  };

  if (portfolio.isLoading) {
    return (
      <div className="mt-10 space-y-4">
        <p className="text-sm text-muted-foreground">Loading your ledger…</p>
        <Skeleton className="h-12 w-48" />
        <Skeleton className="h-20 w-72" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <>
      {!portfolio.signedIn && (
        <p className="mt-2 rounded-lg bg-secondary/70 px-3 py-2 text-sm text-muted-foreground">
          This stack stays in this browser.{" "}
          <Link to="/login" className="text-foreground underline-offset-4 hover:underline">
            Sign in
          </Link>{" "}
          to save it to your account.
        </p>
      )}

      <section className="mt-8 sm:mt-12">
        <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
          Remaining to hit targets
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-serif text-6xl leading-none tracking-tight tabular-nums sm:text-7xl">
            {totals.priced > 0 ? formatUsd(totals.remainUsd) : "—"}
          </h1>
          <p className="pb-1 font-mono text-sm tabular-nums text-muted-foreground">
            {formatPercent(totals.fill)} filled
          </p>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <MiniStat label="Held" value={totals.priced > 0 ? formatUsd(totals.currentUsd) : "—"} />
          <MiniStat label="Target value" value={totals.priced > 0 ? formatUsd(totals.targetUsd) : "—"} />
          <MiniStat
            className="col-span-2 sm:col-span-1"
            label="Assets"
            value={String(holdings.length)}
          />
        </div>
        {totals.slices.length > 0 && (
          <div className="mt-5">
            <div className="flex h-2 overflow-hidden rounded-full bg-secondary">
              {totals.slices.map((slice) => (
                <div
                  key={slice.id}
                  className="h-full bg-primary/80 first:rounded-l-full last:rounded-r-full"
                  style={{
                    width: `${Math.max(4, (slice.remainUsd / totals.remainUsd) * 100)}%`,
                    opacity: 0.45 + (slice.remainUsd / totals.remainUsd) * 0.55,
                  }}
                  title={`${slice.symbol} ${formatUsd(slice.remainUsd)}`}
                />
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {totals.slices.map((slice) => (
                <span key={slice.id} className="tabular-nums">
                  {slice.symbol} {formatUsd(slice.remainUsd, { compact: true })}
                </span>
              ))}
            </div>
          </div>
        )}
        {priceStatus === "error" && (
          <p className="mt-3 text-sm text-muted-foreground">
            Live prices are unavailable. Coin amounts and remaining units still update.
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {priceStatus === "loading" && !updatedAt
              ? "Fetching live prices…"
              : updatedAt
                ? `Prices updated ${formatUpdated(updatedAt, now)} · auto every minute`
                : "Prices pending"}
          </p>
          <Button
            variant="outline"
            onClick={() => void refresh(true)}
            disabled={refreshing}
            aria-busy={refreshing}
            aria-label="Update prices for the top 100"
          >
            <RefreshCw className={refreshing ? "animate-spin" : undefined} />
            {refreshing ? "Updating…" : "Update prices"}
          </Button>
        </div>
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-2xl tracking-tight">Holdings</h2>
          <div className="flex flex-wrap gap-2">
            {holdings.length > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" aria-label="Sort targets">
                    <ArrowUpDown />
                    Sort
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-56">
                  {HOLDING_SORTS.map((option, i) => {
                    const prev = HOLDING_SORTS[i - 1];
                    const showGroup = option.group !== "default" && option.group !== prev?.group;
                    return (
                      <div key={option.id}>
                        {showGroup && (
                          <>
                            {i > 1 && <DropdownMenuSeparator />}
                            <div className="px-3 py-1.5 text-xs text-muted-foreground">{option.group}</div>
                          </>
                        )}
                        <DropdownMenuItem onSelect={() => chooseSort(option.id)}>
                          <Check className={sort === option.id ? "opacity-100" : "opacity-0"} />
                          {option.label}
                        </DropdownMenuItem>
                      </div>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button variant="outline" onClick={() => setWalletOpen(true)}>
              <Wallet />
              Wallet
            </Button>
            <Button onClick={() => setAddOpen(true)}>
              <Plus />
              Add target
            </Button>
          </div>
        </div>

        <DcaNotices holdings={holdings} plans={portfolio.plans} prices={prices} />

        {holdings.length === 0 ? (
          <EmptyState
            signedIn={portfolio.signedIn}
            onAdd={() => setAddOpen(true)}
            onSample={
              portfolio.signedIn
                ? undefined
                : () => {
                    portfolio.loadSample();
                  }
            }
          />
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {visibleHoldings.map((holding) => (
              <HoldingCard
                key={holding.id}
                holding={holding}
                plan={portfolio.plans.find((p) => p.holdingId === holding.id)}
                price={prices[holding.coingeckoId]}
                change={changes?.[holding.coingeckoId]}
                onEdit={() => setEditing(holding)}
                onPlan={() => {
                  setDcaId(holding.id);
                  document.getElementById("dca")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                onDelete={() => void portfolio.remove(holding.id)}
              />
            ))}
          </div>
        )}
      </section>

      <div className="mt-8">
        <DcaPanel
          holdings={holdings}
          plans={portfolio.plans}
          prices={prices}
          selectedId={dcaId}
          onSelect={setDcaId}
          onSave={(input) => portfolio.savePlan(input).then(() => undefined)}
          onClear={(id) => portfolio.removePlan(id)}
        />
      </div>

      {portfolio.error && (
        <p className="mt-4 text-sm text-destructive">{portfolio.error}</p>
      )}

      <AddHoldingDialog
        key={editing?.id ?? "new"}
        open={addOpen || Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) {
            setAddOpen(false);
            setEditing(null);
          }
        }}
        existingSymbols={holdings.map((h) => h.symbol)}
        assets={assets}
        editing={editing}
        onSave={saveHolding}
      />
      <WalletDialog
        open={walletOpen}
        onOpenChange={setWalletOpen}
        holdings={holdings}
        onApply={applyWallet}
        onAddFromWallet={(input) => portfolio.add(input).then(() => undefined)}
      />
    </>
  );
}

function MiniStat({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 font-serif text-2xl tracking-tight tabular-nums">{value}</p>
    </div>
  );
}

function EmptyState({
  signedIn,
  onAdd,
  onSample,
}: {
  signedIn: boolean;
  onAdd: () => void;
  onSample?: () => void;
}) {
  return (
    <div className="mt-4 rounded-xl bg-card px-5 py-10 text-center shadow-[var(--shadow-border)]">
      <h3 className="font-serif text-3xl tracking-tight">Set the first mark</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Name an asset, a target stack, and what you already hold — wallet or typed in.
        Remainder shows the capital left, then a path to fill it.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button onClick={onAdd}>
          <Plus />
          Add target
        </Button>
        {onSample && (
          <Button variant="outline" onClick={onSample}>
            Use sample stack
          </Button>
        )}
      </div>
      {signedIn && (
        <p className="mt-4 text-xs text-muted-foreground">Saved to your account.</p>
      )}
    </div>
  );
}
