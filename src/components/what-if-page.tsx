import { useEffect, useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { formatPercent, formatUsd } from "@/lib/format";
import { fillRatio } from "@/lib/assets";
import { veil } from "@/lib/privacy";
import { useHideAmounts } from "@/hooks/use-hide-amounts";
import type { Holding } from "@/lib/types";
import {
  draftsForHoldings,
  draftFromPrice,
  parseWhatIfPrice,
  readWhatIfActive,
  readWhatIfPrices,
  scenarioForHolding,
  scenarioTotals,
  WHAT_IF_SLOTS,
  writeWhatIfActive,
  writeWhatIfPrices,
  type WhatIfPrices,
  type WhatIfSlot,
} from "@/lib/what-if";
import { usePortfolio } from "@/hooks/use-portfolio";
import { usePrices } from "@/hooks/use-prices";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  onBack: () => void;
};

export function WhatIfPage({ onBack }: Props) {
  const portfolio = usePortfolio();
  const { prices } = usePrices();
  const { hidden: hideAmounts } = useHideAmounts();
  const [slot, setSlot] = useState<WhatIfSlot>(() => readWhatIfActive());
  const [custom, setCustom] = useState<WhatIfPrices>(() => readWhatIfPrices());
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const holdings = portfolio.holdings;
  const meta = WHAT_IF_SLOTS.find((s) => s.id === slot) ?? WHAT_IF_SLOTS[0];

  useEffect(() => {
    setDrafts((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const holding of holdings) {
        const id = holding.coingeckoId;
        if (next[id] != null && next[id] !== "") continue;
        if (custom[id] != null) {
          next[id] = draftFromPrice(custom[id]);
          changed = true;
        } else if (prices[id] != null) {
          next[id] = draftFromPrice(prices[id]);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [holdings, prices, custom]);

  const totals = useMemo(
    () => scenarioTotals(holdings, prices, custom),
    [holdings, prices, custom],
  );

  const chooseSlot = (next: WhatIfSlot) => {
    if (next === slot) return;
    writeWhatIfActive(next);
    const pricesForSlot = readWhatIfPrices(next);
    setSlot(next);
    setCustom(pricesForSlot);
    setDrafts(draftsForHoldings(holdings, pricesForSlot, prices));
  };

  const setDraft = (id: string, raw: string) => {
    setDrafts((prev) => ({ ...prev, [id]: raw }));
    const parsed = parseWhatIfPrice(raw);
    setCustom((prev) => {
      const next = { ...prev };
      if (parsed != null) next[id] = parsed;
      else delete next[id];
      writeWhatIfPrices(next, slot);
      return next;
    });
  };

  const resetToLive = () => {
    writeWhatIfPrices({}, slot);
    setCustom({});
    setDrafts(draftsForHoldings(holdings, {}, prices));
  };

  if (portfolio.isLoading) {
    return (
      <div className="mt-10 space-y-4">
        <Skeleton className="h-12 w-48" />
        <Skeleton className="h-20 w-72" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  const liveHeld = totals.heldLive;
  const hopiumHeld = totals.heldYours;
  const hopiumTarget = totals.targetYours;
  const heldMult = liveHeld > 0 ? hopiumHeld / liveHeld : null;
  const targetMult = totals.targetLive > 0 ? hopiumTarget / totals.targetLive : null;

  return (
    <>
      <section className="mt-8 sm:mt-12">
        <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
          What if these prices hit
        </p>
        <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1 sm:max-w-sm">
          {WHAT_IF_SLOTS.map((item) => {
            const on = item.id === slot;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => chooseSlot(item.id)}
                className={`rounded-md px-3 py-2 text-sm transition-colors ${
                  on ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{meta.blurb}</p>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-serif text-6xl leading-none tracking-tight tabular-nums sm:text-7xl">
            {hideAmounts
              ? targetMult != null
                ? formatMultiple(targetMult)
                : "•••"
              : totals.priced > 0
                ? formatUsd(hopiumTarget)
                : "—"}
          </h1>
          <p className="pb-1 font-mono text-sm text-muted-foreground tabular-nums">
            {hideAmounts
              ? `vs live · ${meta.label}`
              : targetMult != null
                ? `${formatMultiple(targetMult)} vs live · ${meta.label}`
                : `set ${meta.label.toLowerCase()} prices`}
          </p>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <MiniStat
            label={`Held · ${meta.label}`}
            value={totals.priced > 0 ? veil(hideAmounts, formatUsd(hopiumHeld)) : "—"}
          />
          <MiniStat
            label="Held at live"
            value={totals.priced > 0 && liveHeld > 0 ? veil(hideAmounts, formatUsd(liveHeld)) : "—"}
          />
          <MiniStat
            className="col-span-2 sm:col-span-1"
            label="Held multiple"
            value={heldMult != null ? formatMultiple(heldMult) : "—"}
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Two books. Flip between them anytime — each save stays put.
          </p>
          {holdings.length > 0 && (
            <Button variant="outline" onClick={resetToLive}>
              <RotateCcw />
              Reset {meta.label.toLowerCase()} to live
            </Button>
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-2xl tracking-tight">{meta.label} prices</h2>
        {holdings.length === 0 ? (
          <div className="mt-4 rounded-xl bg-card px-5 py-10 text-center shadow-[var(--shadow-border)]">
            <h3 className="font-serif text-3xl tracking-tight">Nothing to stress-test</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Add a target on the ledger first, then come back and punch in the prices you actually want.
            </p>
            <div className="mt-6 flex justify-center">
              <Button onClick={onBack}>Back to ledger</Button>
            </div>
          </div>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {holdings.map((holding) => (
              <WhatIfCard
                key={holding.id}
                holding={holding}
                draft={drafts[holding.coingeckoId] ?? ""}
                live={prices[holding.coingeckoId]}
                custom={custom}
                hideAmounts={hideAmounts}
                onChange={(raw) => setDraft(holding.coingeckoId, raw)}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function WhatIfCard({
  holding,
  draft,
  live,
  custom,
  hideAmounts,
  onChange,
}: {
  holding: Holding;
  draft: string;
  live?: number;
  custom: WhatIfPrices;
  hideAmounts?: boolean;
  onChange: (raw: string) => void;
}) {
  const row = scenarioForHolding(holding, live, custom);
  const ratio = fillRatio(holding.currentAmount, holding.targetAmount);
  return (
    <article className="rounded-xl bg-card p-4 shadow-[var(--shadow-border)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-baseline gap-2">
            <h3 className="font-serif text-2xl tracking-tight">{holding.symbol}</h3>
            <span className="text-sm text-muted-foreground">{holding.name}</span>
          </div>
          <p className="mt-1 font-mono text-sm tabular-nums text-muted-foreground">
            {live != null ? `Live ${formatUsd(live, { precise: true })}` : "Live price pending"}
          </p>
        </div>
        {row.multiple != null && (
          <p className="font-mono text-sm tabular-nums text-muted-foreground">{formatMultiple(row.multiple)}</p>
        )}
      </div>

      <label className="mt-4 block">
        <span className="text-xs tracking-wide text-muted-foreground uppercase">Your price</span>
        <div className="relative mt-1.5">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
            $
          </span>
          <Input
            inputMode="decimal"
            value={draft}
            onChange={(e) => onChange(e.target.value)}
            placeholder={live != null ? draftFromPrice(live) : "0"}
            aria-label={`${holding.symbol} what-if price`}
            className="pl-7 font-mono tabular-nums"
          />
        </div>
      </label>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs tracking-wide text-muted-foreground uppercase">Held now</p>
          <p className="mt-1 font-serif text-2xl tracking-tight tabular-nums">
            {hideAmounts ? formatPercent(ratio) : row.heldYours != null ? formatUsd(row.heldYours) : "—"}
          </p>
          {row.heldLive != null && !hideAmounts && (
            <p className="mt-0.5 font-mono text-xs tabular-nums text-muted-foreground">
              live {formatUsd(row.heldLive)}
            </p>
          )}
        </div>
        <div>
          <p className="text-xs tracking-wide text-muted-foreground uppercase">At target</p>
          <p className="mt-1 font-serif text-2xl tracking-tight tabular-nums">
            {hideAmounts
              ? row.multiple != null
                ? formatMultiple(row.multiple)
                : "•••"
              : row.targetYours != null
                ? formatUsd(row.targetYours)
                : "—"}
          </p>
          {row.targetLive != null && !hideAmounts && (
            <p className="mt-0.5 font-mono text-xs tabular-nums text-muted-foreground">
              live {formatUsd(row.targetLive)}
            </p>
          )}
        </div>
      </div>
    </article>
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

function formatMultiple(ratio: number): string {
  if (!Number.isFinite(ratio) || ratio <= 0) return "—";
  const digits = ratio >= 10 ? 1 : 2;
  return `×${ratio.toFixed(digits)}`;
}
