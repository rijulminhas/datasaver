// Shared pagination settings and helpers (safe for server and client code).

/** Items per page in every list: 16 fills a 4×4 card grid exactly. */
export const PAGE_SIZE = 16;

const MAX_PAGE = 100_000;

/** Parse a `?page=` value: anything missing or invalid becomes page 1. */
export function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const page = Number(raw);
  return Number.isSafeInteger(page) && page >= 1 ? Math.min(page, MAX_PAGE) : 1;
}

export type PageInfo = {
  /** Current page (1-based), already clamped to the valid range. */
  page: number;
  pageCount: number;
  pageSize: number;
  /** Total matching items across all pages. */
  total: number;
};

/** Clamp a requested page against a total and return the SQL offset. */
export function resolvePage(requested: number, total: number, pageSize = PAGE_SIZE) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, requested), pageCount);
  return { page, pageCount, pageSize, total, offset: (page - 1) * pageSize };
}
