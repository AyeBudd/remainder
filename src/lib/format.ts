import { getAsset } from "./assets";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const usdPrecise = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const usdCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatUsd(value: number, opts?: { compact?: boolean; precise?: boolean }): string {
  if (!Number.isFinite(value)) return "—";
  if (opts?.compact && Math.abs(value) >= 10_000) return usdCompact.format(value);
  if (opts?.precise || Math.abs(value) < 100) return usdPrecise.format(value);
  return usd.format(value);
}

export function formatCoins(amount: number, symbol: string): string {
  if (!Number.isFinite(amount)) return "—";
  const decimals = getAsset(symbol)?.decimals ?? 4;
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(amount);
  return formatted;
}

export function formatPercent(ratio: number): string {
  if (!Number.isFinite(ratio)) return "—";
  const pct = ratio * 100;
  const digits = pct >= 10 ? 0 : 1;
  return `${pct.toFixed(digits)}%`;
}

export function formatAddress(address: string): string {
  if (address.length < 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function formatUpdated(at: number, now = Date.now()): string {
  if (!at) return "not yet";
  const sec = Math.max(0, Math.round((now - at) / 1000));
  if (sec < 15) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  return new Date(at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/,/g, "").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}
