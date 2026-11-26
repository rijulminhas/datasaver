import Link from "next/link";

import { HardDriveIcon } from "@/components/ui/icons";
import { requireUser } from "@/lib/auth/dal";
import { getStorageOverview } from "@/lib/files/overview";
import { formatBytes } from "@/lib/format";

// Compact quota meter in the sidebar footer. Render inside <Suspense>.
export default async function SidebarStorage() {
  const user = await requireUser();
  const { usedBytes, quotaBytes } = await getStorageOverview(user.id);
  const ratio = quotaBytes > 0 ? Math.min(1, usedBytes / quotaBytes) : 0;
  const fill = ratio >= 0.9 ? "bg-red-500" : ratio >= 0.75 ? "bg-amber-500" : "bg-indigo-600";

  return (
    <Link href="/dashboard/settings" className="block rounded-xl p-2 transition hover:bg-slate-50">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <HardDriveIcon width={16} height={16} className="text-slate-400" />
        Storage
      </div>
      <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-indigo-100">
        <div className={`h-full rounded-full ${fill}`} style={{ width: `${ratio * 100}%` }} />
      </div>
      <p className="mt-2 text-xs text-slate-500 tabular-nums">
        {formatBytes(usedBytes)} of {formatBytes(quotaBytes)} used
      </p>
    </Link>
  );
}

export function SidebarStorageSkeleton() {
  return (
    <div className="p-2" aria-hidden="true">
      <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
      <div className="mt-3 h-1.5 w-full animate-pulse rounded-full bg-slate-100" />
      <div className="mt-2.5 h-3 w-28 animate-pulse rounded bg-slate-100" />
    </div>
  );
}
