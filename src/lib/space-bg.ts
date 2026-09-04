export const SPACE_BG_KEY = "remaindr-space-bg";
export const SPACE_BG_EVENT = "remaindr-space-bg";

export function readSpaceBg(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(SPACE_BG_KEY) !== "0";
  } catch {
    return true;
  }
}

export function applySpaceBg(on: boolean): void {
  document.documentElement.classList.toggle("space-off", !on);
}

export function writeSpaceBg(on: boolean): void {
  window.localStorage.setItem(SPACE_BG_KEY, on ? "1" : "0");
  applySpaceBg(on);
  window.dispatchEvent(new Event(SPACE_BG_EVENT));
}
