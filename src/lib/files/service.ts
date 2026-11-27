import "server-only";

import { randomUUID } from "node:crypto";
import { and, count, desc, eq, gt, inArray, isNotNull, isNull, lt, or, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { files, folders } from "@/lib/db/schema";
import { categorizeMimeType, type FileCategory } from "@/lib/files/categories";
import { detectMimeType, SIGNATURE_SAMPLE_BYTES } from "@/lib/files/detect";
import { getExtension, sanitizeFileName } from "@/lib/files/names";
import { getPreviewKind, isMediaPreview } from "@/lib/files/preview";
import { getStorage } from "@/lib/storage";
import { storageConfig } from "@/lib/storage/config";

/**
 * File operations. Every function takes the *authenticated* user's id (from
 * the session — never from the request body) and scopes every query to it,
 * so a user can only ever see or change their own files.
 */

export class FileServiceError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "FileServiceError";
  }
}

/** What the client is allowed to see. Never includes the storage key. */
export type FileDto = {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  extension: string;
  category: FileCategory;
  folderId: string | null;
  createdAt: string;
  /** When the file was moved to Trash (null = in the library). */
  deletedAt: string | null;
  /** When a trashed file will be permanently deleted. */
  purgeAt: string | null;
  /** Whole days until permanent deletion (trashed files only). */
  daysUntilPurge: number | null;
};

type FileRow = typeof files.$inferSelect;

const TRASH_RETENTION_MS = storageConfig.trashRetentionDays * 24 * 60 * 60 * 1000;

export function toFileDto(row: FileRow): FileDto {
  return {
    id: row.id,
    name: row.originalName,
    size: row.size,
    mimeType: row.mimeType,
    extension: row.extension,
    category: row.category as FileCategory,
    folderId: row.folderId,
    createdAt: row.createdAt.toISOString(),
    deletedAt: row.deletedAt?.toISOString() ?? null,
    purgeAt: row.deletedAt ? new Date(row.deletedAt.getTime() + TRASH_RETENTION_MS).toISOString() : null,
    daysUntilPurge: row.deletedAt
      ? Math.max(0, Math.ceil((row.deletedAt.getTime() + TRASH_RETENTION_MS - Date.now()) / 86_400_000))
      : null,
  };
}

/**
 * Bytes counted against the quota: stored files (including Trash, which still
 * occupies storage) + unexpired upload reservations.
 */
export async function getReservedBytes(userId: string, excludeFileId?: string) {
  const now = new Date();
  const [row] = await db
    .select({ total: sql<string>`coalesce(sum(${files.size}), 0)` })
    .from(files)
    .where(
      and(
        eq(files.userId, userId),
        or(eq(files.status, "ready"), and(eq(files.status, "pending"), gt(files.uploadExpiresAt, now))),
        excludeFileId ? sql`${files.id} <> ${excludeFileId}` : undefined
      )
    );
  return Number(row?.total ?? 0);
}

/** Remove this user's abandoned uploads (objects first, then rows). */
export async function cleanupExpiredUploads(userId: string) {
  const expired = await db
    .select({ id: files.id, storageKey: files.storageKey })
    .from(files)
    .where(and(eq(files.userId, userId), eq(files.status, "pending"), lt(files.uploadExpiresAt, new Date())))
    .limit(50);

  if (expired.length === 0) return;

  const storage = getStorage();
  const removed: string[] = [];
  for (const file of expired) {
    try {
      await storage.deleteObject(file.storageKey);
      removed.push(file.id);
    } catch {
      // Leave the row so the cleanup is retried next time.
    }
  }
  if (removed.length) {
    await db.delete(files).where(and(eq(files.userId, userId), inArray(files.id, removed)));
  }
}

/** Step 1 of an upload: reserve quota and return a signed upload URL. */
export async function createUpload(userId: string, input: { name: string; size: number; folderId?: string | null }) {
  const { maxFileBytes, quotaBytesPerUser, maxPendingUploadsPerUser } = storageConfig;

  if (input.size > maxFileBytes) {
    throw new FileServiceError(413, `File is too large. The maximum size is ${Math.floor(maxFileBytes / 1024 ** 2)} MB.`);
  }

  await Promise.all([cleanupExpiredUploads(userId), purgeExpiredTrash(userId)]);

  const folderId = input.folderId ?? null;
  if (folderId) {
    const [folder] = await db
      .select({ id: folders.id })
      .from(folders)
      .where(and(eq(folders.id, folderId), eq(folders.userId, userId)))
      .limit(1);
    if (!folder) throw new FileServiceError(404, "Folder not found.");
  }

  const [pending] = await db
    .select({ value: count() })
    .from(files)
    .where(and(eq(files.userId, userId), eq(files.status, "pending")));
  if ((pending?.value ?? 0) >= maxPendingUploadsPerUser) {
    throw new FileServiceError(429, "Too many uploads in progress. Wait for them to finish and try again.");
  }

  const reserved = await getReservedBytes(userId);
  if (reserved + input.size > quotaBytesPerUser) {
    throw new FileServiceError(413, "Not enough storage space for this file.");
  }

  const storage = getStorage();
  const id = randomUUID();
  const originalName = sanitizeFileName(input.name);
  const extension = getExtension(originalName);
  const storedName = extension ? `${id}.${extension}` : id;
  // Server-generated key: user input never influences the storage path.
  const storageKey = `users/${userId}/${storedName}`;

  await db.insert(files).values({
    id,
    userId,
    folderId,
    originalName,
    storedName,
    storageKey,
    mimeType: "application/octet-stream",
    extension,
    category: "other",
    size: input.size,
    storageProvider: storage.name,
    status: "pending",
    uploadExpiresAt: new Date(Date.now() + storageConfig.pendingUploadTtlSeconds * 1000),
  });

  const upload = await storage.createUploadUrl(storageKey, {
    contentLength: input.size,
    expiresInSeconds: storageConfig.uploadUrlTtlSeconds,
  });

  return { fileId: id, upload };
}

