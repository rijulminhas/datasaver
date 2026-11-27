import type { Metadata } from "next";
import { Suspense } from "react";

import EmptyState from "@/components/dashboard/EmptyState";
import PageHeader from "@/components/dashboard/PageHeader";
import { NewFolderButton } from "@/components/folders/FolderActions";
import FolderGrid from "@/components/folders/FolderGrid";
import { FolderIcon } from "@/components/ui/icons";
import { FolderGridSkeleton } from "@/components/ui/Loading";
import Pagination, { PageSummary } from "@/components/ui/Pagination";
import { requireUser } from "@/lib/auth/dal";
import { listFoldersPage } from "@/lib/folders/service";
import { parsePage } from "@/lib/pagination";

export const metadata: Metadata = {
  title: "Folders",
};

export default function FoldersPage({ searchParams }: PageProps<"/dashboard/folders">) {
  return (
    <>
      <PageHeader title="Folders" description="Organise your files into folders." actions={<NewFolderButton variant="primary" />} />
      <Suspense fallback={<FolderGridSkeleton label="Loading your folders…" />}>
        <TopLevelFolders searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function TopLevelFolders({ searchParams }: { searchParams: PageProps<"/dashboard/folders">["searchParams"] }) {
  const [user, query] = await Promise.all([requireUser(), searchParams]);
  const { folders, ...pageInfo } = await listFoldersPage(user.id, null, { page: parsePage(query.page) });

  if (folders.length === 0) {
    return (
      <EmptyState
        icon={FolderIcon}
        title="No folders yet"
        description="Create a folder, then upload into it or move files there with the folder button next to any file."
        action={<NewFolderButton />}
      />
    );
  }

  return (
    <>
      <div className="mb-3">
        <PageSummary {...pageInfo} noun={["folder", "folders"]} />
      </div>
      <FolderGrid folders={folders} />
      <Pagination {...pageInfo} basePath="/dashboard/folders" />
    </>
  );
}
