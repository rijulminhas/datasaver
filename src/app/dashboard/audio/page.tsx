import type { Metadata } from "next";

import LibraryPage from "@/components/dashboard/LibraryPage";
import { MusicIcon } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Audio",
};

export default function Page({ searchParams }: PageProps<"/dashboard/audio">) {
  return (
    <LibraryPage
      searchParams={searchParams}
      title="Audio"
      description="Your audio: MP3, WAV, AAC and more."
      icon={MusicIcon}
      emptyTitle="No audio yet"
      category="audio"
      emptyDescription="Audio files you upload will appear here automatically."
    />
  );
}
