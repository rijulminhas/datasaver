import type { Metadata } from "next";

import LibraryPage from "@/components/dashboard/LibraryPage";
import { ImageIcon } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Photos",
};

export default function Page({ searchParams }: PageProps<"/dashboard/photos">) {
  return (
    <LibraryPage
      searchParams={searchParams}
      title="Photos"
      description="Your images: JPG, PNG, WEBP, GIF and more."
      icon={ImageIcon}
      emptyTitle="No photos yet"
      category="photos"
      emptyDescription="Photos you upload will appear here automatically."
    />
  );
}
