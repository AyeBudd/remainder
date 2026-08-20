import { useRef, useState } from "react";
import { captureBaseline } from "@/lib/dca";
import { downloadLedgerTemplate, parseLedgerImport, type LedgerImportRow } from "@/lib/import-ledger";
import type { Asset } from "@/lib/assets";
import type { DcaPlanInput, Holding, HoldingInput, PriceMap } from "@/lib/types";
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
  holdings: Holding[];
  assets: Asset[];
  prices: PriceMap;
  onOpenChange: (open: boolean) => void;
  onAdd: (input: HoldingInput) => Promise<Holding | undefined>;
  onUpdate: (id: string, patch: Partial<HoldingInput>) => Promise<unknown>;
  onPlan: (input: DcaPlanInput) => Promise<unknown>;
};

export function ImportCsvDialog({
  open,
  holdings,
  assets,
  prices,
  onOpenChange,
  onAdd,
  onUpdate,
  onPlan,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<LedgerImportRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const reset = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      setFileName(null);
      setRows([]);
      setErrors([]);
      setBusy(false);
      setDone(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const readFile = async (file: File) => {
    setDone(null);
    setFileName(file.name);
    const text = await file.text();
    const parsed = parseLedgerImport(text, holdings, assets);
    setRows(parsed.rows);
    setErrors(parsed.errors);
  };

  const apply = async () => {
    if (!rows.length || errors.length) return;
    setBusy(true);
    setDone(null);
    try {
      let added = 0;
      let updated = 0;
      for (const row of rows) {
        let holding: Holding | undefined;
        if (row.action === "update" && row.existingId) {
          const found = holdings.find((h) => h.id === row.existingId);
          await onUpdate(row.existingId, {
            targetAmount: row.targetAmount,
            currentAmount: row.currentAmount,
            ...(row.costBasisUsd != null ? { costBasisUsd: row.costBasisUsd } : {}),
          });
          holding = found
            ? { ...found, currentAmount: row.currentAmount, targetAmount: row.targetAmount }
            : undefined;
          updated += 1;
        } else {
          const created = await onAdd({
            symbol: row.symbol,
            name: row.name,
            coingeckoId: row.coingeckoId,
            targetAmount: row.targetAmount,
            currentAmount: row.currentAmount,
            source: "manual",
            walletAddress: null,
            walletAmount: 0,
            manualAmount: row.currentAmount,
            ...(row.costBasisUsd != null
              ? { costBasisUsd: row.costBasisUsd }
              : { markPrice: prices[row.coingeckoId] }),
          });
          holding = created;
          added += 1;
        }
        if (holding && row.frequency && row.dcaDate) {
          const plan = {
            holdingId: holding.id,
            targetDate: row.dcaDate,
            frequency: row.frequency,
            assumedPrice: null as number | null,
          };
          await onPlan({ ...plan, ...captureBaseline(holding, plan, prices) });
        }
      }
      setDone(`Imported ${added} new, updated ${updated}.`);
      setRows([]);
    } catch (err) {
      setErrors([err instanceof Error ? err.message : "Import failed"]);
    } finally {
      setBusy(false);
    }
  };

  const adds = rows.filter((r) => r.action === "add").length;
  const updates = rows.filter((r) => r.action === "update").length;

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import CSV</DialogTitle>
          <DialogDescription>
            Use the template, or drop a file Remaindr exported. Matching tickers update; new ones are added.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => downloadLedgerTemplate()}>
            Download template
          </Button>
          <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
            Choose file
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void readFile(file);
            }}
          />
        </div>
        {fileName && <p className="text-sm text-muted-foreground">{fileName}</p>}

        <p className="text-xs leading-relaxed text-muted-foreground">
          Required: symbol (or coingecko_id) and target_amount. Optional: current_amount, cost_basis_usd,
          dca_frequency (daily / weekly / biweekly / monthly), dca_target_date (YYYY-MM-DD). A Remaindr export
          also works — extra columns are ignored.
        </p>

        {errors.length > 0 && (
          <ul className="max-h-36 space-y-1 overflow-y-auto text-sm text-destructive">
            {errors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        )}

        {rows.length > 0 && errors.length === 0 && (
          <div className="max-h-48 overflow-y-auto rounded-md bg-secondary/70 px-3 py-2 text-sm">
            <p className="text-muted-foreground">
              {adds} to add · {updates} to update
            </p>
            <ul className="mt-2 space-y-1 font-mono tabular-nums">
              {rows.slice(0, 12).map((row) => (
                <li key={row.symbol}>
                  {row.symbol} · {row.action} · {row.currentAmount} → {row.targetAmount}
                </li>
              ))}
              {rows.length > 12 && <li>…{rows.length - 12} more</li>}
            </ul>
          </div>
        )}

        {done && <p className="text-sm text-success">{done}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => reset(false)}>
            Close
          </Button>
          <Button type="button" onClick={() => void apply()} disabled={busy || !rows.length || errors.length > 0}>
            {busy ? "Importing…" : "Import"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
