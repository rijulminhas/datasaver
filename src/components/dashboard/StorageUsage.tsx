import { CATEGORY_META, FILE_CATEGORIES, type FileCategory } from "@/lib/files/categories";
import type { CategoryUsage } from "@/lib/files/overview";
import { formatBytes, formatCount, formatPercent } from "@/lib/format";

interface StorageUsageProps {
  usedBytes: number;
  quotaBytes: number;
  byCategory: Record<FileCategory, CategoryUsage>;
  trash: CategoryUsage;
}

const TRASH_COLOR = "#94a3b8"; // slate-400: neutral, not a category hue

function filesLabel(count: number) {
  return `${formatCount(count)} ${count === 1 ? "file" : "files"}`;
}

/**
 * Thin segmented bar: the quota is the whole, each category a part, the
 * remainder the track. Identity is never color-alone — every part has a
 * hover label and the legend lists each part's size and count.
 */
export default function StorageUsage({ usedBytes, quotaBytes, byCategory, trash }: StorageUsageProps) {
  const ratio = quotaBytes > 0 ? usedBytes / quotaBytes : 0;
  const nearlyFull = ratio >= 0.9;

  const parts = [
    ...FILE_CATEGORIES.map((c) => ({ key: c, label: CATEGORY_META[c].label, color: CATEGORY_META[c].color, ...byCategory[c] })),
    { key: "trash", label: "Trash", color: TRASH_COLOR, ...trash },
  ];
  const visibleParts = parts.filter((p) => p.bytes > 0);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="storage-heading">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="storage-heading" className="text-base font-semibold text-slate-900">Storage usage</h2>
          <p className="mt-1 text-sm text-slate-500">
            <span className="font-semibold text-slate-900 tabular-nums">{formatBytes(usedBytes)}</span> of{" "}
            {formatBytes(quotaBytes)} used
          </p>
        </div>
        <p className={`text-sm font-semibold tabular-nums ${nearlyFull ? "text-red-600" : "text-slate-700"}`}>
          {formatPercent(ratio)}
        </p>
      </div>

      <div
        role="img"
        aria-label={`${formatBytes(usedBytes)} of ${formatBytes(quotaBytes)} used. ${
          visibleParts.length
            ? visibleParts.map((p) => `${p.label}: ${formatBytes(p.bytes)}`).join(", ")
            : "No files stored."
        }`}
        className="mt-4 flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-slate-100"
      >
        {visibleParts.map((part) => {
          const share = part.bytes / quotaBytes;
          return (
            <div
              key={part.key}
              title={`${part.label}: ${formatBytes(part.bytes)} (${formatPercent(share)})`}
              className="h-full"
              style={{ width: `${Math.max(share * 100, 0.75)}%`, backgroundColor: part.color }}
            />
          );
        })}
      </div>

      {nearlyFull && (
        <p className="mt-3 text-xs font-medium text-red-600" role="status">
          You are almost out of storage. Delete files you no longer need or empty the Trash to free up space.
        </p>
      )}

      {/* Legend doubles as the table view: every part's size and count. */}
      <ul className="mt-5 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        {parts.map((part) => (
          <li key={part.key} className="flex items-center gap-2.5 text-sm">
            <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: part.color }} />
            <span className="text-slate-700">{part.label}</span>
            <span className="ml-auto whitespace-nowrap text-slate-500 tabular-nums">
              {formatBytes(part.bytes)} · {filesLabel(part.count)}
            </span>
          </li>
        ))}
        <li className="flex items-center gap-2.5 text-sm">
          <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-slate-200" />
          <span className="text-slate-700">Available</span>
          <span className="ml-auto whitespace-nowrap text-slate-500 tabular-nums">
            {formatBytes(Math.max(0, quotaBytes - usedBytes))}
          </span>
        </li>
      </ul>
    </section>
  );
}
