import { Suspense } from "react";

import EmptyState from "@/components/dashboard/EmptyState";
import PageHeader from "@/components/dashboard/PageHeader";
import FileTable from "@/components/files/FileTable";
import PhotoGrid from "@/components/files/PhotoGrid";
import UploadDialog from "@/components/files/UploadDialog";
import type { FilesIcon } from "@/components/ui/icons";
import { FileTableSkeleton, PhotoGridSkeleton } from "@/components/ui/Loading";
import { requireUser } from "@/lib/auth/dal";
import type { FileCategory } from "@/lib/files/categories";
import { listFiles } from "@/lib/files/service";
import { storageConfig } from "@/lib/storage/config";

interface LibraryPageProps {
  title: string;
  description: string;
  icon: typeof FilesIcon;
  emptyTitle: string;
  emptyDescription: string;
  /** Limit to one category; omit for All Files. */
  category?: FileCategory;
}

// Shared page for All Files / Photos / Videos / Documents / Audio.
// Phase 4 adds search, sorting, folders and bulk actions.
export default function LibraryPage({ title, description, icon, emptyTitle, emptyDescription, category }: LibraryPageProps) {
  return (
    <>
      <PageHeader title={title} description={description} actions={<UploadDialog maxFileBytes={storageConfig.maxFileBytes} />} />
      <Suspense fallback={category === "photos" ? <PhotoGridSkeleton /> : <FileTableSkeleton label={`Loading ${title.toLowerCase()}…`} />}>
        <FileList category={category} icon={icon} emptyTitle={emptyTitle} emptyDescription={emptyDescription} />
      </Suspense>
    </>
  );
}

async function FileList({
  category,
  icon,
  emptyTitle,
  emptyDescription,
}: Pick<LibraryPageProps, "category" | "icon" | "emptyTitle" | "emptyDescription">) {
  const user = await requireUser();
  const files = await listFiles(user.id, { category, limit: 500 });

  if (files.length === 0) {
    return <EmptyState icon={icon} title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <>
      <p className="mb-3 text-sm text-slate-500">
        {files.length} {files.length === 1 ? "file" : "files"}
      </p>
      {category === "photos" ? <PhotoGrid files={files} /> : <FileTable files={files} mode="library" />}
    </>
  );
}
