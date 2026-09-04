import { useCallback, useEffect, useState } from "react";
import { applySpaceBg, readSpaceBg, SPACE_BG_EVENT, writeSpaceBg } from "@/lib/space-bg";

export function useSpaceBg() {
  const [on, setOn] = useState(true);

  useEffect(() => {
    const next = readSpaceBg();
    setOn(next);
    applySpaceBg(next);
    const sync = () => {
      const current = readSpaceBg();
      setOn(current);
      applySpaceBg(current);
    };
    window.addEventListener(SPACE_BG_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SPACE_BG_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggle = useCallback(() => {
    setOn((prev) => {
      const next = !prev;
      writeSpaceBg(next);
      return next;
    });
  }, []);

  return { on, toggle };
}
