import Link from "next/link";

import { LinkPendingSpinner } from "@/components/ui/LinkPending";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import type { PageInfo } from "@/lib/pagination";

interface PaginationProps extends PageInfo {
  /** Page URL without the query string, e.g. "/dashboard/photos". */
  basePath: string;
}

function hrefFor(basePath: string, page: number) {
  return page <= 1 ? basePath : `${basePath}?page=${page}`;
}

/** Page numbers to show: first, last, and a window around the current page, with gaps. */
function pageItems(page: number, pageCount: number): (number | "gap")[] {
  const pages = new Set([1, pageCount, page - 1, page, page + 1]);
  // Show a full run instead of a gap that would hide just one page.
  if (page <= 4) [2, 3, 4, 5].forEach((p) => pages.add(p));
  if (page >= pageCount - 3) [pageCount - 4, pageCount - 3, pageCount - 2, pageCount - 1].forEach((p) => pages.add(p));
  const sorted = [...pages].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b);

  const items: (number | "gap")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) items.push("gap");
    items.push(p);
  });
  return items;
}

const baseButton =
  "inline-flex h-9 min-w-9 items-center justify-center gap-1 rounded-lg px-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300";

/** "Showing x–y of z" line. Rendered above lists; safe to show with a single page. */
export function PageSummary({ page, pageSize, total, noun }: PageInfo & { noun: [singular: string, plural: string] }) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const label = total === 1 ? noun[0] : noun[1];
  return (
    <p className="text-sm text-slate-500">
      {total <= pageSize ? (
        <>
          {total} {label}
        </>
      ) : (
        <>
          Showing <span className="font-medium text-slate-700">{from}–{to}</span> of{" "}
          <span className="font-medium text-slate-700">{total}</span> {label}
        </>
      )}
    </p>
  );
}

/** Previous / page numbers / Next. Renders nothing when everything fits on one page. */
export default function Pagination({ page, pageCount, basePath }: PaginationProps) {
  if (pageCount <= 1) return null;

  const prevDisabled = page <= 1;
  const nextDisabled = page >= pageCount;

  return (
    <nav aria-label="Pagination" className="mt-6 flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
      {prevDisabled ? (
        <span className={`${baseButton} cursor-not-allowed border border-slate-200 text-slate-300`} aria-disabled="true">
          <ChevronLeftIcon width={16} height={16} />
          <span className="hidden sm:inline">Previous</span>
        </span>
      ) : (
        <Link href={hrefFor(basePath, page - 1)} rel="prev" className={`${baseButton} relative border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}>
          <LinkPendingSpinner />
          <ChevronLeftIcon width={16} height={16} />
          <span className="hidden sm:inline">Previous</span>
          <span className="sr-only sm:hidden">Previous page</span>
        </Link>
      )}

      {/* Phones: compact "Page x of y". Larger screens: numbered pages. */}
      <p className="text-sm text-slate-600 sm:hidden">
        Page <span className="font-semibold text-slate-900">{page}</span> of {pageCount}
      </p>
      <ol className="hidden items-center gap-1 sm:flex">
        {pageItems(page, pageCount).map((item, i) =>
          item === "gap" ? (
            <li key={`gap-${i}`} className="px-1 text-sm text-slate-400" aria-hidden="true">
              …
            </li>
          ) : (
            <li key={item}>
              {item === page ? (
                <span aria-current="page" className={`${baseButton} bg-indigo-600 font-semibold text-white shadow-sm`}>
                  {item}
                </span>
              ) : (
                <Link href={hrefFor(basePath, item)} aria-label={`Page ${item}`} className={`${baseButton} relative text-slate-600 hover:bg-slate-100 hover:text-slate-900`}>
                  {item}
                  <LinkPendingSpinner />
                </Link>
              )}
            </li>
          )
        )}
      </ol>

      {nextDisabled ? (
        <span className={`${baseButton} cursor-not-allowed border border-slate-200 text-slate-300`} aria-disabled="true">
          <span className="hidden sm:inline">Next</span>
          <ChevronRightIcon width={16} height={16} />
        </span>
      ) : (
        <Link href={hrefFor(basePath, page + 1)} rel="next" className={`${baseButton} relative border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}>
          <LinkPendingSpinner />
          <span className="hidden sm:inline">Next</span>
          <span className="sr-only sm:hidden">Next page</span>
          <ChevronRightIcon width={16} height={16} />
        </Link>
      )}
    </nav>
  );
}
