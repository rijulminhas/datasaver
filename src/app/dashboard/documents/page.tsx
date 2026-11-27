import type { Metadata } from "next";

import LibraryPage from "@/components/dashboard/LibraryPage";
import { FileTextIcon } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Documents",
};

export default function Page({ searchParams }: PageProps<"/dashboard/documents">) {
  return (
    <LibraryPage
      searchParams={searchParams}
      title="Documents"
      description="PDFs, Word, Excel, PowerPoint and text files."
      icon={FileTextIcon}
      emptyTitle="No documents yet"
      category="documents"
      emptyDescription="Documents you upload will appear here automatically."
    />
  );
}
