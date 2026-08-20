import { useCallback, useEffect, useState } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { format } from "date-fns";
import {
  createHolding,
  deleteDcaPlan,
  deleteHolding,
  listDcaPlans,
  listHoldings,
  updateHolding,
  upsertDcaPlan,
} from "@/lib/holdings";
import { captureBaseline, hasBaseline } from "@/lib/dca";
import type { DcaPlan, DcaPlanInput, Holding, HoldingInput, LinkedWallet, PriceMap } from "@/lib/types";
import { addUserWallet, listUserWallets, removeUserWallet } from "@/lib/user-wallets";
import { normalizeAddress } from "@/lib/wallet";

const LOCAL_KEY = "remainder.v1";
const LOCAL_WALLETS = "remainder.wallets";

type LocalState = {
  holdings: Holding[];
  plans: DcaPlan[];
};

function sampleTargetDate(): string {
  const now = new Date();
  return format(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 6, 19)), "yyyy-MM-dd");
}

function makeSample(): LocalState {
  const targetDate = sampleTargetDate();
  const holdings: Holding[] = [
    {
      id: "sample-btc",
      symbol: "BTC",
      name: "Bitcoin",
      coingeckoId: "bitcoin",
      targetAmount: 1,
      currentAmount: 0.37,
      source: "manual",
      walletAddress: null,
      walletAmount: 0,
      manualAmount: 0.37,
    },
    {
      id: "sample-eth",
      symbol: "ETH",
      name: "Ethereum",
      coingeckoId: "ethereum",
      targetAmount: 16,
      currentAmount: 8.4,
      source: "manual",
      walletAddress: null,
      walletAmount: 0,
      manualAmount: 8.4,
    },
    {
      id: "sample-sol",
      symbol: "SOL",
      name: "Solana",
      coingeckoId: "solana",
      targetAmount: 250,
      currentAmount: 64,
      source: "manual",
      walletAddress: null,
      walletAmount: 0,
      manualAmount: 64,
    },
  ];
  const plans: DcaPlan[] = [
    {
      id: "sample-dca-btc",
      holdingId: "sample-btc",
      targetDate,
      frequency: "weekly",
      assumedPrice: null,
    },
  ];
  return { holdings, plans };
}

function readLocal(): LocalState {
  if (typeof window === "undefined") return { holdings: [], plans: [] };
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (raw === null) return makeSample();
    const parsed = JSON.parse(raw) as LocalState;
    if (!Array.isArray(parsed.holdings) || !Array.isArray(parsed.plans)) return makeSample();
    return {
      holdings: parsed.holdings.map((h) => ({
        ...h,
        walletAmount: h.walletAmount ?? (h.source === "wallet" ? h.currentAmount : 0),
        manualAmount: h.manualAmount ?? (h.source === "wallet" ? 0 : h.currentAmount),
      })),
      plans: parsed.plans,
    };
  } catch {
    return makeSample();
  }
}

function writeLocal(state: LocalState) {
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
}

function readLocalWallets(): LinkedWallet[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_WALLETS);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((row): LinkedWallet[] => {
      if (typeof row === "string") return [{ address: row.toLowerCase(), label: null }];
      if (row && typeof row === "object" && "address" in row) {
        return [{ address: String((row as { address: string }).address).toLowerCase(), label: null }];
      }
      return [];
    });
  } catch {
    return [];
  }
}

function writeLocalWallets(wallets: LinkedWallet[]) {
  try {
    window.localStorage.setItem(LOCAL_WALLETS, JSON.stringify(wallets.map((w) => w.address)));
  } catch {
    /* ignore */
  }
}

