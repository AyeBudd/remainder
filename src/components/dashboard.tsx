import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpDown, Check, Download, Plus, RefreshCw, Search, Upload, Wallet } from "lucide-react";
import { remainingCoins } from "@/lib/assets";
import { downloadLedgerCsv } from "@/lib/export-ledger";
import { formatPercent, formatSignedPercent, formatSignedUsd, formatUpdated, formatUsd } from "@/lib/format";
import { unrealizedPnl } from "@/lib/pnl";
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
import { useHideAmounts } from "@/hooks/use-hide-amounts";
import { veil } from "@/lib/privacy";
import { AddBuyDialog } from "@/components/add-buy-dialog";
import { AddHoldingDialog } from "@/components/add-holding-dialog";
import { ImportCsvDialog } from "@/components/import-csv-dialog";
import { DcaNotices } from "@/components/dca-notices";
import { DcaPanel } from "@/components/dca-panel";
import { HoldingCard } from "@/components/holding-card";
import { WalletDialog } from "@/components/wallet-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const { hidden: hideAmounts } = useHideAmounts();
  const [addOpen, setAddOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<Holding | null>(null);
  const [buying, setBuying] = useState<Holding | null>(null);
  const [dcaId, setDcaId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [sort, setSort] = useState<HoldingSort>(() => readHoldingSort());
  const [query, setQuery] = useState("");

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  const holdings = portfolio.holdings;
  const visibleHoldings = useMemo(() => {
    const sorted = sortHoldings(holdings, prices, sort);
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (h) =>
        h.symbol.toLowerCase().includes(q) ||
        h.name.toLowerCase().includes(q) ||
        h.coingeckoId.toLowerCase().includes(q),
    );
  }, [holdings, prices, sort, query]);

  useEffect(() => {
    if (!holdings.length || !portfolio.plans.length) return;
    if (Object.keys(prices).length < 1) return;
    portfolio.ensureBaselines(prices);
  }, [holdings, prices, portfolio.plans, portfolio.ensureBaselines]);

  useEffect(() => {
    if (!holdings.length) return;
    if (Object.keys(prices).length < 1) return;
    portfolio.ensureCostBasis(prices);
  }, [holdings, prices, portfolio.ensureCostBasis]);

  const chooseSort = (next: HoldingSort) => {
    setSort(next);
    writeHoldingSort(next);
  };

  const totals = useMemo(() => {
    let currentUsd = 0;
    let targetUsd = 0;
    let remainUsd = 0;
    let priced = 0;
    let costUsd = 0;
    let pnlKnown = 0;
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
      const pnl = unrealizedPnl(h.currentAmount, h.costBasisUsd, price);
      if (pnl) {
        costUsd += pnl.cost;
        pnlKnown += 1;
      }
    }
    const fill = targetUsd > 0 ? currentUsd / targetUsd : 0;
    const pnlUsd = pnlKnown > 0 ? currentUsd - costUsd : null;
    const pnlRatio = pnlUsd != null && costUsd > 0 ? pnlUsd / costUsd : null;
    return { currentUsd, targetUsd, remainUsd, priced, fill, slices, pnlUsd, pnlRatio, pnlKnown };
  }, [holdings, prices]);

  const saveHolding = async (input: HoldingInput, id?: string) => {
    const markPrice = prices[input.coingeckoId];
    const payload = markPrice != null ? { ...input, markPrice } : input;
    if (id) await portfolio.update(id, payload);
    else await portfolio.add(payload);
  };

  const applyWallet = async (
    updates: { id: string; walletAmount: number; walletAddress: string }[],
  ) => {
    for (const u of updates) {
      const holding = holdings.find((h) => h.id === u.id);
      const markPrice = holding ? prices[holding.coingeckoId] : undefined;
      await portfolio.update(u.id, {
        walletAmount: u.walletAmount,
        walletAddress: u.walletAddress,
        source: u.walletAmount > 0 ? "wallet" : "manual",
        markPrice,
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
          {hideAmounts ? "Filled toward targets" : "Remaining to hit targets"}
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-serif text-6xl leading-none tracking-tight tabular-nums sm:text-7xl">
            {hideAmounts
              ? formatPercent(totals.fill)
              : totals.priced > 0
                ? formatUsd(totals.remainUsd)
                : "—"}
          </h1>
          {!hideAmounts && (
            <p className="pb-1 font-mono text-sm tabular-nums text-muted-foreground">
              {formatPercent(totals.fill)} filled
            </p>
          )}
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat label="Held" value={totals.priced > 0 ? veil(hideAmounts, formatUsd(totals.currentUsd)) : "—"} />
          <MiniStat
            label="Target value"
            value={totals.priced > 0 ? veil(hideAmounts, formatUsd(totals.targetUsd)) : "—"}
          />
          <MiniStat
            label="Est. P/L"
            value={
              hideAmounts
                ? totals.pnlRatio != null
                  ? formatSignedPercent(totals.pnlRatio)
                  : "—"
                : totals.pnlUsd != null
                  ? formatSignedUsd(totals.pnlUsd)
                  : "—"
            }
            valueClassName={
              totals.pnlUsd == null && totals.pnlRatio == null
                ? undefined
                : (totals.pnlUsd ?? 0) >= 0
                  ? "text-success"
                  : "text-destructive"
            }
            hint={hideAmounts ? "Amounts hidden" : totals.pnlRatio != null ? formatSignedPercent(totals.pnlRatio) : "Type cost on edit"}
          />
          <MiniStat label="Assets" value={String(holdings.length)} />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          P/L uses the cost basis you type on Edit amounts. If you leave it blank, new coins are marked at the live
          price when you save or refresh a wallet. CEX fills are not imported.
        </p>
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
                  title={`${slice.symbol}${hideAmounts ? "" : ` ${formatUsd(slice.remainUsd)}`}`}
                />
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {totals.slices.map((slice) => (
                <span key={slice.id} className="tabular-nums">
                  {slice.symbol}
                  {hideAmounts
                    ? ` ${formatPercent(totals.remainUsd > 0 ? slice.remainUsd / totals.remainUsd : 0)} of remainder`
                    : ` ${formatUsd(slice.remainUsd, { compact: true })}`}
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
                ? `Prices updated ${formatUpdated(updatedAt, now)} · auto every 5 min`
                : "Prices pending"}
          </p>
          <Button
            variant="outline"
            onClick={() => void refresh(true)}
            disabled={refreshing}
            aria-busy={refreshing}
            aria-label="Update prices for the top 250"
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
            {holdings.length > 0 && (
              <Button
                variant="outline"
                onClick={() => downloadLedgerCsv(holdings, portfolio.plans, prices)}
                aria-label="Export holdings as CSV"
              >
                <Download />
                Export CSV
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setImportOpen(true)}
              aria-label="Import holdings from CSV"
            >
              <Upload />
              Import CSV
            </Button>
            <Button variant="outline" onClick={() => setWalletOpen(true)}>
              <Wallet />
              {portfolio.wallets.length > 1 ? `Wallets (${portfolio.wallets.length})` : "Wallets"}
            </Button>
            <Button onClick={() => setAddOpen(true)}>
              <Plus />
              Add target
            </Button>
          </div>
        </div>

        {holdings.length > 1 && (
          <div className="relative mt-4 max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search bags — AVAX, solana…"
              aria-label="Search holdings"
              className="pl-9"
            />
          </div>
        )}

        <DcaNotices holdings={holdings} plans={portfolio.plans} prices={prices} />

        {holdings.length === 0 ? (
          <EmptyState
            signedIn={portfolio.signedIn}
            onAdd={() => setAddOpen(true)}
            onImport={() => setImportOpen(true)}
            onSample={
              portfolio.signedIn
                ? undefined
                : () => {
                    portfolio.loadSample();
                  }
            }
          />
        ) : visibleHoldings.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No bags match “{query.trim()}”. Clear search to see the full list.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {visibleHoldings.map((holding) => (
              <HoldingCard
                key={holding.id}
                holding={holding}
                plan={portfolio.plans.find((p) => p.holdingId === holding.id)}
                price={prices[holding.coingeckoId]}
                change={changes?.[holding.coingeckoId]}
                hideAmounts={hideAmounts}
                onEdit={() => setEditing(holding)}
                onBuy={() => setBuying(holding)}
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
          hideAmounts={hideAmounts}
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
      <AddBuyDialog
        open={Boolean(buying)}
        holding={buying}
        price={buying ? prices[buying.coingeckoId] : undefined}
        onOpenChange={(open) => {
          if (!open) setBuying(null);
        }}
        onSave={async (patch) => {
          if (!buying) return;
          await portfolio.update(buying.id, patch);
        }}
      />
      <ImportCsvDialog
        open={importOpen}
        holdings={holdings}
        assets={assets}
        prices={prices}
        onOpenChange={setImportOpen}
        onAdd={portfolio.add}
        onUpdate={portfolio.update}
        onPlan={portfolio.savePlan}
      />
      <WalletDialog
        open={walletOpen}
        onOpenChange={setWalletOpen}
        holdings={holdings}
        wallets={portfolio.wallets}
        onAddWallet={(address) => portfolio.addWallet(address).then(() => undefined)}
        onRemoveWallet={(address) => portfolio.removeWallet(address).then(() => undefined)}
        onApply={applyWallet}
        onAddFromWallet={(input) =>
          portfolio.add({ ...input, markPrice: prices[input.coingeckoId] }).then(() => undefined)
        }
      />
    </>
  );
}

function MiniStat({
  label,
  value,
  className,
  valueClassName,
  hint,
}: {
  label: string;
  value: string;
  className?: string;
  valueClassName?: string;
  hint?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className={`mt-1 font-serif text-2xl tracking-tight tabular-nums ${valueClassName ?? ""}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function EmptyState({
  signedIn,
  onAdd,
  onImport,
  onSample,
}: {
  signedIn: boolean;
  onAdd: () => void;
  onImport: () => void;
  onSample?: () => void;
}) {
  return (
    <div className="mt-4 rounded-xl bg-card px-5 py-10 text-center shadow-[var(--shadow-border)]">
      <h3 className="font-serif text-3xl tracking-tight">Set the first mark</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Name an asset, a target stack, and what you already hold — wallet or typed in.
        Remaindr shows the capital left, then a path to fill it.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button onClick={onAdd}>
          <Plus />
          Add target
        </Button>
        <Button variant="outline" onClick={onImport}>
          <Upload />
          Import CSV
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
