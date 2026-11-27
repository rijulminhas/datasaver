import type { Metadata } from "next";
import { Suspense } from "react";

import PageHeader from "@/components/dashboard/PageHeader";
import RecentFiles from "@/components/dashboard/RecentFiles";
import { CATEGORY_ICONS } from "@/components/files/categoryIcons";
import UploadDialog from "@/components/files/UploadDialog";
import { LoadingIndicator, PageHeaderSkeleton } from "@/components/ui/Loading";
import StatCard from "@/components/dashboard/StatCard";
import StorageUsage from "@/components/dashboard/StorageUsage";
import { FilesIcon, HardDriveIcon, CloudIcon } from "@/components/ui/icons";
import { requireUser } from "@/lib/auth/dal";
import { CATEGORY_META } from "@/lib/files/categories";
import { getStorageOverview } from "@/lib/files/overview";
import { formatBytes, formatCount, formatPercent } from "@/lib/format";
import { storageConfig } from "@/lib/storage/config";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <Suspense fallback={<OverviewSkeleton />}>
      <Overview />
    </Suspense>
  );
}

async function Overview() {
  const user = await requireUser();
  const overview = await getStorageOverview(user.id);
  const firstName = user.name.trim().split(/\s+/)[0];
  const usedRatio = overview.quotaBytes > 0 ? overview.usedBytes / overview.quotaBytes : 0;

  const categoryCards = (["photos", "videos", "documents", "audio"] as const).map((category) => ({
    category,
    ...overview.byCategory[category],
  }));

  return (
    <>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Here's an overview of your files and storage."
        actions={<UploadDialog maxFileBytes={storageConfig.maxFileBytes} />}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total files"
          value={formatCount(overview.totalFiles)}
          detail="Across all folders"
          icon={FilesIcon}
          href="/dashboard/files"
        />
        <StatCard
          label="Storage used"
          value={formatBytes(overview.usedBytes)}
          detail={`${formatPercent(usedRatio)} of your ${formatBytes(overview.quotaBytes)} plan`}
          icon={HardDriveIcon}
        />
        <StatCard
          label="Available storage"
          value={formatBytes(overview.availableBytes)}
          detail="Free space remaining"
          icon={CloudIcon}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {categoryCards.map(({ category, count, bytes }) => (
          <StatCard
            key={category}
            label={CATEGORY_META[category].label}
            value={formatCount(count)}
            detail={formatBytes(bytes)}
            icon={CATEGORY_ICONS[category]}
            accent={CATEGORY_META[category].color}
            href={CATEGORY_META[category].href}
          />
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="xl:col-span-2">
          <StorageUsage
            usedBytes={overview.usedBytes}
            quotaBytes={overview.quotaBytes}
            byCategory={overview.byCategory}
            trash={overview.trash}
          />
        </div>
        <div className="xl:col-span-3">
          <RecentFiles files={overview.recentFiles} />
        </div>
      </div>
    </>
  );
}

function OverviewSkeleton() {
  const block = "animate-pulse rounded-2xl bg-slate-200/70";
  return (
    <div aria-busy="true">
      <PageHeaderSkeleton />
      <LoadingIndicator label="Loading your dashboard…" className="mb-4" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => <div key={i} className={`h-32 ${block}`} />)}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className={`h-32 ${block}`} />)}
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className={`h-64 xl:col-span-2 ${block}`} />
        <div className={`h-64 xl:col-span-3 ${block}`} />
      </div>
    </div>
  );
}
