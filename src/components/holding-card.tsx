import { MoreHorizontal, Route } from "lucide-react";
import { fillRatio, remainingCoins } from "@/lib/assets";
import { formatCoins, formatPercent, formatUsd } from "@/lib/format";
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
  onPlan: () => void;
  onDelete: () => void;
};

export function HoldingCard({ holding, plan, price, change, onEdit, onPlan, onDelete }: Props) {
  const remain = remainingCoins(holding.currentAmount, holding.targetAmount);
  const ratio = fillRatio(holding.currentAmount, holding.targetAmount);
  const currentUsd = price != null ? holding.currentAmount * price : null;
  const remainUsd = price != null ? remain * price : null;
  const met = remain <= 0;
  const surplusUsd =
    met && currentUsd != null && price != null
      ? currentUsd - holding.targetAmount * price
      : 0;

  return (
    <article
      className={
        met
          ? "rounded-xl bg-success/20 p-4 outline outline-1 outline-success/45 sm:p-5"
          : "rounded-xl bg-card p-4 shadow-[var(--shadow-border)] sm:p-5"
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={`Actions for ${holding.symbol}`}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onEdit}>Edit amounts</DropdownMenuItem>
            <DropdownMenuItem onSelect={onPlan}>Plan DCA</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onSelect={onDelete}>
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-5 flex items-end justify-between gap-3">
        <p className="font-mono text-sm tabular-nums text-muted-foreground">
          <span className="text-foreground">{formatCoins(holding.currentAmount, holding.symbol)}</span>
          {" / "}
          {formatCoins(holding.targetAmount, holding.symbol)} {holding.symbol}
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
              {surplusUsd > 0.009 && (
                <p className="mt-1 text-sm tabular-nums text-success/80">
                  {formatUsd(surplusUsd)} over target
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-xs tracking-wide text-muted-foreground uppercase">Capital remaining</p>
              <p className="font-serif text-3xl tracking-tight tabular-nums">
                {remainUsd != null
                  ? formatUsd(remainUsd)
                  : `${formatCoins(remain, holding.symbol)} ${holding.symbol}`}
              </p>
            </>
          )}
          {currentUsd != null && (
            <p className="mt-1 text-sm text-muted-foreground tabular-nums">
              {formatUsd(currentUsd, { precise: true })} held
              {price != null ? ` at ${formatUsd(price, { precise: true })}` : ""}
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={onPlan}>
          <Route />
          Plan path
        </Button>
      </div>
    </article>
  );
}
