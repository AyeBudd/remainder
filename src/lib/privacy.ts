export const HIDE_AMOUNTS_KEY = "remaindr-hide-amounts";
export const HIDE_AMOUNTS_EVENT = "remaindr-privacy";
export const HIDDEN_AMOUNT = "•••";

export function readHideAmounts(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(HIDE_AMOUNTS_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeHideAmounts(hidden: boolean): void {
  window.localStorage.setItem(HIDE_AMOUNTS_KEY, hidden ? "1" : "0");
  window.dispatchEvent(new Event(HIDE_AMOUNTS_EVENT));
}

export function veil(hidden: boolean, value: string): string {
  return hidden ? HIDDEN_AMOUNT : value;
}
