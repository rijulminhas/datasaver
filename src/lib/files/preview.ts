// Which verified MIME types can be shown inside DataSaver, and how.
// Used by both the server (to decide what may be served inline) and the UI.
// Anything not listed here is download-only.

export type PreviewKind = "image" | "video" | "audio" | "pdf" | "text";

// Images browsers render natively. SVG is shown only through <img>, where
// scripts inside it never run. HEIC/TIFF are excluded (most browsers can't).
const IMAGE = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
  "image/bmp",
  "image/x-icon",
  "image/svg+xml",
]);

// Containers browsers commonly play. Codec support still varies, so the
// player falls back to a download prompt if playback fails.
const VIDEO = new Set(["video/mp4", "video/webm", "video/quicktime", "video/x-matroska", "video/ogg"]);
const AUDIO = new Set(["audio/mpeg", "audio/wav", "audio/ogg", "audio/aac", "audio/mp4", "audio/flac", "audio/webm"]);

// Shown as plain text (never rendered as HTML).
const TEXT = new Set([
  "text/plain",
  "text/csv",
  "text/tab-separated-values",
  "text/markdown",
  "application/json",
  "application/xml",
  "application/yaml",
  "text/html",
  "text/css",
  "text/javascript",
  "text/calendar",
  "text/vcard",
]);

export function getPreviewKind(mimeType: string): PreviewKind | null {
  if (IMAGE.has(mimeType)) return "image";
  if (VIDEO.has(mimeType)) return "video";
  if (AUDIO.has(mimeType)) return "audio";
  if (mimeType === "application/pdf") return "pdf";
  if (TEXT.has(mimeType)) return "text";
  return null;
}

/** Kinds served inline from storage via /api/files/[id]/preview. */
export function isMediaPreview(kind: PreviewKind | null): kind is "image" | "video" | "audio" | "pdf" {
  return kind === "image" || kind === "video" || kind === "audio" || kind === "pdf";
}
