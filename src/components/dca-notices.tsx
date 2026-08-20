import { assessDcaPace } from "@/lib/dca";
import type { DcaPlan, Holding, PriceMap } from "@/lib/types";

const DISCLAIMER =
  "A 25% change in estimated time to target from when the plan was originally set will trigger this warning.";

export function DcaNotices({
  holdings,
  plans,
  prices,
}: {
  holdings: Holding[];
  plans: DcaPlan[];
  prices: PriceMap;
}) {
  const notices = plans
    .map((plan) => {
      const holding = holdings.find((h) => h.id === plan.holdingId);
      if (!holding) return null;
      const pace = assessDcaPace(holding, plan, prices);
      if (pace.status === "unknown" || pace.status === "met") return null;
      return { plan, holding, pace };
    })
    .filter((n): n is NonNullable<typeof n> => n != null);

  if (notices.length === 0 && plans.length === 0) return null;

  return (
    <div className="mt-6 space-y-2">
      {notices.map(({ plan, holding, pace }) => {
        const off = pace.status === "off-track";
        return (
          <div
            key={plan.id}
            className={
              off
                ? "rounded-lg bg-destructive/15 px-4 py-3 text-destructive"
                : "rounded-lg bg-success/15 px-4 py-3 text-success"
            }
          >
            <p className="text-sm font-medium">
              {holdings.length > 1 ? `${holding.symbol} · ` : ""}
              {off
                ? "Recommend re-evaluating DCA due to price change"
                : "Current DCA plan on schedule"}
            </p>
          </div>
        );
      })}
      {plans.length > 0 && (
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {DISCLAIMER} Planning check only — not financial advice.
        </p>
      )}
    </div>
  );
}

export { DISCLAIMER as DCA_ETA_DISCLAIMER };
