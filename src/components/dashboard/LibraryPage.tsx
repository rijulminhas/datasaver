import { Suspense } from "react";

import EmptyState from "@/components/dashboard/EmptyState";
import PageHeader from "@/components/dashboard/PageHeader";
import { BulkActionsMenu, BulkProvider } from "@/components/files/BulkSelection";
import FileTable from "@/components/files/FileTable";
import PhotoGrid from "@/components/files/PhotoGrid";
import UploadDialog from "@/components/files/UploadDialog";
import type { FilesIcon } from "@/components/ui/icons";
import { FileTableSkeleton, PhotoGridSkeleton } from "@/components/ui/Loading";
import Pagination, { PageSummary } from "@/components/ui/Pagination";
import { requireUser } from "@/lib/auth/dal";
import { CATEGORY_META, type FileCategory } from "@/lib/files/categories";
import { listFilesPage } from "@/lib/files/service";
import { parsePage } from "@/lib/pagination";
import { storageConfig } from "@/lib/storage/config";

interface LibraryPageProps {
  title: string;
  description: string;
  icon: typeof FilesIcon;
  emptyTitle: string;
  emptyDescription: string;
  /** Limit to one category; omit for All Files. */
  category?: FileCategory;
  /** The page's searchParams (read inside Suspense for ?page=). */
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// Shared page for All Files / Photos / Videos / Documents / Audio.
// Paginated (?page=N); searchParams are runtime data, so they are awaited inside Suspense.
export default function LibraryPage({ title, description, icon, emptyTitle, emptyDescription, category, searchParams }: LibraryPageProps) {
  return (
    <>
      <PageHeader title={title} description={description} actions={<UploadDialog maxFileBytes={storageConfig.maxFileBytes} />} />
      <Suspense fallback={category === "photos" ? <PhotoGridSkeleton /> : <FileTableSkeleton label={`Loading ${title.toLowerCase()}…`} />}>
        <FileList category={category} icon={icon} emptyTitle={emptyTitle} emptyDescription={emptyDescription} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function FileList({
  category,
  icon,
  emptyTitle,
  emptyDescription,
  searchParams,
}: Pick<LibraryPageProps, "category" | "icon" | "emptyTitle" | "emptyDescription" | "searchParams">) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const { files, ...pageInfo } = await listFilesPage(user.id, { category, page: parsePage(params.page) });
  const basePath = category ? CATEGORY_META[category].href : "/dashboard/files";

  if (files.length === 0) {
    return <EmptyState icon={icon} title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <BulkProvider fileIds={files.map((f) => f.id)} mode="library">
      <div className="mb-3 flex items-center justify-between gap-3">
        <PageSummary {...pageInfo} noun={category === "photos" ? ["photo", "photos"] : ["file", "files"]} />
        <BulkActionsMenu />
      </div>
      {category === "photos" ? <PhotoGrid files={files} /> : <FileTable files={files} mode="library" />}
      <Pagination {...pageInfo} basePath={basePath} />
    </BulkProvider>
  );
}
