import "server-only";

import { and, asc, count, eq, inArray, isNull, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { files, folders } from "@/lib/db/schema";
import { FileServiceError } from "@/lib/files/service";

/**
 * Folder operations. Like the file service, every function takes the
 * authenticated user's id (from the session) and scopes every query to it.
 * A folder that belongs to someone else behaves exactly like one that
 * doesn't exist (404).
 */

/** Deepest nesting allowed (root-level folders are depth 1). */
export const MAX_FOLDER_DEPTH = 10;
/** Folders one user may own in total. Never unlimited. */
export const MAX_FOLDERS_PER_USER = 1000;
export const MAX_FOLDER_NAME_LENGTH = 100;

export type FolderDto = {
  id: string;
  name: string;
  parentFolderId: string | null;
  createdAt: string;
  /** Files directly inside this folder (not counting subfolders or Trash). */
  fileCount: number;
  /** Direct subfolders. */
  folderCount: number;
};

export type FolderSummary = Pick<FolderDto, "id" | "name" | "parentFolderId">;

type FolderRow = typeof folders.$inferSelect;

function toFolderDto(row: FolderRow, fileCount = 0, folderCount = 0): FolderDto {
  return {
    id: row.id,
    name: row.name,
    parentFolderId: row.parentFolderId,
    createdAt: row.createdAt.toISOString(),
    fileCount,
    folderCount,
  };
}

/**
 * Validate and normalise a folder name. Names are display metadata only (no
 * folder ever maps to a storage path), but slashes are still rejected so
 * breadcrumbs and "Folder / Subfolder" paths stay unambiguous.
 */
export function normalizeFolderName(raw: string) {
  const name = raw
    .normalize("NFC")
    // Control characters and bidi overrides.
    .replace(/[\u0000-\u001f\u007f‪-‮⁦-⁩]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!name) throw new FileServiceError(400, "Folder name is required.");
  if (name === "." || name === "..") throw new FileServiceError(400, "That folder name isn't allowed.");
  if (/[\\/]/.test(name)) throw new FileServiceError(400, "Folder names can't contain / or \\.");
  if (name.length > MAX_FOLDER_NAME_LENGTH) {
    throw new FileServiceError(400, `Folder names can be at most ${MAX_FOLDER_NAME_LENGTH} characters.`);
  }
  return name;
}

/** Postgres unique_violation, possibly wrapped by the driver/ORM. */
function isUniqueViolation(error: unknown) {
  let current: unknown = error;
  for (let i = 0; i < 4 && current; i++) {
    if (typeof current === "object" && (current as { code?: unknown }).code === "23505") return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

const DUPLICATE_NAME = "A folder with that name already exists here.";

/** A folder owned by the user, or a 404. */
export async function getOwnedFolder(userId: string, folderId: string) {
  const [row] = await db
    .select()
    .from(folders)
    .where(and(eq(folders.id, folderId), eq(folders.userId, userId)))
    .limit(1);
  if (!row) throw new FileServiceError(404, "Folder not found.");
  return row;
}

/** Breadcrumb from the root down to (and including) the folder. */
export async function getFolderPath(userId: string, folderId: string): Promise<FolderSummary[]> {
  const result = await db.execute<{ id: string; name: string; parent_folder_id: string | null; depth: number }>(sql`
    WITH RECURSIVE path AS (
      SELECT id, name, parent_folder_id, 0 AS depth
      FROM ${folders}
      WHERE id = ${folderId} AND user_id = ${userId}
      UNION ALL
      SELECT f.id, f.name, f.parent_folder_id, path.depth + 1
      FROM ${folders} f
      JOIN path ON f.id = path.parent_folder_id
      WHERE f.user_id = ${userId} AND path.depth < ${MAX_FOLDER_DEPTH + 5}
    )
    SELECT id, name, parent_folder_id, depth FROM path ORDER BY depth DESC
  `);
  if (result.rows.length === 0) throw new FileServiceError(404, "Folder not found.");
  return result.rows.map((r) => ({ id: r.id, name: r.name, parentFolderId: r.parent_folder_id }));
}

/** Ids of the folder and every folder nested inside it. */
async function getSubtreeIds(userId: string, folderId: string) {
  const result = await db.execute<{ id: string }>(sql`
    WITH RECURSIVE tree AS (
      SELECT id, 0 AS depth FROM ${folders} WHERE id = ${folderId} AND user_id = ${userId}
      UNION ALL
      SELECT f.id, tree.depth + 1
      FROM ${folders} f
      JOIN tree ON f.parent_folder_id = tree.id
      WHERE f.user_id = ${userId} AND tree.depth < ${MAX_FOLDER_DEPTH + 5}
    )
    SELECT id FROM tree
  `);
  return result.rows.map((r) => r.id);
}

/** Direct children of a folder (or of the root when parentFolderId is null), A–Z, with counts. */
export async function listFolders(userId: string, parentFolderId: string | null): Promise<FolderDto[]> {
  if (parentFolderId) await getOwnedFolder(userId, parentFolderId);

  const rows = await db
    .select()
    .from(folders)
    .where(
      and(
        eq(folders.userId, userId),
        parentFolderId ? eq(folders.parentFolderId, parentFolderId) : isNull(folders.parentFolderId)
      )
    )
    .orderBy(asc(sql`lower(${folders.name})`), asc(folders.name))
    .limit(MAX_FOLDERS_PER_USER);

  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);

  const [fileCounts, folderCounts] = await Promise.all([
    db
      .select({ folderId: files.folderId, value: count() })
      .from(files)
      .where(and(eq(files.userId, userId), eq(files.status, "ready"), isNull(files.deletedAt), inArray(files.folderId, ids)))
      .groupBy(files.folderId),
    db
      .select({ parentId: folders.parentFolderId, value: count() })
      .from(folders)
      .where(and(eq(folders.userId, userId), inArray(folders.parentFolderId, ids)))
      .groupBy(folders.parentFolderId),
  ]);

  const filesBy = new Map(fileCounts.map((c) => [c.folderId, c.value]));
  const foldersBy = new Map(folderCounts.map((c) => [c.parentId, c.value]));
  return rows.map((row) => toFolderDto(row, filesBy.get(row.id) ?? 0, foldersBy.get(row.id) ?? 0));
}

/** Every folder the user owns (id, name, parent) — for the "Move to" picker. */
export async function listAllFolders(userId: string): Promise<FolderSummary[]> {
  return db
    .select({ id: folders.id, name: folders.name, parentFolderId: folders.parentFolderId })
    .from(folders)
    .where(eq(folders.userId, userId))
    .orderBy(asc(sql`lower(${folders.name})`), asc(folders.name))
    .limit(MAX_FOLDERS_PER_USER);
}

export async function createFolder(userId: string, input: { name: string; parentFolderId: string | null }) {
  const name = normalizeFolderName(input.name);

  if (input.parentFolderId) {
    const path = await getFolderPath(userId, input.parentFolderId); // 404s if not owned
    if (path.length >= MAX_FOLDER_DEPTH) {
      throw new FileServiceError(400, `Folders can be nested at most ${MAX_FOLDER_DEPTH} levels deep.`);
    }
  }

  const [total] = await db.select({ value: count() }).from(folders).where(eq(folders.userId, userId));
  if ((total?.value ?? 0) >= MAX_FOLDERS_PER_USER) {
    throw new FileServiceError(409, `You can have at most ${MAX_FOLDERS_PER_USER} folders.`);
  }

  try {
    const [row] = await db
      .insert(folders)
      .values({ userId, name, parentFolderId: input.parentFolderId })
      .returning();
    return toFolderDto(row);
  } catch (error) {
    if (isUniqueViolation(error)) throw new FileServiceError(409, DUPLICATE_NAME);
    throw error;
  }
}

export async function renameFolder(userId: string, folderId: string, rawName: string) {
  const name = normalizeFolderName(rawName);
  try {
    const [row] = await db
      .update(folders)
      .set({ name, updatedAt: new Date() })
      .where(and(eq(folders.id, folderId), eq(folders.userId, userId)))
      .returning();
    if (!row) throw new FileServiceError(404, "Folder not found.");
    return toFolderDto(row);
  } catch (error) {
    if (isUniqueViolation(error)) throw new FileServiceError(409, DUPLICATE_NAME);
    throw error;
  }
}

/**
 * Delete a folder and everything nested inside it. Files are never destroyed
 * here: they are moved to Trash (restorable for the retention period) and,
 * because their folder no longer exists, restore to the top level.
 * Returns how many files were moved to Trash.
 */
export async function deleteFolder(userId: string, folderId: string) {
  const ids = await getSubtreeIds(userId, folderId);
  if (ids.length === 0) throw new FileServiceError(404, "Folder not found.");

  const now = new Date();
  // One atomic batch: trash the files, then delete the folder (subfolders
  // cascade; the FK sets the files' folder_id to null).
  const [trashed] = await db.batch([
    db
      .update(files)
      .set({ deletedAt: now, updatedAt: now })
      .where(and(eq(files.userId, userId), inArray(files.folderId, ids), isNull(files.deletedAt), eq(files.status, "ready")))
      .returning({ id: files.id }),
    db.delete(folders).where(and(eq(folders.id, folderId), eq(folders.userId, userId))),
  ]);

  return trashed.length;
}

/**
 * Move files into a folder (or to the top level with folderId = null).
 * Only the user's own library files are touched; returns how many moved.
 */
export async function moveFiles(userId: string, fileIds: string[], folderId: string | null) {
  if (folderId) await getOwnedFolder(userId, folderId);

  const moved = await db
    .update(files)
    .set({ folderId, updatedAt: new Date() })
    .where(and(eq(files.userId, userId), inArray(files.id, fileIds), eq(files.status, "ready"), isNull(files.deletedAt)))
    .returning({ id: files.id });

  if (moved.length === 0) throw new FileServiceError(404, "File not found.");
  return moved.length;
}
