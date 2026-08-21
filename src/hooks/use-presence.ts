import { useEffect, useState } from "react";
import {
  initPresence,
  isIdlePrompt,
  isRefreshPaused,
  resumePresence,
  subscribePresence,
} from "@/lib/presence";

export function usePresence() {
  const [paused, setPaused] = useState(false);
  const [prompt, setPrompt] = useState(false);

  useEffect(() => {
    initPresence();
    const sync = () => {
      setPaused(isRefreshPaused());
      setPrompt(isIdlePrompt());
    };
    sync();
    return subscribePresence(sync);
  }, []);

  return { paused, prompt, stillHere: resumePresence };
}
