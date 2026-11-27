import { SpinnerIcon } from "@/components/ui/icons";

/**
 * Shared loading UI. Every Suspense fallback and loading.tsx uses these so
 * loading always looks the same: a visible spinner + message, and grey
 * placeholders shaped like the content that is about to appear.
 */

const bar = "animate-pulse rounded-md bg-slate-200";

/** Spinner with a message, announced to screen readers. */
export function LoadingIndicator({ label = "Loading…", className = "" }: { label?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={`flex items-center gap-2 text-sm font-medium text-slate-500 ${className}`}>
      <SpinnerIcon width={16} height={16} className="text-indigo-600" />
      <span>{label}</span>
    </div>
  );
}

/** Placeholder for a page title + description (+ action buttons). */
export function PageHeaderSkeleton({ actions = 1 }: { actions?: number }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between" aria-hidden="true">
      <div className="space-y-2.5">
        <div className={`h-8 w-48 ${bar}`} />
        <div className={`h-4 w-72 max-w-full ${bar}`} />
      </div>
      {actions > 0 && (
        <div className="flex gap-2">
          {Array.from({ length: actions }, (_, i) => (
            <div key={i} className={`h-10 w-32 rounded-xl ${bar}`} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Placeholder shaped like FileTable. */
export function FileTableSkeleton({ rows = 6, label = "Loading your files…" }: { rows?: number; label?: string }) {
  return (
    <div aria-busy="true">
      <LoadingIndicator label={label} className="mb-3" />
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-hidden="true">
        <div className="flex items-center gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3.5 sm:px-5">
          <div className={`h-3 w-16 ${bar}`} />
          <div className={`ml-auto hidden h-3 w-12 sm:block ${bar}`} />
          <div className={`hidden h-3 w-20 lg:block ${bar}`} />
        </div>
        <div className="divide-y divide-slate-100">
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <div className={`h-9 w-9 shrink-0 rounded-lg ${bar}`} />
              <div className="min-w-0 flex-1 space-y-2">
                <div className={`h-3.5 ${bar}`} style={{ width: `${45 + ((i * 17) % 35)}%` }} />
                <div className={`h-3 w-24 sm:hidden ${bar}`} />
              </div>
              <div className={`hidden h-3.5 w-14 sm:block ${bar}`} />
              <div className={`hidden h-3.5 w-24 lg:block ${bar}`} />
              <div className={`h-7 w-20 rounded-lg ${bar}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Placeholder shaped like PhotoGrid. */
export function PhotoGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div aria-busy="true">
      <LoadingIndicator label="Loading your photos…" className="mb-3" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-hidden="true">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="aspect-square animate-pulse bg-slate-200" />
            <div className="space-y-2 p-3">
              <div className={`h-3.5 w-3/4 ${bar}`} />
              <div className={`h-3 w-1/2 ${bar}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Placeholder shaped like FolderGrid. */
export function FolderGridSkeleton({ count = 4, label = "Loading folders…" }: { count?: number; label?: string }) {
  return (
    <div aria-busy="true">
      <LoadingIndicator label={label} className="mb-3" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-hidden="true">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
            <div className={`h-10 w-10 shrink-0 rounded-xl ${bar}`} />
            <div className="flex-1 space-y-2">
              <div className={`h-3.5 w-2/3 ${bar}`} />
              <div className={`h-3 w-1/3 ${bar}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Placeholder for a settings/profile style card with label + value rows. */
export function CardSkeleton({ rows = 4, label = "Loading…" }: { rows?: number; label?: string }) {
  return (
    <div aria-busy="true">
      <LoadingIndicator label={label} className="mb-3" />
      <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-hidden="true">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className={`h-10 w-10 shrink-0 rounded-xl ${bar}`} />
            <div className="flex-1 space-y-2">
              <div className={`h-3 w-24 ${bar}`} />
              <div className={`h-4 ${bar}`} style={{ width: `${40 + ((i * 13) % 30)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Whole-page fallback (route loading.tsx): header + file list placeholder. */
export function PageSkeleton({ label = "Loading…" }: { label?: string }) {
  return (
    <div aria-busy="true">
      <PageHeaderSkeleton />
      <FileTableSkeleton label={label} rows={5} />
    </div>
  );
}
