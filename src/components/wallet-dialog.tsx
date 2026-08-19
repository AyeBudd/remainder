import { useState } from "react";
import { Wallet } from "lucide-react";
import { ASSET_BY_SYMBOL } from "@/lib/assets";
import { formatAddress, formatCoins } from "@/lib/format";
import type { Holding, HoldingInput } from "@/lib/types";
import {
  connectWallet,
  hasInjectedWallet,
  readWalletBalances,
  type WalletBalance,
} from "@/lib/wallet";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  holdings: Holding[];
  onApply: (updates: { id: string; currentAmount: number; walletAddress: string }[]) => Promise<void>;
  onAddFromWallet: (input: HoldingInput) => Promise<void>;
};

export function WalletDialog({ open, onOpenChange, holdings, onApply, onAddFromWallet }: Props) {
  const [address, setAddress] = useState<string | null>(null);
  const [balances, setBalances] = useState<WalletBalance[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const available = hasInjectedWallet();

  const connect = async () => {
    setError(null);
    setBusy(true);
    try {
      const next = await connectWallet();
      const found = await readWalletBalances(next);
      setAddress(next);
      setBalances(found);
      const initial: Record<string, boolean> = {};
      for (const bal of found) {
        if (holdings.some((h) => h.symbol === bal.mapsToSymbol || h.symbol === bal.symbol)) {
          initial[bal.symbol] = true;
        }
      }
      setSelected(initial);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect wallet");
    } finally {
      setBusy(false);
    }
  };

  const apply = async () => {
    if (!address) return;
    setBusy(true);
    setError(null);
    try {
      const updates: { id: string; currentAmount: number; walletAddress: string }[] = [];
      const additions: HoldingInput[] = [];
      for (const bal of balances) {
        if (!selected[bal.symbol]) continue;
        const match =
          holdings.find((h) => h.symbol === bal.mapsToSymbol) ??
          holdings.find((h) => h.symbol === bal.symbol);
        if (match) {
          updates.push({ id: match.id, currentAmount: bal.amount, walletAddress: address });
        } else {
          const asset = ASSET_BY_SYMBOL.get(bal.mapsToSymbol) ?? ASSET_BY_SYMBOL.get(bal.symbol);
          if (!asset) continue;
          additions.push({
            symbol: asset.symbol,
            name: asset.name,
            coingeckoId: asset.coingeckoId,
            targetAmount: bal.amount,
            currentAmount: bal.amount,
            source: "wallet",
            walletAddress: address,
          });
        }
      }
      if (updates.length) await onApply(updates);
      for (const addition of additions) await onAddFromWallet(addition);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not apply balances");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect a wallet</DialogTitle>
          <DialogDescription>
            Read-only. Remainder asks for your address and token balances on Ethereum — never a transaction, never your keys.
          </DialogDescription>
        </DialogHeader>

        {!available && (
          <p className="rounded-lg bg-secondary px-3 py-3 text-sm text-muted-foreground">
            No injected wallet in this browser. Holdings on a CEX, a hardware wallet, or another chain can be typed in manually.
          </p>
        )}

        {available && !address && (
          <Button type="button" onClick={() => void connect()} disabled={busy}>
            <Wallet />
            {busy ? "Connecting…" : "Connect Ethereum wallet"}
          </Button>
        )}

        {address && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Connected <span className="font-mono text-foreground">{formatAddress(address)}</span>
            </p>
            {balances.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No catalog tokens found on this address. You can still enter holdings by hand.
              </p>
            ) : (
              <ul className="max-h-56 space-y-1 overflow-y-auto">
                {balances.map((bal) => {
                  const maps =
                    holdings.find((h) => h.symbol === bal.mapsToSymbol) ??
                    holdings.find((h) => h.symbol === bal.symbol);
                  return (
                    <li key={bal.symbol}>
                      <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 hover:bg-secondary">
                        <input
                          type="checkbox"
                          className="size-4 accent-primary"
                          checked={Boolean(selected[bal.symbol])}
                          onChange={(e) =>
                            setSelected((prev) => ({ ...prev, [bal.symbol]: e.target.checked }))
                          }
                        />
                        <span className="flex-1 text-sm">
                          <span className="font-medium">{bal.symbol}</span>
                          <span className="text-muted-foreground">
                            {" "}
                            {formatCoins(bal.amount, bal.symbol)}
                          </span>
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {maps ? `→ ${maps.symbol} target` : "add as target"}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
            <Button type="button" onClick={() => void apply()} disabled={busy || balances.length === 0}>
              {busy ? "Applying…" : "Apply selected"}
            </Button>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}
