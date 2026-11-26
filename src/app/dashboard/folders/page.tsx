import type { Metadata } from "next";

import EmptyState from "@/components/dashboard/EmptyState";
import PageHeader from "@/components/dashboard/PageHeader";
import { FolderIcon } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Folders",
};

// Folder management arrives in Phase 4 (the folders table already exists).
export default function FoldersPage() {
  return (
    <>
      <PageHeader title="Folders" description="Organise your files into folders." />
      <EmptyState
        icon={FolderIcon}
        title="No folders yet"
        description="Creating folders and moving files between them is coming in the next update."
      />
    </>
  );
}
