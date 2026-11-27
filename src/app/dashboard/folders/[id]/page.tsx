import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import EmptyState from "@/components/dashboard/EmptyState";
import PageHeader from "@/components/dashboard/PageHeader";
import { BulkActionsMenu, BulkProvider } from "@/components/files/BulkSelection";
import FileTable from "@/components/files/FileTable";
import UploadDialog from "@/components/files/UploadDialog";
import AddExistingFilesButton from "@/components/folders/AddExistingFilesDialog";
import { FolderActions, NewFolderButton } from "@/components/folders/FolderActions";
import FolderGrid from "@/components/folders/FolderGrid";
import { ChevronRightIcon, FolderIcon } from "@/components/ui/icons";
import { FileTableSkeleton, PageHeaderSkeleton } from "@/components/ui/Loading";
import Pagination, { PageSummary } from "@/components/ui/Pagination";
import { fileIdSchema } from "@/lib/api/http";
import { requireUser } from "@/lib/auth/dal";
import { FileServiceError, listFilesPage } from "@/lib/files/service";
import { parsePage } from "@/lib/pagination";
import { getFolderPath, listFolders, MAX_FOLDER_DEPTH } from "@/lib/folders/service";
import { storageConfig } from "@/lib/storage/config";

export const metadata: Metadata = {
  title: "Folder",
};

// Params are runtime data (no generateStaticParams), so they are read inside
// Suspense, as Cache Components requires.
export default function FolderPage({ params, searchParams }: PageProps<"/dashboard/folders/[id]">) {
  return (
    <Suspense fallback={<FolderSkeleton />}>
      {Promise.all([params, searchParams]).then(([{ id }, query]) => (
        <FolderContent id={id} page={parsePage(query.page)} />
      ))}
    </Suspense>
  );
}

async function FolderContent({ id, page }: { id: string; page: number }) {
  if (!fileIdSchema.safeParse(id).success) notFound();

  const user = await requireUser();
  let path;
  try {
    path = await getFolderPath(user.id, id);
  } catch (error) {
    // Missing and not-yours look identical.
    if (error instanceof FileServiceError && error.status === 404) notFound();
    throw error;
  }

  const folder = path[path.length - 1];
  const parent = path.length > 1 ? path[path.length - 2] : null;
  // Subfolders are navigation, so all are shown; files are paginated.
  const [subfolders, { files, ...pageInfo }] = await Promise.all([
    listFolders(user.id, id),
    listFilesPage(user.id, { folderId: id, page }),
  ]);
  const canNest = path.length < MAX_FOLDER_DEPTH;

  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-3">
        <ol className="flex flex-wrap items-center gap-1 text-sm text-slate-500">
          <li>
            <Link href="/dashboard/folders" className="rounded-md px-1 py-0.5 hover:bg-slate-100 hover:text-slate-900">
              Folders
            </Link>
          </li>
          {path.map((crumb, i) => (
            <li key={crumb.id} className="flex min-w-0 items-center gap-1">
              <ChevronRightIcon width={14} height={14} className="shrink-0 text-slate-300" />
              {i === path.length - 1 ? (
                <span aria-current="page" className="max-w-[12rem] truncate px-1 font-medium text-slate-900" title={crumb.name}>
                  {crumb.name}
                </span>
              ) : (
                <Link
                  href={`/dashboard/folders/${crumb.id}`}
                  className="max-w-[10rem] truncate rounded-md px-1 py-0.5 hover:bg-slate-100 hover:text-slate-900"
                  title={crumb.name}
                >
                  {crumb.name}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <PageHeader
        title={<span className="block truncate" title={folder.name}>{folder.name}</span>}
        description={summary(subfolders.length, pageInfo.total)}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <FolderActions
              folderId={folder.id}
              folderName={folder.name}
              fileCount={pageInfo.total}
              folderCount={subfolders.length}
              redirectAfterDelete={parent ? `/dashboard/folders/${parent.id}` : "/dashboard/folders"}
              labelled
            />
            {canNest && <NewFolderButton parentFolderId={folder.id} />}
            <AddExistingFilesButton folderId={folder.id} folderName={folder.name} />
            <UploadDialog maxFileBytes={storageConfig.maxFileBytes} folderId={folder.id} folderName={folder.name} />
          </div>
        }
      />

      {subfolders.length === 0 && pageInfo.total === 0 ? (
        <EmptyState
          icon={FolderIcon}
          title="This folder is empty"
          description="Upload new files here, or add files you’ve already saved — photos, videos, documents and more."
          action={<AddExistingFilesButton folderId={folder.id} folderName={folder.name} />}
        />
      ) : (
        <div className="space-y-8">
          {subfolders.length > 0 && (
            <section aria-labelledby="subfolders-heading">
              <h2 id="subfolders-heading" className="mb-3 text-sm font-semibold text-slate-700">Folders</h2>
              <FolderGrid folders={subfolders} />
            </section>
          )}
          {files.length > 0 && (
            <section aria-labelledby="files-heading">
              <BulkProvider fileIds={files.map((f) => f.id)} mode="library" currentFolderId={folder.id}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-baseline gap-2">
                    <h2 id="files-heading" className="text-sm font-semibold text-slate-700">Files</h2>
                    {pageInfo.pageCount > 1 && <PageSummary {...pageInfo} noun={["file", "files"]} />}
                  </div>
                  <BulkActionsMenu />
                </div>
                <FileTable files={files} mode="library" />
                <Pagination {...pageInfo} basePath={`/dashboard/folders/${folder.id}`} />
              </BulkProvider>
            </section>
          )}
        </div>
      )}
    </>
  );
}

function summary(folderCount: number, fileCount: number) {
  const parts = [];
  if (folderCount > 0) parts.push(`${folderCount} ${folderCount === 1 ? "folder" : "folders"}`);
  parts.push(`${fileCount} ${fileCount === 1 ? "file" : "files"}`);
  return parts.join(" · ");
}

function FolderSkeleton() {
  return (
    <div aria-busy="true">
      <div className="mb-3 h-4 w-40 animate-pulse rounded bg-slate-200" aria-hidden="true" />
      <PageHeaderSkeleton actions={3} />
      <FileTableSkeleton label="Opening folder…" rows={4} />
    </div>
  );
}
