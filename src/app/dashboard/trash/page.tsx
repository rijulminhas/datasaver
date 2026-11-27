import type { Metadata } from "next";
import { Suspense } from "react";

import EmptyState from "@/components/dashboard/EmptyState";
import PageHeader from "@/components/dashboard/PageHeader";
import { EmptyTrashButton } from "@/components/files/FileActions";
import { BulkActionsMenu, BulkProvider } from "@/components/files/BulkSelection";
import FileTable from "@/components/files/FileTable";
import { TrashIcon } from "@/components/ui/icons";
import { FileTableSkeleton, PageHeaderSkeleton } from "@/components/ui/Loading";
import Pagination, { PageSummary } from "@/components/ui/Pagination";
import { requireUser } from "@/lib/auth/dal";
import { listTrashPage } from "@/lib/files/service";
import { parsePage } from "@/lib/pagination";
import { formatBytes } from "@/lib/format";
import { storageConfig } from "@/lib/storage/config";

export const metadata: Metadata = {
  title: "Trash",
};

export default function TrashPage({ searchParams }: PageProps<"/dashboard/trash">) {
  return (
    <Suspense
      fallback={
        <>
          <PageHeaderSkeleton />
          <FileTableSkeleton label="Loading Trash…" rows={4} />
        </>
      }
    >
      <TrashContent searchParams={searchParams} />
    </Suspense>
  );
}

async function TrashContent({ searchParams }: { searchParams: PageProps<"/dashboard/trash">["searchParams"] }) {
  const [user, query] = await Promise.all([requireUser(), searchParams]);
  const { files, totalBytes, ...pageInfo } = await listTrashPage(user.id, { page: parsePage(query.page) });

  return (
    <>
      <PageHeader
        title="Trash"
        description={`Deleted files are kept for ${storageConfig.trashRetentionDays} days, then permanently deleted. Files in Trash still use storage space.`}
        actions={pageInfo.total > 0 ? <EmptyTrashButton count={pageInfo.total} /> : undefined}
      />
      {pageInfo.total === 0 ? (
        <EmptyState
          icon={TrashIcon}
          title="Trash is empty"
          description={`Files you delete appear here and can be restored for ${storageConfig.trashRetentionDays} days.`}
        />
      ) : (
        <BulkProvider fileIds={files.map((f) => f.id)} mode="trash">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex flex-wrap items-baseline gap-x-1.5">
              <PageSummary {...pageInfo} noun={["file", "files"]} />
              <span className="text-sm text-slate-500">· {formatBytes(totalBytes)} in Trash</span>
            </div>
            <BulkActionsMenu />
          </div>
          <FileTable files={files} mode="trash" />
          <Pagination {...pageInfo} basePath="/dashboard/trash" />
        </BulkProvider>
      )}
    </>
  );
}
