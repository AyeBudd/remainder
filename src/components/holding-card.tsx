import { MoreHorizontal, Route } from "lucide-react";
import { fillRatio, remainingCoins } from "@/lib/assets";
import { formatCoins, formatPercent, formatUsd } from "@/lib/format";
import type { DcaPlan, Holding } from "@/lib/types";
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
  onEdit: () => void;
  onPlan: () => void;
  onDelete: () => void;
};

export function HoldingCard({ holding, plan, price, onEdit, onPlan, onDelete }: Props) {
  const remain = remainingCoins(holding.currentAmount, holding.targetAmount);
  const ratio = fillRatio(holding.currentAmount, holding.targetAmount);
  const currentUsd = price != null ? holding.currentAmount * price : null;
  const remainUsd = price != null ? remain * price : null;
  const met = remain <= 0;

  return (
    <article className="rounded-xl bg-card p-4 shadow-[var(--shadow-border)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-baseline gap-2">
            <h3 className="font-serif text-2xl tracking-tight">{holding.symbol}</h3>
            <span className="text-sm text-muted-foreground">{holding.name}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge variant={holding.source === "wallet" ? "success" : "default"}>
              {holding.source === "wallet" ? "Wallet" : "Manual"}
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
      <Progress className="mt-2" value={Math.min(100, ratio * 100)} />

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs tracking-wide text-muted-foreground uppercase">
            {met ? "Surplus" : "Capital remaining"}
          </p>
          <p className="font-serif text-3xl tracking-tight tabular-nums">
            {remainUsd != null
              ? formatUsd(met ? (currentUsd ?? 0) - holding.targetAmount * (price ?? 0) : remainUsd)
              : `${formatCoins(remain, holding.symbol)} ${holding.symbol}`}
          </p>
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