/** Step 2 of an upload: verify what actually arrived in storage. */
export async function completeUpload(userId: string, fileId: string): Promise<FileDto> {
  const [row] = await db
    .select()
    .from(files)
    .where(and(eq(files.id, fileId), eq(files.userId, userId)))
    .limit(1);

  if (!row) throw new FileServiceError(404, "Upload not found.");
  if (row.status === "ready") return toFileDto(row);

  const storage = getStorage();
  const discard = async () => {
    await storage.deleteObject(row.storageKey);
    await db.delete(files).where(and(eq(files.id, row.id), eq(files.userId, userId)));
  };

  if (row.uploadExpiresAt && row.uploadExpiresAt < new Date()) {
    await discard();
    throw new FileServiceError(410, "This upload expired. Please try again.");
  }

  const actualSize = await storage.getObjectSize(row.storageKey);
  if (actualSize === null) {
    throw new FileServiceError(409, "The file has not finished uploading yet.");
  }
  if (actualSize !== row.size) {
    await discard();
    throw new FileServiceError(400, "The uploaded file did not match the expected size.");
  }

  // Re-check the quota with the real size, excluding this reservation.
  if ((await getReservedBytes(userId, row.id)) + actualSize > storageConfig.quotaBytesPerUser) {
    await discard();
    throw new FileServiceError(413, "Not enough storage space for this file.");
  }

  // Never trust the client's MIME type: read the file's signature.
  const sample = await storage.readObjectStart(row.storageKey, Math.min(SIGNATURE_SAMPLE_BYTES, actualSize));
  const mimeType = detectMimeType(sample, row.extension);

  const [updated] = await db
    .update(files)
    .set({
      status: "ready",
      mimeType,
      category: categorizeMimeType(mimeType),
      uploadExpiresAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(files.id, row.id), eq(files.userId, userId), eq(files.status, "pending")))
    .returning();

  if (!updated) throw new FileServiceError(404, "Upload not found.");
  return toFileDto(updated);
}

/** A ready, non-trashed file owned by the user, or a 404. */
export async function getOwnedFile(userId: string, fileId: string) {
  const [row] = await db
    .select()
    .from(files)
    .where(and(eq(files.id, fileId), eq(files.userId, userId), eq(files.status, "ready"), isNull(files.deletedAt)))
    .limit(1);
  // Same 404 whether the file doesn't exist or belongs to someone else.
  if (!row) throw new FileServiceError(404, "File not found.");
  return row;
}

export async function createDownloadUrl(userId: string, fileId: string) {
  const row = await getOwnedFile(userId, fileId);
  return getStorage().createDownloadUrl(row.storageKey, {
    fileName: row.originalName,
    contentType: row.mimeType,
    expiresInSeconds: storageConfig.downloadUrlTtlSeconds,
  });
}

/**
 * Signed URL that displays an image/video/audio/PDF inline. Only types on the
 * preview allow-list are ever served inline; everything else is download-only.
 * The URL is identical within each time window so the browser can cache it.
 */
export async function createPreviewUrl(userId: string, fileId: string) {
  const row = await getOwnedFile(userId, fileId);
  if (!isMediaPreview(getPreviewKind(row.mimeType))) {
    throw new FileServiceError(415, "This file type can't be previewed. Download it instead.");
  }

  const windowMs = storageConfig.previewUrlWindowSeconds * 1000;
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);

  return getStorage().createDownloadUrl(row.storageKey, {
    fileName: row.originalName,
    contentType: row.mimeType,
    disposition: "inline",
    cacheControl: `private, max-age=${storageConfig.previewUrlWindowSeconds}`,
    signingDate: windowStart,
    // Valid for the rest of this window plus one more (>= 30 min from now).
    expiresInSeconds: storageConfig.previewUrlWindowSeconds * 2,
  });
}

