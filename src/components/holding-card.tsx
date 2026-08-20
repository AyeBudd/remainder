import { useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { MoreHorizontal, Route } from "lucide-react";
import { fillRatio, remainingCoins } from "@/lib/assets";
import { formatCoins, formatPercent, formatSignedPercent, formatSignedUsd, formatUsd } from "@/lib/format";
import { veil } from "@/lib/privacy";
import { unrealizedPnl } from "@/lib/pnl";
import type { DcaPlan, Holding } from "@/lib/types";
import { Change24 } from "@/components/change-24";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";

type Props = {
  holding: Holding;
  plan?: DcaPlan;
  price?: number;
  change?: number;
  onEdit: () => void;
  onBuy: () => void;
  onPlan: () => void;
  onDelete: () => void;
  hideAmounts?: boolean;
};

export function HoldingCard({ holding, plan, price, change, onEdit, onBuy, onPlan, onDelete, hideAmounts }: Props) {
  const navigate = useNavigate();
  const skipNav = useRef(false);
  const remain = remainingCoins(holding.currentAmount, holding.targetAmount);
  const ratio = fillRatio(holding.currentAmount, holding.targetAmount);
  const currentUsd = price != null ? holding.currentAmount * price : null;
  const remainUsd = price != null ? remain * price : null;
  const met = remain <= 0;
  const pnl = unrealizedPnl(holding.currentAmount, holding.costBasisUsd, price);
  const surplusUsd =
    met && currentUsd != null && price != null
      ? currentUsd - holding.targetAmount * price
      : 0;

  const holdNav = () => {
    skipNav.current = true;
    window.setTimeout(() => {
      skipNav.current = false;
    }, 400);
  };

  const openAsset = () => {
    if (skipNav.current) return;
    void navigate({ to: "/asset/$id", params: { id: holding.coingeckoId } });
  };

  const run = (fn: () => void) => (event: Event) => {
    event.preventDefault();
    holdNav();
    fn();
  };

  return (
    <article
      role="link"
      tabIndex={0}
      aria-label={`${holding.symbol} market`}
      onClick={openAsset}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openAsset();
        }
      }}
      className={
        met
          ? "cursor-pointer rounded-xl bg-success/20 p-4 outline outline-1 outline-success/45 transition-colors hover:bg-success/25 sm:p-5"
          : "cursor-pointer rounded-xl bg-card p-4 shadow-[var(--shadow-border)] transition-colors hover:bg-secondary/40 sm:p-5"
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-baseline gap-2">
            <h3 className="font-serif text-2xl tracking-tight">{holding.symbol}</h3>
            <span className="text-sm text-muted-foreground">{holding.name}</span>
          </div>
          <Change24 change={change} className="mt-1" />
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {met && <Badge variant="success">Target Hit</Badge>}
            <Badge variant={holding.source === "manual" ? "default" : "success"}>
              {holding.source === "mixed" ? "Wallet + typed" : holding.source === "wallet" ? "Wallet" : "Manual"}
            </Badge>
            {plan && (
              <Badge variant="outline">
                DCA {plan.frequency} to {plan.targetDate}
              </Badge>
            )}
          </div>
        </div>
        <DropdownMenu
          onOpenChange={(open) => {
            if (!open) holdNav();
          }}
        >
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Actions for ${holding.symbol}`}
              onClick={(e) => {
                e.stopPropagation();
                holdNav();
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            onCloseAutoFocus={(e) => e.preventDefault()}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <DropdownMenuItem onSelect={run(onEdit)}>Edit amounts</DropdownMenuItem>
            <DropdownMenuItem onSelect={run(onBuy)}>Add buy</DropdownMenuItem>
            <DropdownMenuItem onSelect={run(onPlan)}>Plan DCA</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onSelect={run(onDelete)}>
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-5 flex items-end justify-between gap-3">
        <p className="font-mono text-sm tabular-nums text-muted-foreground">
          {hideAmounts ? (
            <span className="text-foreground">{formatPercent(ratio)} of target</span>
          ) : (
            <>
              <span className="text-foreground">{formatCoins(holding.currentAmount, holding.symbol)}</span>
              {" / "}
              {formatCoins(holding.targetAmount, holding.symbol)} {holding.symbol}
            </>
          )}
        </p>
        <p className="font-mono text-sm tabular-nums">{formatPercent(ratio)}</p>
      </div>
      <Progress
        className={met ? "mt-2 bg-success/25" : "mt-2"}
        indicatorClassName={met ? "bg-success" : undefined}
        value={Math.min(100, ratio * 100)}
      />

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          {met ? (
            <>
              <p className="text-xs tracking-wide text-success uppercase">Complete</p>
              <p className="font-serif text-3xl tracking-tight text-success">Target Hit</p>
              {surplusUsd > 0.009 && !hideAmounts && (
                <p className="mt-1 text-sm tabular-nums text-success/80">
                  {formatUsd(surplusUsd)} over target
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-xs tracking-wide text-muted-foreground uppercase">
                {hideAmounts ? "Progress" : "Capital remaining"}
              </p>
              <p className="font-serif text-3xl tracking-tight tabular-nums">
                {hideAmounts
                  ? formatPercent(ratio)
                  : remainUsd != null
                    ? formatUsd(remainUsd)
                    : `${formatCoins(remain, holding.symbol)} ${holding.symbol}`}
              </p>
            </>
          )}
          {currentUsd != null && !hideAmounts && (
            <p className="mt-1 text-sm text-muted-foreground tabular-nums">
              {formatUsd(currentUsd, { precise: true })} held
              {price != null ? ` at ${formatUsd(price, { precise: true })}` : ""}
            </p>
          )}
          {pnl && (
            <p
              className={`mt-1 font-mono text-sm tabular-nums ${pnl.usd >= 0 ? "text-success" : "text-destructive"}`}
            >
              {hideAmounts
                ? pnl.ratio != null
                  ? formatSignedPercent(pnl.ratio)
                  : veil(true, "")
                : `${formatSignedUsd(pnl.usd, { precise: true })}${
                    pnl.ratio != null ? ` (${formatSignedPercent(pnl.ratio)})` : ""
                  }`}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onPlan();
          }}
        >
          <Route />
          Plan path
        </Button>
      </div>
    </article>
  );
}
