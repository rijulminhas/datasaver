import { ArchiveIcon, FileTextIcon, ImageIcon, MusicIcon, VideoIcon } from "@/components/ui/icons";
import type { FileCategory } from "@/lib/files/categories";

export const CATEGORY_ICONS: Record<FileCategory, typeof ImageIcon> = {
  photos: ImageIcon,
  videos: VideoIcon,
  documents: FileTextIcon,
  audio: MusicIcon,
  other: ArchiveIcon,
};
