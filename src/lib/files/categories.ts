// File categories shared by the server (classification) and UI (labels, colors).
// Order is fixed: it sets the color slot and the order of segments/legends,
// so a category keeps its color no matter which others are present.

export const FILE_CATEGORIES = ["photos", "videos", "documents", "audio", "other"] as const;
export type FileCategory = (typeof FILE_CATEGORIES)[number];

export const CATEGORY_META: Record<
  FileCategory,
  { label: string; singular: string; color: string; href: string }
> = {
  // Colors: reference categorical palette slots 1-5 (validated as adjacent pairs).
  photos: { label: "Photos", singular: "photo", color: "#257de0", href: "/dashboard/photos" },
  videos: { label: "Videos", singular: "video", color: "#f47230", href: "/dashboard/videos" },
  documents: { label: "Documents", singular: "document", color: "#00b894", href: "/dashboard/documents" },
  audio: { label: "Audio", singular: "audio file", color: "#f2a600", href: "/dashboard/audio" },
  other: { label: "Other", singular: "file", color: "#ee7fac", href: "/dashboard/files" },
};

const DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/rtf",
  "text/plain",
  "text/csv",
  "text/markdown",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/vnd.oasis.opendocument.presentation",
  "application/epub+zip",
]);

export function isFileCategory(value: unknown): value is FileCategory {
  return typeof value === "string" && (FILE_CATEGORIES as readonly string[]).includes(value);
}

/** Classify a (server-verified) MIME type into a category. */
export function categorizeMimeType(mimeType: string): FileCategory {
  const type = mimeType.toLowerCase();
  if (type.startsWith("image/")) return "photos";
  if (type.startsWith("video/")) return "videos";
  if (type.startsWith("audio/")) return "audio";
  if (DOCUMENT_MIME_TYPES.has(type)) return "documents";
  return "other";
}
