import { useMemo, useState } from "react";
import { ASSETS, type Asset } from "@/lib/assets";
import { parseAmount } from "@/lib/format";
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
        },
        editing?.id,
      );
      reset(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save holding");
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${editing.symbol}` : "Add a target"}</DialogTitle>
          <DialogDescription>
            Pick from the current top 250 by market cap, or add any CoinGecko id. Type to search the full list. Current amount can be typed in or filled from a wallet later.
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
