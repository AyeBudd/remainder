const IDLE_MS = 5 * 60_000;
const ACTIVITY = ["pointerdown", "keydown", "scroll", "touchstart", "wheel"] as const;

type Listener = () => void;

let booted = false;
let idle = false;
let hidden = false;
const listeners = new Set<Listener>();
let idleTimer = 0;

function emit() {
  listeners.forEach((fn) => fn());
}

function armIdle() {
  window.clearTimeout(idleTimer);
  if (hidden || idle) return;
  idleTimer = window.setTimeout(() => {
    if (document.hidden) return;
    idle = true;
    emit();
  }, IDLE_MS);
}

function onActivity() {
  if (idle) return;
  armIdle();
}

function onVisibility() {
  hidden = document.hidden;
  if (hidden) {
    window.clearTimeout(idleTimer);
    emit();
    return;
  }
  if (!idle) armIdle();
  emit();
}

export function initPresence() {
  if (typeof window === "undefined" || booted) return;
  booted = true;
  hidden = document.hidden;
  for (const event of ACTIVITY) {
    window.addEventListener(event, onActivity, { passive: true });
  }
  document.addEventListener("visibilitychange", onVisibility);
  armIdle();
}

export function isRefreshPaused(): boolean {
  return idle || hidden;
}

export function isIdlePrompt(): boolean {
  return idle && !hidden;
}

export function resumePresence() {
  idle = false;
  hidden = typeof document !== "undefined" ? document.hidden : false;
  armIdle();
  emit();
}

export function subscribePresence(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
