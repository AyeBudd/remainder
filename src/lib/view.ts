export type AppView = "ledger" | "what-if" | "btc";

const VIEW_KEY = "remainder.view";
const VIEWS = new Set<AppView>(["ledger", "what-if", "btc"]);

export function parseAppView(raw: string | null | undefined): AppView {
  if (raw && VIEWS.has(raw as AppView)) return raw as AppView;
  return "ledger";
}

export function readAppView(): AppView {
  if (typeof window === "undefined") return "ledger";
  const hash = window.location.hash.replace(/^#\/?/, "");
  if (hash && VIEWS.has(hash as AppView)) return hash as AppView;
  try {
    return parseAppView(window.localStorage.getItem(VIEW_KEY));
  } catch {
    return "ledger";
  }
}

export function writeAppView(view: AppView) {
  try {
    window.localStorage.setItem(VIEW_KEY, view);
  } catch {
    /* ignore quota */
  }
  if (typeof window === "undefined") return;
  const next = view === "ledger" ? "#/" : `#/${view}`;
  if (window.location.hash !== next) {
    window.history.replaceState(null, "", next);
  }
}
