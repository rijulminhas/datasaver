const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB"];

/** 1536 -> "1.5 KB". Uses 1024-based units, matching how quotas are set. */
export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  let exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), BYTE_UNITS.length - 1);
  let value = bytes / 1024 ** exponent;
  // 1023.8 MB reads better as "1 GB".
  if (value >= 999.5 && exponent < BYTE_UNITS.length - 1) {
    exponent++;
    value = bytes / 1024 ** exponent;
  }
  const digits = value >= 100 || exponent === 0 ? 0 : 1;
  return `${value.toFixed(digits).replace(/\.0$/, "")} ${BYTE_UNITS[exponent]}`;
}

const countFormatter = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

/** 1284 -> "1.3K" */
export function formatCount(count: number) {
  return count < 10_000 ? count.toLocaleString("en") : countFormatter.format(count);
}

/** Stable, locale-neutral date for server rendering: "26 Nov 2026". */
export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatPercent(ratio: number) {
  if (ratio <= 0) return "0%";
  if (ratio < 0.01) return "<1%";
  return `${Math.round(ratio * 100)}%`;
}
