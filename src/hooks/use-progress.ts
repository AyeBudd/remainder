import { useCallback, useEffect, useMemo, useState } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  addLocalMilestones,
  addLocalVersion,
  dropLocalHolding,
  readLocalProgress,
  seedLocalProgress,
  upsertLocalSnapshot,
} from "@/lib/progress-local";
import {
  listAllProgress,
  listProgress,
  saveMilestone,
  savePlanVersion,
  saveSnapshot,
} from "@/lib/progress-store";
import {
  buildSnapshot,
  detectNewMilestones,
  planVersionFrom,
  versionChanged,
  type HoldingSnapshot,
  type ProgressBundle,
} from "@/lib/progress";
import type { DcaPlan, Holding, PriceMap } from "@/lib/types";

function empty(): ProgressBundle {
  return { snapshots: [], milestones: [], versions: [] };
}

export function useProgress() {
  const { user } = useCurrentUserState();
  const [bundle, setBundle] = useState<ProgressBundle>(empty);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    if (user) {
      try {
        const next = await listAllProgress();
        setBundle(next);
      } catch {
        setBundle(empty());
      }
      setLoaded(true);
      return;
    }
    setBundle(readLocalProgress());
    setLoaded(true);
  }, [user]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const recordHolding = useCallback(
    async (holding: Holding, plan: DcaPlan | null, prices: PriceMap, now = new Date()) => {
      const snap = buildSnapshot(holding, plan, prices, now);
      const prior = bundle.snapshots
        .filter((s) => s.holdingId === holding.id && s.takenAt < snap.takenAt)
        .sort((a, b) => b.takenAt.localeCompare(a.takenAt))[0];
      const existingMiles = bundle.milestones.filter((m) => m.holdingId === holding.id);
      const fresh = detectNewMilestones(
        holding.id,
        prior?.completionPct ?? 0,
        snap.completionPct,
        existingMiles,
        snap.takenAt,
      );
      const nextVer = planVersionFrom(holding, plan, snap.usdPerBuy, now);
      const lastVer = [...bundle.versions.filter((v) => v.holdingId === holding.id)].pop();
      const verNeeded = versionChanged(lastVer, nextVer);

      if (user) {
        try {
          const saved = await saveSnapshot({ data: snap });
          setBundle((prev) => {
            const rest = prev.snapshots.filter((s) => !(s.holdingId === saved.holdingId && s.takenAt === saved.takenAt));
            return { ...prev, snapshots: [...rest, saved] };
          });
        } catch {
          /* keep going */
        }
        for (const mile of fresh) {
          try {
            const saved = await saveMilestone({ data: mile });
            if (saved) {
              setBundle((prev) => {
                if (prev.milestones.some((m) => m.holdingId === saved.holdingId && m.pct === saved.pct)) return prev;
                return { ...prev, milestones: [...prev.milestones, saved] };
              });
            }
          } catch {
            /* ignore */
          }
        }
        if (verNeeded) {
          try {
            const saved = await savePlanVersion({
              data: {
                holdingId: nextVer.holdingId,
                targetQuantity: nextVer.targetQuantity,
                targetDate: nextVer.targetDate,
                frequency: nextVer.frequency,
                usdPerBuy: nextVer.usdPerBuy,
                assumedPrice: nextVer.assumedPrice,
              },
            });
            setBundle((prev) => ({ ...prev, versions: [...prev.versions, saved] }));
          } catch {
            /* ignore */
          }
        }
        return snap;
      }

      upsertLocalSnapshot(snap);
      addLocalMilestones(fresh);
      if (verNeeded) addLocalVersion(nextVer);
      setBundle(readLocalProgress());
      return snap;
    },
    [bundle.milestones, bundle.snapshots, bundle.versions, user],
  );

  const ensureToday = useCallback(
    async (holdings: Holding[], plans: DcaPlan[], prices: PriceMap) => {
      if (Object.keys(prices).length < 1) return;
      const today = new Date().toISOString().slice(0, 10);
      for (const holding of holdings) {
        const already = bundle.snapshots.some((s) => s.holdingId === holding.id && s.takenAt === today);
        if (already) continue;
        const plan = plans.find((p) => p.holdingId === holding.id) ?? null;
        await recordHolding(holding, plan, prices);
      }
    },
    [bundle.snapshots, recordHolding],
  );

  const seed = useCallback(
    (partial: Partial<ProgressBundle>) => {
      if (user) return;
      const current = readLocalProgress();
      seedLocalProgress({
        snapshots: [...current.snapshots, ...(partial.snapshots ?? [])],
        milestones: [...current.milestones, ...(partial.milestones ?? [])],
        versions: [...current.versions, ...(partial.versions ?? [])],
      });
      setBundle(readLocalProgress());
    },
    [user],
  );

  const dropHolding = useCallback(
    (holdingId: string) => {
      if (!user) dropLocalHolding(holdingId);
      setBundle((prev) => ({
        snapshots: prev.snapshots.filter((s) => s.holdingId !== holdingId),
        milestones: prev.milestones.filter((m) => m.holdingId !== holdingId),
        versions: prev.versions.filter((v) => v.holdingId !== holdingId),
      }));
    },
    [user],
  );

  const forHolding = useCallback(
    (holdingId: string): ProgressBundle => ({
      snapshots: bundle.snapshots.filter((s) => s.holdingId === holdingId),
      milestones: bundle.milestones.filter((m) => m.holdingId === holdingId),
      versions: bundle.versions.filter((v) => v.holdingId === holdingId),
    }),
    [bundle],
  );

  const latestByHolding = useMemo(() => {
    const map = new Map<string, HoldingSnapshot>();
    for (const snap of bundle.snapshots) {
      const prev = map.get(snap.holdingId);
      if (!prev || snap.takenAt >= prev.takenAt) map.set(snap.holdingId, snap);
    }
    return map;
  }, [bundle.snapshots]);

  return {
    bundle,
    loaded,
    reload,
    recordHolding,
    ensureToday,
    seed,
    dropHolding,
    forHolding,
    latestByHolding,
    loadOne: listProgress,
  };
}