export function usePortfolio() {
  const { user, isPending } = useCurrentUserState();
  const [holdings, setHoldings] = useState<Holding[]>(() => makeSample().holdings);
  const [plans, setPlans] = useState<DcaPlan[]>(() => makeSample().plans);
  const [wallets, setWallets] = useState<LinkedWallet[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [booted, setBooted] = useState(false);
  const signedIn = Boolean(user);

  const reload = useCallback(async () => {
    setError(null);
    if (user) {
      try {
        const [nextHoldings, nextPlans, nextWallets] = await Promise.all([
          listHoldings(),
          listDcaPlans(),
          listUserWallets(),
        ]);
        setHoldings(nextHoldings);
        setPlans(nextPlans);
        setWallets(nextWallets);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load holdings");
        setHoldings([]);
        setPlans([]);
        setWallets([]);
      }
      return;
    }
    const local = readLocal();
    setHoldings(local.holdings);
    setPlans(local.plans);
    setWallets(readLocalWallets());
  }, [user]);

  useEffect(() => {
    if (isPending) return;
    void reload().finally(() => setBooted(true));
  }, [isPending, reload]);

  const persistGuest = (nextHoldings: Holding[], nextPlans: DcaPlan[]) => {
    writeLocal({ holdings: nextHoldings, plans: nextPlans });
  };

  const add = async (input: HoldingInput) => {
    if (user) {
      const created = await createHolding({ data: input });
      setHoldings((prev) => [...(prev ?? []), created]);
      return created;
    }
    const created: Holding = {
      ...input,
      id: crypto.randomUUID(),
      walletAmount: input.walletAmount ?? 0,
      manualAmount: input.manualAmount ?? input.currentAmount,
    };
    setHoldings((prev) => {
      const next = [...(prev ?? []), created];
      persistGuest(next, plans);
      return next;
    });
    return created;
  };

  const update = async (id: string, patch: Partial<HoldingInput>) => {
    if (user) {
      const updated = await updateHolding({ data: { id, ...patch } });
      setHoldings((prev) => (prev ?? []).map((h) => (h.id === id ? updated : h)));
      return updated;
    }
    let updated: Holding | undefined;
    setHoldings((prev) => {
      const next = (prev ?? []).map((h) => {
        if (h.id !== id) return h;
        const walletAmount = patch.walletAmount ?? h.walletAmount;
        const manualAmount =
          patch.manualAmount ??
          (patch.currentAmount != null && patch.walletAmount == null
            ? Math.max(0, patch.currentAmount - walletAmount)
            : h.manualAmount);
        const currentAmount =
          patch.walletAmount != null && patch.currentAmount == null
            ? walletAmount + manualAmount
            : patch.currentAmount ?? walletAmount + manualAmount;
        const source =
          walletAmount > 0 && manualAmount > 0 ? "mixed" : walletAmount > 0 ? "wallet" : "manual";
        updated = { ...h, ...patch, walletAmount, manualAmount, currentAmount, source };
        return updated;
      });
      persistGuest(next, plans);
      return next;
    });
    return updated;
  };

  const remove = async (id: string) => {
    if (user) {
      await deleteHolding({ data: id });
    }
    setHoldings((prev) => {
      const next = (prev ?? []).filter((h) => h.id !== id);
      const nextPlans = plans.filter((p) => p.holdingId !== id);
      setPlans(nextPlans);
      if (!user) persistGuest(next, nextPlans);
      return next;
    });
  };

  const savePlan = async (input: DcaPlanInput) => {
    if (user) {
      const saved = await upsertDcaPlan({ data: input });
      setPlans((prev) => {
        const without = prev.filter((p) => p.holdingId !== saved.holdingId);
        return [...without, saved];
      });
      return saved;
    }
    const existing = plans.find((p) => p.holdingId === input.holdingId);
    const saved: DcaPlan = { ...input, id: existing?.id ?? crypto.randomUUID() };
    setPlans((prev) => {
      const next = [...prev.filter((p) => p.holdingId !== input.holdingId), saved];
      persistGuest(holdings ?? [], next);
      return next;
    });
    return saved;
  };

  const ensureBaselines = useCallback(
    (prices: PriceMap) => {
      setPlans((prev) => {
        let changed = false;
        const next = prev.map((plan) => {
          if (hasBaseline(plan)) return plan;
          const holding = holdings.find((h) => h.id === plan.holdingId);
          if (!holding) return plan;
          const snap = captureBaseline(holding, plan, prices);
          if (!snap.baselineUsdPerBuy) return plan;
          changed = true;
          return { ...plan, ...snap };
        });
        if (!changed) return prev;
        if (!user) persistGuest(holdings ?? [], next);
        return next;
      });
    },
    [holdings, user],
  );

  const removePlan = async (id: string) => {
    if (user) {
      await deleteDcaPlan({ data: id });
    }
    setPlans((prev) => {
      const next = prev.filter((p) => p.id !== id);
      if (!user) persistGuest(holdings ?? [], next);
      return next;
    });
  };

  const addWallet = async (address: string) => {
    const normalized = normalizeAddress(address);
    if (user) {
      const next = await addUserWallet({ data: normalized });
      setWallets(next);
      return next;
    }
    const next = [...wallets.filter((w) => w.address !== normalized), { address: normalized, label: null }];
    setWallets(next);
    writeLocalWallets(next);
    return next;
  };

  const removeWallet = async (address: string) => {
    const normalized = normalizeAddress(address);
    if (user) {
      const next = await removeUserWallet({ data: normalized });
      setWallets(next);
      return next;
    }
    const next = wallets.filter((w) => w.address !== normalized);
    setWallets(next);
    writeLocalWallets(next);
    return next;
  };

  const loadSample = () => {
    const sample = makeSample();
    setHoldings(sample.holdings);
    setPlans(sample.plans);
    if (!user) persistGuest(sample.holdings, sample.plans);
  };

  return {
    holdings,
    plans,
    wallets,
    error,
    isLoading: Boolean(user) && !booted,
    signedIn,
    add,
    update,
    remove,
    addWallet,
    removeWallet,
    savePlan,
    ensureBaselines,
    removePlan,
    loadSample,
    reload,
  };
}
