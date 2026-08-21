import { useEffect, useRef } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  closeTour,
  nextTourStep,
  offerTour,
  prevTourStep,
  readTourSeen,
  startTour,
  TOUR_STEPS,
} from "@/lib/tour";
import { useTour } from "@/hooks/use-tour";
import { Button } from "@/components/ui/button";

export function ProductTour() {
  const { user, isPending } = useCurrentUserState();
  const { mode, step } = useTour();
  const offeredFor = useRef<string | null>(null);

  useEffect(() => {
    if (isPending || !user?.id) return;
    if (readTourSeen(user.id)) return;
    if (offeredFor.current === user.id) return;
    offeredFor.current = user.id;
    const id = window.setTimeout(() => offerTour(), 600);
    return () => window.clearTimeout(id);
  }, [isPending, user?.id]);

  useEffect(() => {
    if (mode === "closed") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeTour(user?.id ?? null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, user?.id]);

  if (mode === "closed") return null;

  const userId = user?.id ?? null;
  const last = step >= TOUR_STEPS.length - 1;
  const copy = TOUR_STEPS[step];

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-background/80 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        className="w-full max-w-md rounded-xl bg-card p-5 shadow-[var(--shadow-border)]"
      >
        {mode === "offer" ? (
          <>
            <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Optional</p>
            <h2 id="tour-title" className="mt-2 font-serif text-3xl tracking-tight">
              60-second walkthrough?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              First sign-in. We’ll show you the ledger, buys, DCA, and the other pages. Skip if you
              already get it — it’s always under your name, top right.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => closeTour(userId)}>
                Not now
              </Button>
              <Button type="button" onClick={startTour}>
                Take the tour
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
              {step + 1} / {TOUR_STEPS.length}
            </p>
            <h2 id="tour-title" className="mt-2 font-serif text-3xl tracking-tight">
              {copy.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{copy.body}</p>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
              <Button type="button" variant="ghost" onClick={() => closeTour(userId)}>
                Skip
              </Button>
              <div className="flex gap-2">
                {step > 0 && (
                  <Button type="button" variant="outline" onClick={prevTourStep}>
                    Back
                  </Button>
                )}
                {last ? (
                  <Button type="button" onClick={() => closeTour(userId)}>
                    Done
                  </Button>
                ) : (
                  <Button type="button" onClick={nextTourStep}>
                    Next
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
