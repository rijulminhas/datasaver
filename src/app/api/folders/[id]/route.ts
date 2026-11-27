import type { NextRequest } from "next/server";
import { z } from "zod";

import { fileIdSchema, getApiUser, handleRouteError, jsonError, jsonOk } from "@/lib/api/http";
import { deleteFolder, getFolderPath, MAX_FOLDER_NAME_LENGTH, renameFolder } from "@/lib/folders/service";
import { checkRateLimit } from "@/lib/rate-limit";
import { storageConfig } from "@/lib/storage/config";

const renameSchema = z.object({
  name: z.string().max(MAX_FOLDER_NAME_LENGTH * 4, "Folder name is too long"),
});

/** GET /api/folders/[id] — the folder plus its breadcrumb path from the top level. */
export async function GET(_request: Request, ctx: RouteContext<"/api/folders/[id]">) {
  try {
    const user = await getApiUser();
    if (!user) return jsonError(401, "Not authenticated");

    const { id } = await ctx.params;
    if (!fileIdSchema.safeParse(id).success) return jsonError(404, "Folder not found.");

    const path = await getFolderPath(user.id, id);
    return jsonOk({ folder: path[path.length - 1], path });
  } catch (error) {
    return handleRouteError(error, "Folder lookup");
  }
}

/** PATCH /api/folders/[id] { name } — rename a folder. */
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/folders/[id]">) {
  try {
    const user = await getApiUser();
    if (!user) return jsonError(401, "Not authenticated");

    const { id } = await ctx.params;
    if (!fileIdSchema.safeParse(id).success) return jsonError(404, "Folder not found.");

    if (!checkRateLimit(`folders:${user.id}`, 60, 60_000).success) {
      return jsonError(429, "Too many requests. Please wait a moment.");
    }

    const parsed = renameSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return jsonError(400, parsed.error.issues[0]?.message ?? "Invalid folder name");

    const folder = await renameFolder(user.id, id, parsed.data.name);
    return jsonOk({ folder });
  } catch (error) {
    return handleRouteError(error, "Folder rename");
  }
}

/**
 * DELETE /api/folders/[id] — delete the folder and its subfolders. Files
 * inside are moved to Trash (not destroyed) and restore to the top level.
 */
export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/folders/[id]">) {
  try {
    const user = await getApiUser();
    if (!user) return jsonError(401, "Not authenticated");

    const { id } = await ctx.params;
    if (!fileIdSchema.safeParse(id).success) return jsonError(404, "Folder not found.");

    if (!checkRateLimit(`folders:${user.id}`, 60, 60_000).success) {
      return jsonError(429, "Too many requests. Please wait a moment.");
    }

    const trashedFiles = await deleteFolder(user.id, id);
    return jsonOk({
      message:
        trashedFiles > 0
          ? `Folder deleted. ${trashedFiles} ${trashedFiles === 1 ? "file was" : "files were"} moved to Trash for ${storageConfig.trashRetentionDays} days.`
          : "Folder deleted.",
      trashedFiles,
    });
  } catch (error) {
    return handleRouteError(error, "Folder delete");
  }
}
