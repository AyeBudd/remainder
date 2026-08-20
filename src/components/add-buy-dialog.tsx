import { useEffect, useState } from "react";
import { formatCoins, formatUsd, parseAmount } from "@/lib/format";
import type { Holding } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CostMode = "total" | "avg";

function compactNum(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "";
  const digits = value >= 1000 ? 2 : value >= 1 ? 4 : 8;
  return String(Number(value.toFixed(digits)));
}

type Props = {
  open: boolean;
  holding: Holding | null;
  price?: number;
  onOpenChange: (open: boolean) => void;
  onSave: (patch: { currentAmount: number; manualAmount: number; costBasisUsd: number }) => Promise<void>;
};

export function AddBuyDialog({ open, holding, price, onOpenChange, onSave }: Props) {
  const [amount, setAmount] = useState("");
  const [cost, setCost] = useState("");
  const [costMode, setCostMode] = useState<CostMode>("avg");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAmount("");
    setCostMode("avg");
    setCost(price != null && price > 0 ? compactNum(price) : "");
    setError(null);
    setBusy(false);
  }, [open, holding?.id]);

  const qty = parseAmount(amount);
  const entered = parseAmount(cost);
  const lotUsd =
    qty != null && qty > 0 && entered != null && entered > 0
      ? costMode === "avg"
        ? qty * entered
        : entered
      : null;

  const chooseCostMode = (next: CostMode) => {
    if (next === costMode) return;
    if (qty != null && qty > 0 && entered != null && entered > 0) {
      setCost(next === "avg" ? compactNum(entered / qty) : compactNum(entered * qty));
    } else if (next === "avg" && price != null && price > 0 && cost.trim() === "") {
      setCost(compactNum(price));
    }
    setCostMode(next);
  };

  const submit = async () => {
    if (!holding) return;
    setError(null);
    if (qty == null || qty <= 0) {
      setError("Enter how many coins this buy added.");
      return;
    }
    if (entered == null || entered <= 0) {
      setError("Enter the fill price or what you spent on this buy.");
      return;
    }
    const spent = costMode === "avg" ? qty * entered : entered;
    const prior =
      holding.costBasisUsd ?? (price != null && price > 0 ? holding.currentAmount * price : 0);
    setBusy(true);
    try {
      await onSave({
        currentAmount: holding.currentAmount + qty,
        manualAmount: holding.manualAmount + qty,
        costBasisUsd: prior + spent,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add buy");
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add buy{holding ? ` · ${holding.symbol}` : ""}</DialogTitle>
          <DialogDescription>
            Log a fill without rewriting the bag. Live price is prefilled — change it if this morning’s DCA
            wasn’t today’s print.
          </DialogDescription>
        </DialogHeader>

        {holding && (
          <p className="font-mono text-sm tabular-nums text-muted-foreground">
            Now {formatCoins(holding.currentAmount, holding.symbol)} {holding.symbol}
            {price != null ? ` · live ${formatUsd(price, { precise: true })}` : ""}
          </p>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="buy-amount">Coins bought</Label>
          <Input
            id="buy-amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="buy-cost">This fill</Label>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <select
              id="buy-cost-mode"
              className="h-11 rounded-md bg-secondary px-3 text-sm text-foreground shadow-[var(--shadow-border)]"
              value={costMode}
              onChange={(e) => chooseCostMode(e.target.value as CostMode)}
              aria-label="Buy cost mode"
            >
              <option value="avg">Price per coin</option>
              <option value="total">Total spent on buy</option>
            </select>
            <Input
              id="buy-cost"
              inputMode="decimal"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder={costMode === "avg" ? "Fill price" : "Dollars spent"}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Defaults to the live price. Edit it if you bought earlier today at a different print.
          </p>
        </div>

        {holding && qty != null && qty > 0 && (
          <p className="text-sm tabular-nums text-muted-foreground">
            After: {formatCoins(holding.currentAmount + qty, holding.symbol)} {holding.symbol}
            {lotUsd != null ? ` · +${formatUsd(lotUsd)} to cost basis` : ""}
          </p>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={busy || !holding}>
            {busy ? "Saving…" : "Add buy"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
