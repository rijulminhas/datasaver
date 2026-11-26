/**
 * Identify a file's real type from its first bytes ("magic numbers").
 * Client-supplied MIME types and extensions are never trusted on their own:
 * the extension is only used to choose between formats that share a
 * container (e.g. DOCX vs plain ZIP, DOC vs XLS) or to name text formats.
 *
 * Unknown binary content is stored as application/octet-stream. Nothing is
 * ever executed or served inline, so unknown types are safe to keep.
 */

/** Bytes needed by the longest check (tar's "ustar" marker at offset 257). */
export const SIGNATURE_SAMPLE_BYTES = 4100;

export const OCTET_STREAM = "application/octet-stream";

function startsWith(bytes: Uint8Array, signature: number[], offset = 0) {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((byte, i) => bytes[offset + i] === byte);
}

function ascii(bytes: Uint8Array, start: number, end: number) {
  return String.fromCharCode(...bytes.subarray(start, end));
}

const ZIP_BASED: Record<string, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  odt: "application/vnd.oasis.opendocument.text",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  odp: "application/vnd.oasis.opendocument.presentation",
  epub: "application/epub+zip",
};

const OLE_BASED: Record<string, string> = {
  doc: "application/msword",
  xls: "application/vnd.ms-excel",
  ppt: "application/vnd.ms-powerpoint",
  msg: "application/vnd.ms-outlook",
};

const TEXT_BY_EXTENSION: Record<string, string> = {
  txt: "text/plain",
  log: "text/plain",
  csv: "text/csv",
  tsv: "text/tab-separated-values",
  md: "text/markdown",
  markdown: "text/markdown",
  json: "application/json",
  xml: "application/xml",
  html: "text/html",
  htm: "text/html",
  css: "text/css",
  js: "text/javascript",
  ts: "text/plain",
  ics: "text/calendar",
  vcf: "text/vcard",
  yaml: "application/yaml",
  yml: "application/yaml",
  srt: "text/plain",
};

function detectBinary(bytes: Uint8Array, extension: string): string | null {
  // Images
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (ascii(bytes, 0, 6) === "GIF87a" || ascii(bytes, 0, 6) === "GIF89a") return "image/gif";
  if (startsWith(bytes, [0x49, 0x49, 0x2a, 0x00]) || startsWith(bytes, [0x4d, 0x4d, 0x00, 0x2a])) return "image/tiff";
  if (extension === "bmp" && ascii(bytes, 0, 2) === "BM") return "image/bmp";
  if (extension === "ico" && startsWith(bytes, [0x00, 0x00, 0x01, 0x00])) return "image/x-icon";

  // RIFF containers
  if (ascii(bytes, 0, 4) === "RIFF") {
    const kind = ascii(bytes, 8, 12);
    if (kind === "WEBP") return "image/webp";
    if (kind === "WAVE") return "audio/wav";
    if (kind === "AVI ") return "video/x-msvideo";
  }

  // ISO base media (MP4, MOV, HEIC, AVIF, M4A, 3GP)
  if (ascii(bytes, 4, 8) === "ftyp") {
    const brand = ascii(bytes, 8, 12);
    if (["heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(brand)) return "image/heic";
    if (brand === "avif" || brand === "avis") return "image/avif";
    if (brand === "M4A " || brand === "M4B ") return "audio/mp4";
    if (brand === "qt  ") return "video/quicktime";
    if (brand.startsWith("3g")) return "video/3gpp";
    return "video/mp4";
  }

  // Matroska / WebM
  if (startsWith(bytes, [0x1a, 0x45, 0xdf, 0xa3])) {
    return ascii(bytes, 0, Math.min(bytes.length, 64)).includes("webm") ? "video/webm" : "video/x-matroska";
  }
  if (startsWith(bytes, [0x00, 0x00, 0x01, 0xba]) || startsWith(bytes, [0x00, 0x00, 0x01, 0xb3])) return "video/mpeg";
  if (startsWith(bytes, [0x46, 0x4c, 0x56, 0x01])) return "video/x-flv";

  // Audio
  if (ascii(bytes, 0, 3) === "ID3") return "audio/mpeg";
  if (ascii(bytes, 0, 4) === "fLaC") return "audio/flac";
  if (ascii(bytes, 0, 4) === "OggS") return "audio/ogg";
  if (ascii(bytes, 0, 5) === "#!AMR") return "audio/amr";
  if (ascii(bytes, 0, 4) === "MThd") return "audio/midi";
  if (bytes[0] === 0xff && (bytes[1] === 0xf1 || bytes[1] === 0xf9)) return "audio/aac";
  if (bytes[0] === 0xff && bytes.length > 1 && (bytes[1] & 0xe0) === 0xe0) return "audio/mpeg";

  // Documents
  if (ascii(bytes, 0, 5) === "%PDF-") return "application/pdf";
  if (ascii(bytes, 0, 5) === "{\\rtf") return "application/rtf";
  if (startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) {
    return OLE_BASED[extension] ?? "application/x-ole-storage";
  }

  // Archives (ZIP also backs Office/OpenDocument formats)
  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]) || startsWith(bytes, [0x50, 0x4b, 0x05, 0x06])) {
    return ZIP_BASED[extension] ?? "application/zip";
  }
  if (ascii(bytes, 0, 6) === "Rar!\x1a\x07") return "application/vnd.rar";
  if (startsWith(bytes, [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c])) return "application/x-7z-compressed";
  if (startsWith(bytes, [0x1f, 0x8b])) return "application/gzip";
  if (ascii(bytes, 0, 3) === "BZh") return "application/x-bzip2";
  if (startsWith(bytes, [0xfd, 0x37, 0x7a, 0x58, 0x5a, 0x00])) return "application/x-xz";
  if (ascii(bytes, 257, 262) === "ustar") return "application/x-tar";

  // Executables and databases: stored, never executed, always downloaded.
  if (ascii(bytes, 0, 2) === "MZ") return "application/x-msdownload";
  if (startsWith(bytes, [0x7f, 0x45, 0x4c, 0x46])) return "application/x-elf";
  if (
    startsWith(bytes, [0xcf, 0xfa, 0xed, 0xfe]) ||
    startsWith(bytes, [0xce, 0xfa, 0xed, 0xfe]) ||
    startsWith(bytes, [0xca, 0xfe, 0xba, 0xbe])
  ) return "application/x-mach-binary";
  if (ascii(bytes, 0, 16) === "SQLite format 3\0") return "application/vnd.sqlite3";

  return null;
}

function detectText(bytes: Uint8Array, extension: string): string | null {
  if (bytes.includes(0)) return null;

  let text: string;
  try {
    // stream: true tolerates a multi-byte character cut off at the sample end.
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes, { stream: true });
  } catch {
    return null;
  }

  const start = text.replace(/^﻿/, "").trimStart().slice(0, 512).toLowerCase();
  if (start.startsWith("<svg") || (start.startsWith("<?xml") && text.toLowerCase().includes("<svg"))) {
    return "image/svg+xml";
  }

  return TEXT_BY_EXTENSION[extension] ?? "text/plain";
}

/** Returns the verified MIME type for a file's leading bytes. */
export function detectMimeType(sample: Uint8Array, extension: string): string {
  if (sample.length === 0) return OCTET_STREAM;
  return detectBinary(sample, extension) ?? detectText(sample, extension) ?? OCTET_STREAM;
}
