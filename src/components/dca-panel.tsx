import { useEffect, useMemo, useState } from "react";
import { captureBaseline, defaultTargetDate, frequencyNoun, hasBaseline, quoteDca, sameSchedule } from "@/lib/dca";
import { DcaChart } from "@/components/dca-chart";
import { formatCoins, formatUsd, parseAmount } from "@/lib/format";
import type { DcaFrequency, DcaPlan, Holding, PriceMap } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const FREQUENCIES: { id: DcaFrequency; label: string }[] = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "biweekly", label: "Biweekly" },
  { id: "monthly", label: "Monthly" },
];

type Props = {
  holdings: Holding[];
  plans: DcaPlan[];
  prices: PriceMap;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onSave: (input: {
    holdingId: string;
    targetDate: string;
    frequency: DcaFrequency;
    assumedPrice: number | null;
  }) => Promise<void>;
  onClear: (planId: string) => Promise<void>;
};

export function DcaPanel({ holdings, plans, prices, selectedId, onSelect, onSave, onClear }: Props) {
  const holding = holdings.find((h) => h.id === selectedId) ?? holdings[0] ?? null;
  const existing = holding ? plans.find((p) => p.holdingId === holding.id) : undefined;

  const [targetDate, setTargetDate] = useState(existing?.targetDate ?? defaultTargetDate());
  const [frequency, setFrequency] = useState<DcaFrequency>(existing?.frequency ?? "weekly");
  const [assumed, setAssumed] = useState(existing?.assumedPrice != null ? String(existing.assumedPrice) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!holding) return;
    setTargetDate(existing?.targetDate ?? defaultTargetDate());
    setFrequency(existing?.frequency ?? "weekly");
    setAssumed(existing?.assumedPrice != null ? String(existing.assumedPrice) : "");
    setError(null);
    // holding/existing objects are keyed by id
  }, [holding?.id, existing?.id]);

  const quote = useMemo(() => {
    if (!holding) return null;
    const assumedPrice = assumed.trim() === "" ? null : parseAmount(assumed);
    return quoteDca(
      holding,
      {
        targetDate,
        frequency,
        assumedPrice: assumedPrice && assumedPrice > 0 ? assumedPrice : null,
      },
      prices,
    );
  }, [holding, targetDate, frequency, assumed, prices]);

  if (!holding) {
    return (
      <section className="rounded-xl bg-card p-6 shadow-[var(--shadow-border)]">
        <h2 className="font-serif text-2xl tracking-tight">DCA path</h2>
        <p className="mt-2 text-sm text-muted-foreground">Add a target first, then set a date to fill it.</p>
      </section>
    );
  }

  const save = async () => {
    setError(null);
    const assumedPrice = assumed.trim() === "" ? null : parseAmount(assumed);
    if (assumed.trim() !== "" && (assumedPrice == null || assumedPrice <= 0)) {
      setError("Assumed price must be a positive number, or left blank for live price.");
      return;
    }
    setBusy(true);
    try {
      await onSave({
        holdingId: holding.id,
        targetDate,
        frequency,
        assumedPrice,
        ...(existing &&
        hasBaseline(existing) &&
        sameSchedule(existing, { targetDate, frequency, assumedPrice })
          ? {
              baselineAt: existing.baselineAt,
              baselineDays: existing.baselineDays,
              baselineUsdPerBuy: existing.baselineUsdPerBuy,
              baselinePrice: existing.baselinePrice,
              baselineRemaining: existing.baselineRemaining,
            }
          : captureBaseline(holding, { targetDate, frequency, assumedPrice }, prices)),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save plan");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-xl bg-card p-5 shadow-[var(--shadow-border)] sm:p-6" id="dca">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl tracking-tight">DCA path</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Split the remaining stack across a schedule. Prices move — this is a plan, not a promise.
          </p>
        </div>
        {holdings.length > 1 && (
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Asset</span>
            <select
              className="h-11 rounded-md bg-secondary px-3 text-foreground shadow-[var(--shadow-border)]"
              value={holding.id}
              onChange={(e) => {
                onSelect(e.target.value);
              }}
            >
              {holdings.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.symbol}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="dca-date">Hit target by</Label>
          <Input
            id="dca-date"
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            suppressHydrationWarning
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dca-price">Assumed price (optional)</Label>
          <Input
            id="dca-price"
            inputMode="decimal"
            value={assumed}
            onChange={(e) => setAssumed(e.target.value)}
            placeholder={quote?.priceUsed ? `Live ${formatUsd(quote.priceUsed, { precise: true })}` : "Live price"}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Cadence</Label>
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
            {FREQUENCIES.map((freq) => (
              <button
                key={freq.id}
                type="button"
                onClick={() => setFrequency(freq.id)}
                className={`h-11 rounded-md px-2 text-sm transition-colors ${
                  frequency === freq.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-foreground hover:bg-secondary/70"
                }`}
              >
                {freq.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {quote && (
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Stat
            label={`Per ${frequencyNoun(frequency)}`}
            value={
              quote.alreadyMet
                ? "Target met"
                : quote.pastDue
                  ? "Pick a future date"
                  : quote.usdPerBuy != null
                    ? formatUsd(quote.usdPerBuy, { precise: true })
                    : `${formatCoins(quote.coinsPerBuy, holding.symbol)} ${holding.symbol}`
            }
            hint={
              !quote.alreadyMet && !quote.pastDue
                ? `${formatCoins(quote.coinsPerBuy, holding.symbol)} ${holding.symbol}`
                : undefined
            }
          />
          <Stat
            label="Buys remaining"
            value={quote.alreadyMet || quote.pastDue ? "—" : String(quote.periods)}
            hint={quote.remainingUsd != null ? `${formatUsd(quote.remainingUsd)} left` : undefined}
          />
          <Stat
            label="Price used"
            value={quote.priceUsed != null ? formatUsd(quote.priceUsed, { precise: true }) : "Unavailable"}
            hint={quote.usedAssumedPrice ? "Assumed" : "Live"}
          />
        </div>
      )}

      {quote && quote.series.length > 1 && (
        <DcaChart series={quote.series} milestones={quote.milestones} symbol={holding.symbol} />
      )}
      {quote && quote.series.length <= 1 && !quote.alreadyMet && (
        <p className="mt-6 text-sm text-muted-foreground">
          {quote.pastDue
            ? "Pick a date after today to plot the path."
            : "Set a target date to see the DCA graph."}
        </p>
      )}

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      <div className="mt-5 flex flex-wrap gap-2">
        <Button type="button" onClick={() => void save()} disabled={busy}>
          {busy ? "Saving…" : existing ? "Update plan" : "Save plan"}
        </Button>
        {existing && (
          <Button type="button" variant="ghost" onClick={() => void onClear(existing.id)}>
            Clear plan
          </Button>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg bg-secondary/70 px-4 py-3">
      <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 font-serif text-2xl tracking-tight tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
