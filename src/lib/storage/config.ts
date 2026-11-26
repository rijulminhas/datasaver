import "server-only";

const MiB = 1024 ** 2;
const GiB = 1024 ** 3;

// Defaults sized for the Backblaze B2 free tier (10 GB shared by all users).
// Override with env vars as the storage plan grows. Never unlimited.
const DEFAULT_QUOTA_BYTES = 1 * GiB;
const DEFAULT_MAX_FILE_BYTES = 100 * MiB;

function readPositiveInt(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer (bytes)`);
  }
  return value;
}

/** Storage limits. Configure with env vars; never assume unlimited storage. */
export const storageConfig = {
  /** Per-user total storage (STORAGE_QUOTA_BYTES). */
  quotaBytesPerUser: readPositiveInt("STORAGE_QUOTA_BYTES", DEFAULT_QUOTA_BYTES),
  /** Largest single file (STORAGE_MAX_FILE_BYTES). Must stay below 5 GB (single PUT limit). */
  maxFileBytes: Math.min(readPositiveInt("STORAGE_MAX_FILE_BYTES", DEFAULT_MAX_FILE_BYTES), 5 * GiB),
  /** How long a signed upload URL is valid. */
  uploadUrlTtlSeconds: 15 * 60,
  /** Pending uploads not completed within this time are cleaned up. */
  pendingUploadTtlSeconds: 20 * 60,
  /** How long a signed download URL is valid. */
  downloadUrlTtlSeconds: 60,
  /**
   * Preview URLs are re-signed every window (so the browser can cache them)
   * and stay valid for two windows, long enough to watch a video.
   */
  previewUrlWindowSeconds: 30 * 60,
  /** Max bytes returned by the text preview endpoint. */
  textPreviewBytes: 256 * 1024,
  /** Max simultaneous unfinished uploads per user. */
  maxPendingUploadsPerUser: 20,
  /** Days a file stays in Trash before it is permanently deleted. */
  trashRetentionDays: 30,
};
