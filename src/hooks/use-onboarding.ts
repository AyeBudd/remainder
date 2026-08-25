import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { writeTourSeen } from "@/lib/tour";
import {
  emptyDraft,
  shouldShowOnboarding,
  type OnboardingDraft,
} from "@/lib/onboarding";
import { getOnboarding, setOnboarding } from "@/lib/progress-store";
import { readOnboardingLocal, writeOnboardingLocal } from "@/lib/progress-local";

const JUST_KEY = "remaindr.justOnboarded";
const ONBOARDING_UI = "remaindr-onboarding-ui";

export type JustOnboarded = {
  symbol: string;
  current: number;
  target: number;
  remaining: number;
  targetDate: string | null;
  usdPerBuy: number | null;
};

export function readJustOnboarded(): JustOnboarded | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(JUST_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as JustOnboarded;
  } catch {
    return null;
  }
}

export function writeJustOnboarded(value: JustOnboarded | null) {
  if (typeof window === "undefined") return;
  try {
    if (!value) window.sessionStorage.removeItem(JUST_KEY);
    else window.sessionStorage.setItem(JUST_KEY, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function emitOnboardingUi(show: boolean) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ONBOARDING_UI, { detail: { show } }));
}

export function subscribeOnboardingUi(fn: (show: boolean) => void): () => void {
  const on = (e: Event) => fn(Boolean((e as CustomEvent<{ show?: boolean }>).detail?.show));
  window.addEventListener(ONBOARDING_UI, on);
  return () => window.removeEventListener(ONBOARDING_UI, on);
}

export function useOnboarding(opts: { booted: boolean; holdingsCount: number }) {
  const { user } = useCurrentUserState();
  const [completed, setCompleted] = useState(false);
  const [ready, setReady] = useState(false);
  const [forced, setForced] = useState(false);
  const [draft, setDraftState] = useState<OnboardingDraft>(emptyDraft);

  useLayoutEffect(() => {
    const local = readOnboardingLocal();
    if (local.draft && typeof local.draft === "object") {
      setDraftState({ ...emptyDraft(), ...(local.draft as Partial<OnboardingDraft>) });
    }
    if (!user) {
      setCompleted(Boolean(local.completed));
      setReady(true);
      return;
    }
    let cancelled = false;
    void getOnboarding()
      .then((row) => {
        if (!cancelled) setCompleted(Boolean(row.completed) || Boolean(local.completed));
      })
      .catch(() => {
        if (!cancelled) setCompleted(Boolean(local.completed));
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const persistDraft = useCallback(
    (next: OnboardingDraft) => {
      setDraftState(next);
      const local = readOnboardingLocal();
      writeOnboardingLocal({ ...local, draft: next });
    },
    [],
  );

  const markDone = useCallback(
    async (done: boolean, opts?: { seenTour?: boolean }) => {
      setCompleted(done);
      const local = readOnboardingLocal();
      writeOnboardingLocal({ ...local, completed: done, draft: done ? null : local.draft });
      if (user) {
        try {
          await setOnboarding({ data: { completed: done } });
        } catch {
          /* guest-style local flag still set */
        }
        if (done && opts?.seenTour) writeTourSeen(user.id);
      }
    },
    [user],
  );

  useEffect(() => {
    if (!ready || !opts.booted) return;
    if (opts.holdingsCount > 0 && !completed) void markDone(true);
  }, [completed, markDone, opts.booted, opts.holdingsCount, ready]);

  const show = useMemo(() => {
    if (forced) return true;
    if (!ready) return false;
    return shouldShowOnboarding({
      booted: opts.booted,
      completed,
      holdingsCount: opts.holdingsCount,
    });
  }, [completed, forced, opts.booted, opts.holdingsCount, ready]);

  return {
    show,
    ready,
    completed,
    draft,
    setDraft: persistDraft,
    skip: () => {
      setForced(false);
      writeJustOnboarded(null);
      void markDone(true, { seenTour: true });
    },
    complete: () => {
      setForced(false);
      void markDone(true, { seenTour: true });
    },
    restart: () => {
      setDraftState(emptyDraft());
      writeOnboardingLocal({ completed: false, draft: emptyDraft() });
      setCompleted(false);
      setForced(true);
      if (user) {
        void setOnboarding({ data: { completed: false } }).catch(() => undefined);
      }
    },
  };
}