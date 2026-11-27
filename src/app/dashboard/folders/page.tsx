import type { Metadata } from "next";
import { Suspense } from "react";

import EmptyState from "@/components/dashboard/EmptyState";
import PageHeader from "@/components/dashboard/PageHeader";
import { NewFolderButton } from "@/components/folders/FolderActions";
import FolderGrid from "@/components/folders/FolderGrid";
import { FolderIcon } from "@/components/ui/icons";
import { FolderGridSkeleton } from "@/components/ui/Loading";
import { requireUser } from "@/lib/auth/dal";
import { listFolders } from "@/lib/folders/service";

export const metadata: Metadata = {
  title: "Folders",
};

export default function FoldersPage() {
  return (
    <>
      <PageHeader title="Folders" description="Organise your files into folders." actions={<NewFolderButton variant="primary" />} />
      <Suspense fallback={<FolderGridSkeleton label="Loading your folders…" />}>
        <TopLevelFolders />
      </Suspense>
    </>
  );
}

async function TopLevelFolders() {
  const user = await requireUser();
  const folders = await listFolders(user.id, null);

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
      <p className="mb-3 text-sm text-slate-500">
        {folders.length} {folders.length === 1 ? "folder" : "folders"}
      </p>
      <FolderGrid folders={folders} />
    </>
  );
}
