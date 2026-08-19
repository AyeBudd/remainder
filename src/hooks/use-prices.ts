import { useEffect, useState } from "react";
import { getPrices, type PricePayload } from "@/lib/prices";

export function usePrices() {
  const [payload, setPayload] = useState<PricePayload>({
    prices: {},
    updatedAt: 0,
    source: "none",
  });
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const next = await getPrices();
        if (!cancelled) {
          setPayload(next);
          setStatus(next.source === "none" ? "error" : "ready");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    }
    void load();
    const timer = window.setInterval(() => void load(), 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return { ...payload, status };
}
