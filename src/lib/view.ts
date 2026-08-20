export type AppView = "ledger" | "what-if";

const VIEW_KEY = "remainder.view";

export function parseAppView(raw: string | null | undefined): AppView {
  return raw === "what-if" ? "what-if" : "ledger";
}

export function readAppView(): AppView {
  if (typeof window === "undefined") return "ledger";
  const hash = window.location.hash.replace(/^#\/?/, "");
  if (hash === "what-if") return "what-if";
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
  const next = view === "what-if" ? "#/what-if" : "#/";
  if (window.location.hash !== next) {
    window.history.replaceState(null, "", next);
  }
}
