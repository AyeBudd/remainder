import { useCallback, useEffect, useState } from "react";
import { HIDE_AMOUNTS_EVENT, readHideAmounts, writeHideAmounts } from "@/lib/privacy";

export function useHideAmounts() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setHidden(readHideAmounts());
    const sync = () => setHidden(readHideAmounts());
    window.addEventListener(HIDE_AMOUNTS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(HIDE_AMOUNTS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggle = useCallback(() => {
    setHidden((prev) => {
      const next = !prev;
      writeHideAmounts(next);
      return next;
    });
  }, []);

  return { hidden, toggle };
}
