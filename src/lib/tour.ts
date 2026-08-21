export const TOUR_STEPS = [
  {
    title: "The remainder",
    body: "That giant number on the ledger is USD still needed to hit every target. Fill % sits beside it. That’s the whole product.",
  },
  {
    title: "Each bag is a card",
    body: "Progress is percent of the way there. Green means Target Hit. Click a card for market info. The ⋯ menu edits amounts, logs a buy, or plans DCA.",
  },
  {
    title: "Cost, without the headache",
    body: "Edit amounts rewrites the stack and cost basis (total spent or Coinbase average). Add buy logs a new fill — this morning’s price if it wasn’t tonight’s print.",
  },
  {
    title: "The path",
    body: "Scroll to DCA at the bottom. Cadence + a date → dollars per buy and a chart to 100%. We’ll warn you if the ETA slips more than 25%.",
  },
  {
    title: "Other pages",
    body: "The menu on the left: What if (Realistic vs Hopium), BTC tracker, Newsletter. The eye up top hides dollars so you can flash the screen.",
  },
  {
    title: "You’re in",
    body: "Export or import CSV, connect wallets, tweak account settings. Replay this tour anytime from your name in the top right.",
  },
] as const;

const EVENT = "remaindr-tour";
const keyFor = (userId: string) => `remaindr.tour.${userId}`;

type Mode = "closed" | "offer" | "tour";

type State = {
  mode: Mode;
  step: number;
};

let state: State = { mode: "closed", step: 0 };

function emit() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENT));
}

export function readTourSeen(userId: string): boolean {
  try {
    return window.localStorage.getItem(keyFor(userId)) === "1";
  } catch {
    return false;
  }
}

export function writeTourSeen(userId: string) {
  try {
    window.localStorage.setItem(keyFor(userId), "1");
  } catch {
    /* ignore */
  }
}

export function getTourState(): State {
  return state;
}

export function startTour() {
  state = { mode: "tour", step: 0 };
  emit();
}

export function offerTour() {
  if (state.mode !== "closed") return;
  state = { mode: "offer", step: 0 };
  emit();
}

export function closeTour(userId?: string | null) {
  if (userId) writeTourSeen(userId);
  state = { mode: "closed", step: 0 };
  emit();
}

export function nextTourStep() {
  if (state.mode !== "tour") return;
  if (state.step >= TOUR_STEPS.length - 1) return;
  state = { ...state, step: state.step + 1 };
  emit();
}

export function prevTourStep() {
  if (state.mode !== "tour" || state.step <= 0) return;
  state = { ...state, step: state.step - 1 };
  emit();
}

export function subscribeTour(fn: () => void): () => void {
  window.addEventListener(EVENT, fn);
  return () => window.removeEventListener(EVENT, fn);
}
