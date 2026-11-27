import type { Metadata } from "next";

import LibraryPage from "@/components/dashboard/LibraryPage";
import { FilesIcon } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "All Files",
};

export default function Page({ searchParams }: PageProps<"/dashboard/files">) {
  return (
    <LibraryPage
      searchParams={searchParams}
      title="All Files"
      description="Every file you've saved to DataSaver."
      icon={FilesIcon}
      emptyTitle="No files yet"
      emptyDescription="Upload photos, videos, documents and more with the “Upload files” button."
    />
  );
}
