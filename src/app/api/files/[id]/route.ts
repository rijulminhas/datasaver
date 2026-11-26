import type { NextRequest } from "next/server";

import { fileIdSchema, getApiUser, handleRouteError, jsonError, jsonOk } from "@/lib/api/http";
import { deleteFilePermanently, getOwnedFile, moveToTrash, toFileDto } from "@/lib/files/service";
import { storageConfig } from "@/lib/storage/config";

/** GET /api/files/[id] — metadata for one of the user's files. */
export async function GET(_request: Request, ctx: RouteContext<"/api/files/[id]">) {
  try {
    const user = await getApiUser();
    if (!user) return jsonError(401, "Not authenticated");

    const { id } = await ctx.params;
    if (!fileIdSchema.safeParse(id).success) return jsonError(404, "File not found.");

    const file = await getOwnedFile(user.id, id);
    return jsonOk({ file: toFileDto(file) });
  } catch (error) {
    return handleRouteError(error, "File lookup");
  }
}

/**
 * DELETE /api/files/[id]
 *   default            → move to Trash (restorable for 30 days)
 *   ?permanent=true    → delete the file and its contents forever
 */
export async function DELETE(request: NextRequest, ctx: RouteContext<"/api/files/[id]">) {
  try {
    const user = await getApiUser();
    if (!user) return jsonError(401, "Not authenticated");

    const { id } = await ctx.params;
    if (!fileIdSchema.safeParse(id).success) return jsonError(404, "File not found.");

    if (request.nextUrl.searchParams.get("permanent") === "true") {
      await deleteFilePermanently(user.id, id);
      return jsonOk({ message: "File permanently deleted" });
    }

    const file = await moveToTrash(user.id, id);
    return jsonOk({
      message: `Moved to Trash. It will be permanently deleted after ${storageConfig.trashRetentionDays} days.`,
      file,
    });
  } catch (error) {
    return handleRouteError(error, "File delete");
  }
}
