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
import type { DcaPlan, DcaPlanInput, Holding, HoldingInput } from "@/lib/types";

const LOCAL_KEY = "remainder.v1";

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
    return parsed;
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

export function usePortfolio() {
  const { user, isPending } = useCurrentUserState();
  const [holdings, setHoldings] = useState<Holding[]>(() => makeSample().holdings);
  const [plans, setPlans] = useState<DcaPlan[]>(() => makeSample().plans);
  const [error, setError] = useState<string | null>(null);
  const [booted, setBooted] = useState(false);
  const signedIn = Boolean(user);

  const reload = useCallback(async () => {
    setError(null);
    if (user) {
      try {
        const [nextHoldings, nextPlans] = await Promise.all([listHoldings(), listDcaPlans()]);
        setHoldings(nextHoldings);
        setPlans(nextPlans);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load holdings");
        setHoldings([]);
        setPlans([]);
      }
      return;
    }
    const local = readLocal();
    setHoldings(local.holdings);
    setPlans(local.plans);
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
    const created: Holding = { ...input, id: crypto.randomUUID() };
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
        updated = { ...h, ...patch };
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

  const loadSample = () => {
    const sample = makeSample();
    setHoldings(sample.holdings);
    setPlans(sample.plans);
    if (!user) persistGuest(sample.holdings, sample.plans);
  };

  return {
    holdings,
    plans,
    error,
    isLoading: Boolean(user) && !booted,
    signedIn,
    add,
    update,
    remove,
    savePlan,
    removePlan,
    loadSample,
    reload,
  };
}
