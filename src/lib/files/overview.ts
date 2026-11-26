import "server-only";

import { and, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { files } from "@/lib/db/schema";
import { FILE_CATEGORIES, isFileCategory, type FileCategory } from "@/lib/files/categories";
import { purgeExpiredTrash, toFileDto, type FileDto } from "@/lib/files/service";
import { storageConfig } from "@/lib/storage/config";

export type CategoryUsage = { count: number; bytes: number };

export type StorageOverview = {
  /** Files in the library (Trash excluded). */
  totalFiles: number;
  /** All stored bytes, including Trash — this is what counts toward the quota. */
  usedBytes: number;
  quotaBytes: number;
  availableBytes: number;
  byCategory: Record<FileCategory, CategoryUsage>;
  trash: CategoryUsage;
  recentFiles: FileDto[];
};

/**
 * Storage summary for one user. Callers must pass the id of the signed-in
 * user (from requireUser), never a client-supplied id. Only verified ("ready")
 * files are counted.
 */
export async function getStorageOverview(userId: string): Promise<StorageOverview> {
  await purgeExpiredTrash(userId);

  const ownedReady = and(eq(files.userId, userId), eq(files.status, "ready"));

  const [grouped, trashRows, recent] = await Promise.all([
    db
      .select({
        category: files.category,
        count: sql<string>`count(*)`,
        bytes: sql<string>`coalesce(sum(${files.size}), 0)`,
      })
      .from(files)
      .where(and(ownedReady, isNull(files.deletedAt)))
      .groupBy(files.category),
    db
      .select({ count: sql<string>`count(*)`, bytes: sql<string>`coalesce(sum(${files.size}), 0)` })
      .from(files)
      .where(and(ownedReady, isNotNull(files.deletedAt))),
    db
      .select()
      .from(files)
      .where(and(ownedReady, isNull(files.deletedAt)))
      .orderBy(desc(files.createdAt))
      .limit(6),
  ]);

  const byCategory = Object.fromEntries(
    FILE_CATEGORIES.map((category) => [category, { count: 0, bytes: 0 }])
  ) as Record<FileCategory, CategoryUsage>;

  for (const row of grouped) {
    const category = isFileCategory(row.category) ? row.category : "other";
    byCategory[category].count += Number(row.count);
    byCategory[category].bytes += Number(row.bytes);
  }

  const trash = { count: Number(trashRows[0]?.count ?? 0), bytes: Number(trashRows[0]?.bytes ?? 0) };
  const totalFiles = FILE_CATEGORIES.reduce((sum, c) => sum + byCategory[c].count, 0);
  const libraryBytes = FILE_CATEGORIES.reduce((sum, c) => sum + byCategory[c].bytes, 0);
  const usedBytes = libraryBytes + trash.bytes;
  const quotaBytes = storageConfig.quotaBytesPerUser;

  return {
    totalFiles,
    usedBytes,
    quotaBytes,
    availableBytes: Math.max(0, quotaBytes - usedBytes),
    byCategory,
    trash,
    recentFiles: recent.map(toFileDto),
  };
}
