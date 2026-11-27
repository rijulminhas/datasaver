import type { Metadata } from "next";

import LibraryPage from "@/components/dashboard/LibraryPage";
import { VideoIcon } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Videos",
};

export default function Page({ searchParams }: PageProps<"/dashboard/videos">) {
  return (
    <LibraryPage
      searchParams={searchParams}
      title="Videos"
      description="Your videos: MP4, MOV, MKV, WEBM and more."
      icon={VideoIcon}
      emptyTitle="No videos yet"
      category="videos"
      emptyDescription="Videos you upload will appear here automatically."
    />
  );
}
