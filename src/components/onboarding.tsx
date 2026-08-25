import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { ASSETS, type Asset } from "@/lib/assets";
import { captureBaseline, frequencyNoun, quoteDca } from "@/lib/dca";
import { prettyDate } from "@/lib/dca-pace";
import { formatCoins, formatUsd } from "@/lib/format";
import {
  ONBOARDING_STEPS,
  FEATURED_SYMBOLS,
  buildOnboardingPayload,
  clampStep,
  emptyDraft,
  prefillCurrent,
  type OnboardingDraft,
} from "@/lib/onboarding";
import type { DcaPlanInput, Holding, HoldingInput, PriceMap } from "@/lib/types";
import { writeJustOnboarded } from "@/hooks/use-onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  assets?: Asset[];
  prices: PriceMap;
  holdings: Holding[];
  draft: OnboardingDraft;
  onDraft: (draft: OnboardingDraft) => void;
  onSkip: () => void;
  onSample?: () => void;
  onCreate: (holding: HoldingInput, plan: DcaPlanInput | null) => Promise<void>;
};

export function Onboarding({
  assets = ASSETS,
  prices,
  holdings,
  draft,
  onDraft,
  onSkip,
  onSample,
  onCreate,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [other, setOther] = useState(false);

  const asset =
    assets.find((a) => a.coingeckoId === draft.coingeckoId) ??
    assets.find((a) => a.symbol === draft.symbol) ??
    null;
  const price = asset ? prices[asset.coingeckoId] : null;
  const featured = FEATURED_SYMBOLS.map((sym) => assets.find((a) => a.symbol === sym)).filter(
    (a): a is Asset => a != null,
  );

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = assets.filter((a) => {
      if (!q) return true;
      return (
        a.symbol.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.coingeckoId.includes(q)
      );
    });
    return list.slice(0, 24);
  }, [assets, query]);

  const go = (patch: Partial<OnboardingDraft>) => {
    setError(null);
    onDraft({ ...draft, ...patch });
  };

  const chooseAsset = (next: Asset) => {
    const withAsset: OnboardingDraft = {
      ...draft,
      symbol: next.symbol,
      name: next.name,
      coingeckoId: next.coingeckoId,
      step: 2,
    };
    onDraft(prefillCurrent(withAsset, holdings));
    setOther(false);
    setError(null);
  };

  const payload = buildOnboardingPayload(draft, price ?? null);
  const usdPerBuy =
    payload.ok && payload.value.plan
      ? quoteDca(
          {
            id: "draft",
            costBasisUsd: null,
            ...payload.value.holding,
          },
          payload.value.plan,
          prices,
        ).usdPerBuy
      : null;

  const submit = async () => {
    if (!payload.ok) {
      setError(payload.error);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const plan = payload.value.plan
        ? ({
            holdingId: "",
            ...payload.value.plan,
            ...captureBaseline(
              { id: "draft", costBasisUsd: null, ...payload.value.holding },
              payload.value.plan,
              prices,
            ),
          } satisfies DcaPlanInput)
        : null;
      writeJustOnboarded({
        symbol: payload.value.holding.symbol,
        current: payload.value.currentCoins,
        target: payload.value.targetCoins,
        remaining: payload.value.remaining,
        targetDate: payload.value.plan?.targetDate ?? null,
        usdPerBuy,
      });
      await onCreate(payload.value.holding, plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the plan.");
    } finally {
      setBusy(false);
    }
  };

  const step = clampStep(draft.step);

  return (
    <section className="mx-auto w-full max-w-lg pt-6 sm:pt-10">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
          {step} / {ONBOARDING_STEPS}
        </p>
        <button type="button" onClick={onSkip} className="min-h-11 text-sm text-muted-foreground hover:text-foreground">
          Do this later
        </button>
      </div>
      <div className="mt-3 flex gap-1" aria-hidden="true">
        {Array.from({ length: ONBOARDING_STEPS }, (_, i) => (
          <span
            key={i}
            className={i < step ? "h-1 flex-1 rounded-full bg-foreground" : "h-1 flex-1 rounded-full bg-secondary"}
          />
        ))}
      </div>

      {step > 1 && (
        <button
          type="button"
          onClick={() => go({ step: clampStep(step - 1) })}
          className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back
        </button>
      )}

      {step === 1 && (
        <div className="mt-6">
          <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">What are you working toward?</h1>
          <p className="mt-2 text-sm text-muted-foreground">Pick the bag. You can add more later.</p>
          <div className="mt-6 grid grid-cols-3 gap-2">
            {featured.map((a) => (
              <button
                key={a.symbol}
                type="button"
                onClick={() => chooseAsset(a)}
                className="min-h-24 rounded-xl bg-card px-3 py-4 text-center shadow-[var(--shadow-border)] transition-shadow hover:shadow-[var(--shadow-border-hover)]"
              >
                <p className="font-serif text-2xl tracking-tight">{a.symbol}</p>
                <p className="mt-1 text-xs text-muted-foreground">{a.name}</p>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setOther((v) => !v)}
            className="mt-3 min-h-14 w-full rounded-xl bg-secondary px-3 text-sm"
          >
            Other
          </button>
          {other && (
            <div className="mt-4">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search — AVAX, solana…"
                aria-label="Search assets"
                autoFocus
              />
              <ul className="mt-2 max-h-64 overflow-y-auto rounded-xl bg-card shadow-[var(--shadow-border)]">
                {matches.map((a) => (
                  <li key={a.coingeckoId}>
                    <button
                      type="button"
                      onClick={() => chooseAsset(a)}
                      className="flex min-h-11 w-full items-center justify-between px-4 text-left text-sm hover:bg-secondary/70"
                    >
                      <span className="font-medium">{a.symbol}</span>
                      <span className="text-muted-foreground">{a.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {onSample && (
            <p className="mt-8 text-center text-sm text-muted-foreground">
              <button type="button" onClick={onSample} className="underline-offset-4 hover:underline">
                See a sample stack instead
              </button>
            </p>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="mt-6">
          <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">What’s your goal?</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {draft.symbol ?? "The asset"} — amount of the coin, or a dollar value at the live price.
          </p>
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() => go({ goalMode: "coins" })}
              className={
                draft.goalMode === "coins"
                  ? "min-h-11 rounded-md bg-secondary px-4 text-sm"
                  : "min-h-11 rounded-md px-4 text-sm text-muted-foreground"
              }
            >
              Coins
            </button>
            <button
              type="button"
              onClick={() => go({ goalMode: "usd" })}
              className={
                draft.goalMode === "usd"
                  ? "min-h-11 rounded-md bg-secondary px-4 text-sm"
                  : "min-h-11 rounded-md px-4 text-sm text-muted-foreground"
              }
            >
              Dollar value
            </button>
          </div>
          <div className="mt-6">
            <Input
              value={draft.goalValue}
              onChange={(e) => go({ goalValue: e.target.value })}
              inputMode="decimal"
              placeholder={draft.goalMode === "usd" ? "100000" : "1"}
              aria-label={draft.goalMode === "usd" ? "Target in dollars" : "Target in coins"}
              className="h-16 font-serif text-4xl"
              autoFocus
            />
            <p className="mt-2 text-sm text-muted-foreground">
              {draft.goalMode === "usd"
                ? price
                  ? `≈ ${formatCoins(Number(draft.goalValue.replace(/,/g, "")) / price || 0, draft.symbol ?? "")} ${draft.symbol} at ${formatUsd(price, { precise: true })}`
                  : "Waiting on a live price to convert."
                : draft.symbol
                  ? `${draft.symbol}`
                  : ""}
            </p>
          </div>
          <Button className="mt-8 w-full" disabled={!draft.goalValue.trim()} onClick={() => go({ step: 3 })}>
            Continue
          </Button>
        </div>
      )}

      {step === 3 && (
        <div className="mt-6">
          <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">How much do you already have?</h1>
          <p className="mt-2 text-sm text-muted-foreground">Zero is fine. This is the starting stack.</p>
          <Input
            value={draft.current}
            onChange={(e) => go({ current: e.target.value })}
            inputMode="decimal"
            placeholder="0"
            aria-label="Current holdings"
            className="mt-6 h-16 font-serif text-4xl"
            autoFocus
          />
          <p className="mt-2 text-sm text-muted-foreground">{draft.symbol}</p>
          <Button className="mt-8 w-full" onClick={() => go({ step: 4 })}>
            Continue
          </Button>
        </div>
      )}

      {step === 4 && (
        <div className="mt-6">
          <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">When do you want to get there?</h1>
          <p className="mt-2 text-sm text-muted-foreground">A date gives you a weekly number. No deadline still tracks the bag.</p>
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() => go({ deadlineMode: "date" })}
              className={
                draft.deadlineMode === "date"
                  ? "min-h-11 rounded-md bg-secondary px-4 text-sm"
                  : "min-h-11 rounded-md px-4 text-sm text-muted-foreground"
              }
            >
              Specific date
            </button>
            <button
              type="button"
              onClick={() => go({ deadlineMode: "none", step: 5 })}
              className={
                draft.deadlineMode === "none"
                  ? "min-h-11 rounded-md bg-secondary px-4 text-sm"
                  : "min-h-11 rounded-md px-4 text-sm text-muted-foreground"
              }
            >
              No deadline
            </button>
          </div>
          {draft.deadlineMode === "date" && (
            <>
              <Input
                type="date"
                value={draft.targetDate}
                onChange={(e) => go({ targetDate: e.target.value })}
                className="mt-6"
                aria-label="Target date"
              />
              <Button className="mt-8 w-full" onClick={() => go({ step: 5 })}>
                Continue
              </Button>
            </>
          )}
        </div>
      )}

      {step === 5 && (
        <div className="mt-6">
          <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">Your target</h1>
          {!payload.ok ? (
            <p className="mt-4 text-sm text-destructive">{payload.error}</p>
          ) : (
            <dl className="mt-6 space-y-4">
              <div>
                <dt className="text-xs tracking-wide text-muted-foreground uppercase">Target</dt>
                <dd className="mt-1 font-serif text-4xl tracking-tight tabular-nums">
                  {formatCoins(payload.value.targetCoins, draft.symbol ?? "")} {draft.symbol}
                </dd>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-xs tracking-wide text-muted-foreground uppercase">Current</dt>
                  <dd className="mt-1 font-mono text-sm tabular-nums">
                    {formatCoins(payload.value.currentCoins, draft.symbol ?? "")} {draft.symbol}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs tracking-wide text-muted-foreground uppercase">Remaining</dt>
                  <dd className="mt-1 font-mono text-sm tabular-nums">
                    {formatCoins(payload.value.remaining, draft.symbol ?? "")} {draft.symbol}
                  </dd>
                </div>
              </div>
              <div>
                <dt className="text-xs tracking-wide text-muted-foreground uppercase">Target date</dt>
                <dd className="mt-1 text-sm">
                  {payload.value.plan ? prettyDate(payload.value.plan.targetDate) : "No deadline"}
                </dd>
              </div>
              {payload.value.plan && (
                <div>
                  <dt className="text-xs tracking-wide text-muted-foreground uppercase">
                    Estimated per {frequencyNoun(payload.value.plan.frequency)}
                  </dt>
                  <dd className="mt-1 font-serif text-3xl tracking-tight tabular-nums">
                    {usdPerBuy != null ? formatUsd(usdPerBuy, { precise: usdPerBuy < 100 }) : "—"}
                  </dd>
                </div>
              )}
            </dl>
          )}
          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
          <Button className="mt-8 w-full" disabled={!payload.ok || busy} onClick={() => void submit()}>
            {busy ? "Creating…" : "Create my plan"}
          </Button>
        </div>
      )}
    </section>
  );
}

export { emptyDraft };
