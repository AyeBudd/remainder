import { useMemo, useState } from "react";
import { ASSETS, type Asset } from "@/lib/assets";
import { formatUsd, parseAmount } from "@/lib/format";
import type { Holding, HoldingInput } from "@/lib/types";
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
  onOpenChange: (open: boolean) => void;
  existingSymbols: string[];
  assets?: Asset[];
  editing?: Holding | null;
  initialAsset?: Asset | null;
  initialCurrent?: number;
  onSave: (input: HoldingInput, id?: string) => Promise<void>;
};

export function AddHoldingDialog({
  open,
  onOpenChange,
  existingSymbols,
  assets = ASSETS,
  editing,
  initialAsset,
  initialCurrent,
  onSave,
}: Props) {
  const [query, setQuery] = useState("");
  const [asset, setAsset] = useState<Asset | null>(
    editing ? assets.find((a) => a.symbol === editing.symbol) ?? null : initialAsset ?? null,
  );
  const [customSymbol, setCustomSymbol] = useState("");
  const [customId, setCustomId] = useState("");
  const [target, setTarget] = useState(editing ? String(editing.targetAmount) : "");
  const [current, setCurrent] = useState(
    editing ? String(editing.currentAmount) : initialCurrent != null ? String(initialCurrent) : "",
  );
  const [cost, setCost] = useState(
    editing?.costBasisUsd != null ? String(editing.costBasisUsd) : "",
  );
  const [costMode, setCostMode] = useState<CostMode>("total");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useCustom, setUseCustom] = useState(false);

  const reset = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      setQuery("");
      setAsset(null);
      setCustomSymbol("");
      setCustomId("");
      setTarget("");
      setCurrent("");
      setCost("");
      setCostMode("total");
      setError(null);
      setUseCustom(false);
      setBusy(false);
    }
  };

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = assets.filter((a) => {
      if (!q) return true;
      return (
        a.symbol.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.coingeckoId.includes(q)
      );
    });
    return q ? filtered.slice(0, 48) : filtered.slice(0, 48);
  }, [assets, query]);

  const submit = async () => {
    setError(null);
    const targetAmount = parseAmount(target);
    const currentAmount = current.trim() === "" ? 0 : parseAmount(current);
    if (targetAmount == null || targetAmount <= 0) {
      setError("Enter a target amount greater than zero.");
      return;
    }
    if (currentAmount == null) {
      setError("Current holding must be a number.");
      return;
    }
    const entered = cost.trim() === "" ? undefined : parseAmount(cost);
    if (cost.trim() !== "" && (entered == null || entered < 0)) {
      setError("Cost must be a dollar amount, or leave it blank to mark at the live price.");
      return;
    }
    let costBasisUsd: number | undefined;
    if (entered != null) {
      if (costMode === "avg") {
        if (currentAmount <= 0) {
          setError("Add a current holding to use average cost per coin.");
          return;
        }
        costBasisUsd = entered * currentAmount;
      } else {
        costBasisUsd = entered;
      }
    }
    const chosen = useCustom
      ? {
          symbol: customSymbol.trim().toUpperCase(),
          name: customSymbol.trim().toUpperCase(),
          coingeckoId: customId.trim().toLowerCase(),
        }
      : asset
        ? { symbol: asset.symbol, name: asset.name, coingeckoId: asset.coingeckoId }
        : null;
    if (!chosen || !chosen.symbol || !chosen.coingeckoId) {
      setError("Choose an asset, or enter a symbol and CoinGecko id.");
      return;
    }
    if (
      !editing &&
      existingSymbols.includes(chosen.symbol) &&
      !useCustom
    ) {
      setError(`You already have a ${chosen.symbol} target.`);
      return;
    }
    setBusy(true);
    try {
      await onSave(
        {
          symbol: chosen.symbol,
          name: chosen.name,
          coingeckoId: chosen.coingeckoId,
          targetAmount,
          currentAmount,
          source: editing?.source === "wallet" || editing?.source === "mixed" ? editing.source : "manual",
          walletAddress: editing?.walletAddress ?? null,
          walletAmount: editing?.walletAmount ?? 0,
          manualAmount: Math.max(0, currentAmount - (editing?.walletAmount ?? 0)),
          ...(costBasisUsd != null ? { costBasisUsd } : {}),
        },
        editing?.id,
      );
      reset(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save holding");
      setBusy(false);
    }
  };

  const chooseCostMode = (next: CostMode) => {
    if (next === costMode) return;
    const qty = parseAmount(current);
    const n = parseAmount(cost);
    if (n != null && n > 0 && qty != null && qty > 0) {
      setCost(next === "avg" ? compactNum(n / qty) : compactNum(n * qty));
    }
    setCostMode(next);
  };

  const qtyNow = parseAmount(current);
  const costNow = parseAmount(cost);
  const costPreview =
    costNow != null && costNow > 0 && qtyNow != null && qtyNow > 0
      ? costMode === "avg"
        ? `Books ${formatUsd(costNow * qtyNow)} for the bag`
        : `${formatUsd(costNow / qtyNow, { precise: true })} avg per ${
            (asset?.symbol ?? editing?.symbol ?? customSymbol) || "coin"
          }`
      : null;

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${editing.symbol}` : "Add a target"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Update amounts and, if you know it, what this bag actually cost. Blank cost keeps the current book (or marks new coins at the live price)."
              : "Pick from the current top 250 by market cap, or add any CoinGecko id. Cost basis is optional — leave it blank to mark at the live price when you save."}
          </DialogDescription>
        </DialogHeader>

        {!editing && (
          <div className="space-y-2">
            <Label htmlFor="asset-search">Top 250 assets</Label>
            {!useCustom && (
              <>
                <Input
                  id="asset-search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search Bitcoin, HYPE, PENGU…"
                  autoComplete="off"
                />
                <div className="grid max-h-56 grid-cols-2 gap-1 overflow-y-auto sm:grid-cols-3">
                  {matches.map((item) => {
                    const taken = existingSymbols.includes(item.symbol);
                    const selected = asset?.symbol === item.symbol;
                    return (
                      <button
                        key={item.symbol}
                        type="button"
                        disabled={taken}
                        onClick={() => setAsset(item)}
                        className={`rounded-md px-2 py-2 text-left transition-colors ${
                          selected
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-foreground hover:bg-secondary/70"
                        } disabled:opacity-35`}
                      >
                        <div className="flex items-baseline justify-between gap-1">
                          <div className="text-sm font-medium">{item.symbol}</div>
                          {item.rank != null && item.rank <= 100 && (
                            <div className={`text-[10px] tabular-nums ${selected ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                              #{item.rank}
                            </div>
                          )}
                        </div>
                        <div className={`truncate text-xs ${selected ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {taken ? "Added" : item.name}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            {useCustom && (
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="custom-symbol">Symbol</Label>
                  <Input
                    id="custom-symbol"
                    value={customSymbol}
                    onChange={(e) => setCustomSymbol(e.target.value)}
                    placeholder="HYPE"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="custom-id">CoinGecko id</Label>
                  <Input
                    id="custom-id"
                    value={customId}
                    onChange={(e) => setCustomId(e.target.value)}
                    placeholder="hyperliquid"
                  />
                </div>
              </div>
            )}
            <button
              type="button"
              className="text-xs text-muted-foreground underline-offset-4 hover:underline"
              onClick={() => setUseCustom((v) => !v)}
            >
              {useCustom ? "Choose from the list" : "Asset not listed? Add by CoinGecko id"}
            </button>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="target-amount">Target amount</Label>
            <Input
              id="target-amount"
              inputMode="decimal"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="1.0"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="current-amount">Current holding</Label>
            <Input
              id="current-amount"
              inputMode="decimal"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="cost-basis">Cost</Label>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
              <select
                id="cost-mode"
                className="h-11 rounded-md bg-secondary px-3 text-sm text-foreground shadow-[var(--shadow-border)]"
                value={costMode}
                onChange={(e) => chooseCostMode(e.target.value as CostMode)}
                aria-label="Cost entry mode"
              >
                <option value="total">Total spent on bag</option>
                <option value="avg">Avg cost per coin</option>
              </select>
              <Input
                id="cost-basis"
                inputMode="decimal"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder={costMode === "avg" ? "Coinbase average cost" : "Total dollars in"}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {costMode === "avg"
                ? "Same number Coinbase shows as average cost. We multiply by your current holding."
                : "Total dollars in for this bag."}{" "}
              Leave blank to keep auto-marking at the live price.
            </p>
            {costPreview && <p className="text-xs tabular-nums text-muted-foreground">{costPreview}</p>}
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => reset(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={busy}>
            {busy ? "Saving…" : editing ? "Save" : "Add target"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
