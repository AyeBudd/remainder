import { useState } from "react";
import { TriangleAlert, TrendingUp } from "lucide-react";
import { captureBaseline } from "@/lib/dca";
import {
  daysCopy,
  evaluatePlanPace,
  prettyDate,
  SLIP_THRESHOLD,
  type PaceFix,
  type PlanPace,
} from "@/lib/dca-pace";
import { formatCoins } from "@/lib/format";
import { veil } from "@/lib/privacy";
import type { DcaPlan, Holding, HoldingInput, PriceMap } from "@/lib/types";

function disclaimer(threshold = SLIP_THRESHOLD) {
  return `A ${Math.round(threshold * 100)}% change in estimated time to target from when the plan was originally set will trigger this. Figures are planning math from your target, holdings, cadence, and the price used — not financial advice.`;
}

type ApplyArgs = {
  holdingId: string;
  patch?: Partial<HoldingInput>;
  plan: DcaPlan;
};

export function DcaNotices({
  holdings,
  plans,
  prices,
  hideAmounts,
  onApply,
}: {
  holdings: Holding[];
  plans: DcaPlan[];
  prices: PriceMap;
  hideAmounts?: boolean;
  onApply?: (args: ApplyArgs) => Promise<void>;
}) {
  const reports = plans
    .map((plan) => {
      const holding = holdings.find((h) => h.id === plan.holdingId);
      if (!holding) return null;
      const pace = evaluatePlanPace(holding, plan, prices);
      return { plan, holding, pace };
    })
    .filter((n): n is { plan: DcaPlan; holding: Holding; pace: PlanPace } => n != null);

  const notable = reports.filter(
    (r) => r.pace.status === "slipping" || r.pace.status === "ahead" || r.pace.status === "overdue",
  );
  const onTrack = reports.filter((r) => r.pace.status === "on-track");

  if (reports.length === 0) return null;

  return (
    <div className="mt-6 space-y-3">
      {notable.map(({ plan, holding, pace }) => (
        <PaceCard
          key={plan.id}
          holding={holding}
          plan={plan}
          pace={pace}
          hideAmounts={hideAmounts}
          prices={prices}
          onApply={onApply}
        />
      ))}
      {onTrack.map(({ plan, holding, pace }) => {
        const early = pace.daysDelta != null && pace.daysDelta < 0 ? daysCopy(pace.daysDelta) : null;
        return (
          <div key={plan.id} className="rounded-lg bg-success/15 px-4 py-3 text-success">
            <p className="text-sm font-medium">
              {holdings.length > 1 ? `${holding.symbol} · ` : ""}
              On track
              {early ? ` — you're currently projected to reach your target ${early}` : ""}.
            </p>
          </div>
        );
      })}
      {notable.length > 0 && (
        <p className="text-xs leading-relaxed text-muted-foreground">{disclaimer()}</p>
      )}
    </div>
  );
}

function PaceCard({
  holding,
  plan,
  pace,
  hideAmounts,
  prices,
  onApply,
}: {
  holding: Holding;
  plan: DcaPlan;
  pace: PlanPace;
  hideAmounts?: boolean;
  prices: PriceMap;
  onApply?: (args: ApplyArgs) => Promise<void>;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const slipping = pace.status === "slipping" || pace.status === "overdue";
  const Icon = slipping ? TriangleAlert : TrendingUp;
  const kicker = slipping ? "Plan slipping" : "Ahead of plan";
  const headline =
    pace.status === "overdue"
      ? `${holding.symbol} plan is past the date`
      : pace.status === "ahead"
        ? `You're ahead on ${holding.symbol}`
        : `Your ${holding.symbol} target is slipping`;
  const sub = daysCopy(pace.daysDelta);
  const originalCoins = `${formatCoins(pace.originalTarget, holding.symbol)} ${holding.symbol}`;

  const apply = async (fix: PaceFix) => {
    if (!onApply) return;
    setBusy(fix.id);
    try {
      const nextDate = fix.targetDate ?? plan.targetDate;
      const nextTarget = fix.targetAmount ?? holding.targetAmount;
      const nextHolding = { ...holding, targetAmount: nextTarget };
      const snap = captureBaseline(
        nextHolding,
        { targetDate: nextDate, frequency: plan.frequency, assumedPrice: plan.assumedPrice },
        prices,
      );
      await onApply({
        holdingId: holding.id,
        patch: fix.id === "target" ? { targetAmount: nextTarget } : undefined,
        plan: {
          ...plan,
          targetDate: nextDate,
          ...snap,
        },
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <article
      className={
        slipping
          ? "rounded-xl bg-destructive/12 px-4 py-4 text-foreground shadow-[var(--shadow-border)] sm:px-5"
          : "rounded-xl bg-success/12 px-4 py-4 text-foreground shadow-[var(--shadow-border)] sm:px-5"
      }
    >
      <p className="flex items-center gap-2 text-xs tracking-[0.18em] text-muted-foreground uppercase">
        <Icon className={slipping ? "size-3.5 text-destructive" : "size-3.5 text-success"} strokeWidth={2} />
        {kicker}
      </p>
      <h3 className="mt-1 font-serif text-2xl tracking-tight">{headline}</h3>
      {sub && (
        <p className="mt-1 text-sm text-muted-foreground">
          Your current pace puts you approximately {sub}.
        </p>
      )}

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-xs tracking-wide text-muted-foreground uppercase">Original target</dt>
          <dd className="mt-1 font-mono text-sm tabular-nums">
            {hideAmounts ? veil(true, originalCoins) : originalCoins} by {prettyDate(pace.originalDate)}
          </dd>
        </div>
        <div>
          <dt className="text-xs tracking-wide text-muted-foreground uppercase">Current projection</dt>
          <dd className="mt-1 font-mono text-sm tabular-nums">
            {pace.projectedDate ? prettyDate(pace.projectedDate) : "—"}
          </dd>
        </div>
      </dl>

      {pace.fixes.length > 0 && (
        <div className="mt-4">
          <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
            {slipping ? "Get back on track" : "Use the extra room"}
          </p>
          <ul className="mt-2 grid gap-2">
            {pace.fixes.map((fix) => (
              <li key={fix.id}>
                <button
                  type="button"
                  disabled={Boolean(busy) || !onApply}
                  onClick={() => void apply(fix)}
                  aria-label={`${fix.title}. ${fix.summary}. ${fix.detail}`}
                  className={`min-h-11 w-full rounded-lg px-3 py-3 text-left transition-colors ${
                    fix.primary
                      ? "bg-secondary shadow-[var(--shadow-border)] hover:shadow-[var(--shadow-border-hover)]"
                      : "bg-background/30 hover:bg-secondary/70"
                  }`}
                >
                  <p className="text-sm font-medium">{busy === fix.id ? "Updating…" : fix.title}</p>
                  <p className="mt-1 font-mono text-base tabular-nums">
                    {hideAmounts ? veil(true, fix.summary) : fix.summary}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{fix.detail}</p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}

export { disclaimer as DCA_ETA_DISCLAIMER };
