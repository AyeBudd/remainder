import type { HoldingMilestone, HoldingSnapshot, PlanVersion, ProgressBundle } from "@/lib/progress";

const KEY = "remainder.progress.v1";

function empty(): ProgressBundle {
  return { snapshots: [], milestones: [], versions: [] };
}

export function readLocalProgress(): ProgressBundle {
  if (typeof window === "undefined") return empty();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as ProgressBundle;
    return {
      snapshots: Array.isArray(parsed.snapshots) ? parsed.snapshots : [],
      milestones: Array.isArray(parsed.milestones) ? parsed.milestones : [],
      versions: Array.isArray(parsed.versions) ? parsed.versions : [],
    };
  } catch {
    return empty();
  }
}

export function writeLocalProgress(bundle: ProgressBundle) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(bundle));
  } catch {
    /* quota */
  }
}

export function upsertLocalSnapshot(snap: HoldingSnapshot): ProgressBundle {
  const bundle = readLocalProgress();
  const idx = bundle.snapshots.findIndex((s) => s.holdingId === snap.holdingId && s.takenAt === snap.takenAt);
  const next = [...bundle.snapshots];
  if (idx >= 0) next[idx] = { ...next[idx], ...snap, id: next[idx].id };
  else next.push(snap);
  const updated = { ...bundle, snapshots: next };
  writeLocalProgress(updated);
  return updated;
}

export function addLocalMilestones(miles: HoldingMilestone[]): ProgressBundle {
  if (miles.length === 0) return readLocalProgress();
  const bundle = readLocalProgress();
  const have = new Set(bundle.milestones.map((m) => `${m.holdingId}:${m.pct}`));
  const extra = miles.filter((m) => !have.has(`${m.holdingId}:${m.pct}`));
  if (extra.length === 0) return bundle;
  const updated = { ...bundle, milestones: [...bundle.milestones, ...extra] };
  writeLocalProgress(updated);
  return updated;
}

export function addLocalVersion(version: PlanVersion): ProgressBundle {
  const bundle = readLocalProgress();
  const updated = { ...bundle, versions: [...bundle.versions, version] };
  writeLocalProgress(updated);
  return updated;
}

export function seedLocalProgress(bundle: ProgressBundle) {
  writeLocalProgress(bundle);
}

export function dropLocalHolding(holdingId: string): ProgressBundle {
  const bundle = readLocalProgress();
  const updated = {
    snapshots: bundle.snapshots.filter((s) => s.holdingId !== holdingId),
    milestones: bundle.milestones.filter((m) => m.holdingId !== holdingId),
    versions: bundle.versions.filter((v) => v.holdingId !== holdingId),
  };
  writeLocalProgress(updated);
  return updated;
}

export function clearLocalProgress() {
  writeLocalProgress(empty());
}

const ONBOARD_KEY = "remainder.onboarding.v1";

export type OnboardingLocal = {
  completed: boolean;
  draft: unknown | null;
};

export function readOnboardingLocal(): OnboardingLocal {
  if (typeof window === "undefined") return { completed: false, draft: null };
  try {
    const raw = window.localStorage.getItem(ONBOARD_KEY);
    if (!raw) return { completed: false, draft: null };
    const parsed = JSON.parse(raw) as OnboardingLocal;
    return { completed: Boolean(parsed.completed), draft: parsed.draft ?? null };
  } catch {
    return { completed: false, draft: null };
  }
}

export function writeOnboardingLocal(state: OnboardingLocal) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ONBOARD_KEY, JSON.stringify(state));
  } catch {
    /* quota */
  }
}
