import type { Metadata } from "next";
import { Suspense } from "react";

import EmptyState from "@/components/dashboard/EmptyState";
import PageHeader from "@/components/dashboard/PageHeader";
import { EmptyTrashButton } from "@/components/files/FileActions";
import FileTable from "@/components/files/FileTable";
import { TrashIcon } from "@/components/ui/icons";
import { requireUser } from "@/lib/auth/dal";
import { listTrash } from "@/lib/files/service";
import { formatBytes } from "@/lib/format";
import { storageConfig } from "@/lib/storage/config";

export const metadata: Metadata = {
  title: "Trash",
};

export default function TrashPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white" />}>
      <TrashContent />
    </Suspense>
  );
}

async function TrashContent() {
  const user = await requireUser();
  const files = await listTrash(user.id);
  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);

  return (
    <>
      <PageHeader
        title="Trash"
        description={`Deleted files are kept for ${storageConfig.trashRetentionDays} days, then permanently deleted. Files in Trash still use storage space.`}
        actions={files.length > 0 ? <EmptyTrashButton count={files.length} /> : undefined}
      />
      {files.length === 0 ? (
        <EmptyState
          icon={TrashIcon}
          title="Trash is empty"
          description={`Files you delete appear here and can be restored for ${storageConfig.trashRetentionDays} days.`}
        />
      ) : (
        <>
          <p className="mb-3 text-sm text-slate-500">
            {files.length} {files.length === 1 ? "file" : "files"} · {formatBytes(totalBytes)}
          </p>
          <FileTable files={files} mode="trash" />
        </>
      )}
    </>
  );
}