/** First part of a text file, decoded as UTF-8, for the in-app text viewer. */
export async function readTextPreview(userId: string, fileId: string) {
  const row = await getOwnedFile(userId, fileId);
  if (getPreviewKind(row.mimeType) !== "text") {
    throw new FileServiceError(415, "This file isn't a text file.");
  }

  const limit = storageConfig.textPreviewBytes;
  const bytes = await getStorage().readObjectStart(row.storageKey, Math.min(limit, row.size));
  // Non-fatal decode: invalid sequences become U+FFFD instead of failing.
  const text = new TextDecoder("utf-8").decode(bytes);
  return { text, truncated: row.size > limit, mimeType: row.mimeType };
}

/**
 * Library files (not in Trash), newest first.
 * folderId: undefined = every folder, null = top level only, id = that folder only.
 */
export async function listFiles(
  userId: string,
  options: { category?: FileCategory; folderId?: string | null; limit?: number } = {}
) {
  const rows = await db
    .select()
    .from(files)
    .where(
      and(
        eq(files.userId, userId),
        eq(files.status, "ready"),
        isNull(files.deletedAt),
        options.category ? eq(files.category, options.category) : undefined,
        options.folderId === undefined
          ? undefined
          : options.folderId === null
            ? isNull(files.folderId)
            : eq(files.folderId, options.folderId)
      )
    )
    .orderBy(desc(files.createdAt))
    .limit(Math.min(Math.max(options.limit ?? 100, 1), 500));
  return rows.map(toFileDto);
}

// ---------------------------------------------------------------------------
// Trash: soft delete with a recovery window (storageConfig.trashRetentionDays).
// ---------------------------------------------------------------------------

/** Move a file to Trash. It can be restored until it is purged. */
export async function moveToTrash(userId: string, fileId: string) {
  const [row] = await db
    .update(files)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(files.id, fileId), eq(files.userId, userId), eq(files.status, "ready"), isNull(files.deletedAt)))
    .returning();
  if (!row) throw new FileServiceError(404, "File not found.");
  return toFileDto(row);
}

/** Restore a file from Trash back to the library. */
export async function restoreFromTrash(userId: string, fileId: string) {
  await purgeExpiredTrash(userId);
  const [row] = await db
    .update(files)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(and(eq(files.id, fileId), eq(files.userId, userId), isNotNull(files.deletedAt)))
    .returning();
  if (!row) throw new FileServiceError(404, "File not found in Trash.");
  return toFileDto(row);
}

/** Trashed files, most recently deleted first. Expired ones are purged first. */
export async function listTrash(userId: string) {
  await purgeExpiredTrash(userId);
  const rows = await db
    .select()
    .from(files)
    .where(and(eq(files.userId, userId), eq(files.status, "ready"), isNotNull(files.deletedAt)))
    .orderBy(desc(files.deletedAt))
    .limit(500);
  return rows.map(toFileDto);
}

/**
 * Permanently delete files: storage objects first, then rows, so a storage
 * failure never leaves a row pointing at nothing or an object nobody owns.
 * Returns how many files were deleted.
 */
async function removePermanently(userId: string, rows: { id: string; storageKey: string }[]) {
  if (rows.length === 0) return 0;
  const storage = getStorage();
  const removed: string[] = [];
  let failed = 0;

  for (const row of rows) {
    try {
      await storage.deleteObject(row.storageKey);
      removed.push(row.id);
    } catch {
      failed++;
    }
  }

  if (removed.length) {
    await db.delete(files).where(and(eq(files.userId, userId), inArray(files.id, removed)));
  }
  if (failed && removed.length === 0) {
    throw new FileServiceError(502, "Couldn't delete the file from storage. Please try again.");
  }
  return removed.length;
}

/** Delete one file forever — from the library or from Trash. */
export async function deleteFilePermanently(userId: string, fileId: string) {
  const [row] = await db
    .select({ id: files.id, storageKey: files.storageKey })
    .from(files)
    .where(and(eq(files.id, fileId), eq(files.userId, userId)))
    .limit(1);
  if (!row) throw new FileServiceError(404, "File not found.");
  await removePermanently(userId, [row]);
}

/** Permanently delete everything in the user's Trash. */
export async function emptyTrash(userId: string) {
  const rows = await db
    .select({ id: files.id, storageKey: files.storageKey })
    .from(files)
    .where(and(eq(files.userId, userId), isNotNull(files.deletedAt)));
  return removePermanently(userId, rows);
}

/** Permanently delete this user's files that have been in Trash too long. */
export async function purgeExpiredTrash(userId: string) {
  const cutoff = new Date(Date.now() - TRASH_RETENTION_MS);
  const rows = await db
    .select({ id: files.id, storageKey: files.storageKey })
    .from(files)
    .where(and(eq(files.userId, userId), isNotNull(files.deletedAt), lt(files.deletedAt, cutoff)))
    .limit(100);
  try {
    return await removePermanently(userId, rows);
  } catch {
    return 0; // Retried on the next visit.
  }
}
