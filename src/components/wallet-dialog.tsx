import { useEffect, useMemo, useState } from "react";
import { Wallet } from "lucide-react";
import { ASSET_BY_SYMBOL } from "@/lib/assets";
import { formatAddress, formatCoins } from "@/lib/format";
import type { Holding, HoldingInput, LinkedWallet } from "@/lib/types";
import {
  connectWallet,
  hasInjectedWallet,
  MAX_WALLETS,
  normalizeAddress,
  readWalletBalances,
  sumWalletBalances,
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
import { Input } from "@/components/ui/input";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  holdings: Holding[];
  wallets: LinkedWallet[];
  onAddWallet: (address: string) => Promise<void>;
  onRemoveWallet: (address: string) => Promise<void>;
  onApply: (updates: { id: string; walletAmount: number; walletAddress: string }[]) => Promise<void>;
  onAddFromWallet: (input: HoldingInput) => Promise<void>;
};

export function WalletDialog({
  open,
  onOpenChange,
  holdings,
  wallets,
  onAddWallet,
  onRemoveWallet,
  onApply,
  onAddFromWallet,
}: Props) {
  const [paste, setPaste] = useState("");
  const [perWallet, setPerWallet] = useState<Record<string, WalletBalance[]>>({});
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const available = hasInjectedWallet();
  const groups = wallets.map((w) => perWallet[w.address] ?? []);
  const combined = useMemo(() => sumWalletBalances(groups), [perWallet, wallets]);
  const combinedList = useMemo(() => [...combined.entries()], [combined]);

  const loadBalances = async (addresses: string[]) => {
    const next: Record<string, WalletBalance[]> = {};
    for (const address of addresses) {
      next[address] = await readWalletBalances(address);
    }
    setPerWallet(next);
    const sums = sumWalletBalances(Object.values(next));
    const initial: Record<string, boolean> = {};
    for (const [symbol] of sums) {
      if (holdings.some((h) => h.symbol === symbol)) initial[symbol] = true;
    }
    setSelected((prev) => ({ ...initial, ...prev }));
  };

  useEffect(() => {
    if (!open || wallets.length === 0) return;
    void loadBalances(wallets.map((w) => w.address)).catch((err) => {
      setError(err instanceof Error ? err.message : "Could not read balances");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, wallets.map((w) => w.address).join(",")]);

  const addAddress = async (raw: string) => {
    setError(null);
    setBusy(true);
    try {
      const address = normalizeAddress(raw);
      if (wallets.some((w) => w.address === address)) {
        throw new Error("That wallet is already linked.");
      }
      if (wallets.length >= MAX_WALLETS) {
        throw new Error(`You can link up to ${MAX_WALLETS} wallets.`);
      }
      await onAddWallet(address);
      setPaste("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add wallet");
    } finally {
      setBusy(false);
    }
  };

  const connect = async () => {
    setError(null);
    setBusy(true);
    try {
      const address = await connectWallet();
      await onAddWallet(address);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect wallet");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (address: string) => {
    setBusy(true);
    setError(null);
    try {
      await onRemoveWallet(address);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove wallet");
    } finally {
      setBusy(false);
    }
  };

  const apply = async () => {
    setBusy(true);
    setError(null);
    try {
      const primary = wallets[0]?.address ?? "";
      const updates: { id: string; walletAmount: number; walletAddress: string }[] = [];
      const additions: HoldingInput[] = [];
      for (const [symbol, row] of combined) {
        if (!selected[symbol]) continue;
        const match = holdings.find((h) => h.symbol === symbol);
        if (match) {
          updates.push({ id: match.id, walletAmount: row.amount, walletAddress: primary });
        } else {
          const asset = ASSET_BY_SYMBOL.get(symbol);
          if (!asset) continue;
          additions.push({
            symbol: asset.symbol,
            name: asset.name,
            coingeckoId: asset.coingeckoId,
            targetAmount: row.amount,
            currentAmount: row.amount,
            source: "wallet",
            walletAddress: primary,
            walletAmount: row.amount,
            manualAmount: 0,
            costBasisUsd: null,
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
          <DialogTitle>Wallets</DialogTitle>
          <DialogDescription>
            Link more than one Ethereum address. Remaindr sums their balances and keeps any amount you typed in by
            hand. Read-only — no transactions, no keys.
          </DialogDescription>
        </DialogHeader>

        {wallets.length > 0 && (
          <ul className="space-y-1">
            {wallets.map((wallet) => (
              <li
                key={wallet.address}
                className="flex min-h-11 items-center justify-between gap-3 rounded-md bg-secondary/70 px-3"
              >
                <span className="font-mono text-sm">{formatAddress(wallet.address)}</span>
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                  onClick={() => void remove(wallet.address)}
                  disabled={busy}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        {wallets.length < MAX_WALLETS && (
          <div className="space-y-2">
            {available && (
              <Button type="button" variant="outline" onClick={() => void connect()} disabled={busy}>
                <Wallet />
                {busy ? "Working…" : wallets.length ? "Connect another" : "Connect Ethereum wallet"}
              </Button>
            )}
            {!available && wallets.length === 0 && (
              <p className="rounded-lg bg-secondary px-3 py-3 text-sm text-muted-foreground">
                No injected wallet here. Paste a watch-only address, or type holdings in by hand.
              </p>
            )}
            <div className="flex gap-2">
              <Input
                value={paste}
                onChange={(e) => setPaste(e.target.value)}
                placeholder="0x… paste a watch-only address"
                autoComplete="off"
                spellCheck={false}
              />
              <Button type="button" variant="outline" disabled={busy || !paste.trim()} onClick={() => void addAddress(paste)}>
                Add
              </Button>
            </div>
            {wallets.length > 0 && available && (
              <p className="text-xs text-muted-foreground">
                To add another from the extension, switch accounts there, then Connect another.
              </p>
            )}
          </div>
        )}

        {wallets.length > 0 && (
          <div className="space-y-3">
            {combinedList.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No catalog tokens on these addresses yet. You can still keep them linked.
              </p>
            ) : (
              <ul className="max-h-56 space-y-1 overflow-y-auto">
                {combinedList.map(([symbol, row]) => {
                  const maps = holdings.find((h) => h.symbol === symbol);
                  return (
                    <li key={symbol}>
                      <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 hover:bg-secondary">
                        <input
                          type="checkbox"
                          className="size-4 accent-primary"
                          checked={Boolean(selected[symbol])}
                          onChange={(e) =>
                            setSelected((prev) => ({ ...prev, [symbol]: e.target.checked }))
                          }
                        />
                        <span className="flex-1 text-sm">
                          <span className="font-medium">{symbol}</span>
                          <span className="text-muted-foreground">
                            {" "}
                            {formatCoins(row.amount, symbol)} across {wallets.length === 1 ? "1 wallet" : `${wallets.length} wallets`}
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
            <Button type="button" onClick={() => void apply()} disabled={busy || combinedList.length === 0}>
              {busy ? "Applying…" : "Apply selected"}
            </Button>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}
