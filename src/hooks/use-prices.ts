import { useCallback, useEffect, useState } from "react";
import { ASSETS, setActiveCatalog, type Asset } from "@/lib/assets";
import { getMarket } from "@/lib/catalog";
import { initPresence, isRefreshPaused, subscribePresence } from "@/lib/presence";
import type { PricePayload } from "@/lib/prices";

export function usePrices() {
  const [payload, setPayload] = useState<PricePayload>({
    prices: {},
    changes: {},
    updatedAt: 0,
    source: "none",
  });
  const [assets, setAssets] = useState<Asset[]>(ASSETS);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [refreshing, setRefreshing] = useState(false);

  const apply = useCallback((next: Awaited<ReturnType<typeof getMarket>>) => {
    if (next.assets.length >= 20) {
      setActiveCatalog(next.assets);
      setAssets(next.assets);
    }
    setPayload({
      prices: next.prices,
      changes: next.changes ?? {},
      updatedAt: next.updatedAt,
      source: next.source === "baked" ? "none" : next.source,
    });
    setStatus(next.source === "baked" || Object.keys(next.prices).length < 3 ? "error" : "ready");
  }, []);

  const refresh = useCallback(
    async (force = true) => {
      setRefreshing(true);
      try {
        const next = await getMarket({ data: { force } });
        apply(next);
      } catch {
        setStatus("error");
      } finally {
        setRefreshing(false);
      }
    },
    [apply],
  );

  useEffect(() => {
    let cancelled = false;
    let wasPaused = isRefreshPaused();
    async function load() {
      if (isRefreshPaused()) return;
      try {
        const next = await getMarket({ data: { force: false } });
        if (cancelled) return;
        apply(next);
      } catch {
        if (!cancelled) setStatus("error");
      }
    }
    initPresence();
    void load();
    const timer = window.setInterval(() => void load(), 5 * 60_000);
    const unsub = subscribePresence(() => {
      const paused = isRefreshPaused();
      if (wasPaused && !paused) void load();
      wasPaused = paused;
    });
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      unsub();
    };
  }, [apply]);

  return { ...payload, status, assets, refreshing, refresh };
}
