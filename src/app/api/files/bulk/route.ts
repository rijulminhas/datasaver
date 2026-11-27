import type { NextRequest } from "next/server";
import { z } from "zod";

import { getApiUser, handleRouteError, jsonError, jsonOk } from "@/lib/api/http";
import { deleteManyPermanently, MAX_BULK_FILES, moveManyToTrash, restoreManyFromTrash } from "@/lib/files/service";
import { checkRateLimit } from "@/lib/rate-limit";

const bulkSchema = z.object({
  action: z.enum(["trash", "restore", "delete"]),
  fileIds: z
    .array(z.uuid())
    .min(1, "Select at least one file")
    .max(MAX_BULK_FILES, `Select at most ${MAX_BULK_FILES} files at a time`),
});

/**
 * POST /api/files/bulk { action, fileIds }
 *   trash   → move library files to Trash (restorable)
 *   restore → bring files back from Trash
 *   delete  → delete files and their stored contents forever
 * (Moving many files to a folder is POST /api/files/move.)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getApiUser();
    if (!user) return jsonError(401, "Not authenticated");

    if (!checkRateLimit(`bulk:${user.id}`, 30, 60_000).success) {
      return jsonError(429, "Too many requests. Please wait a moment.");
    }

    const parsed = bulkSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return jsonError(400, parsed.error.issues[0]?.message ?? "Invalid bulk request");

    const fileIds = [...new Set(parsed.data.fileIds)];
    const count =
      parsed.data.action === "trash"
        ? await moveManyToTrash(user.id, fileIds)
        : parsed.data.action === "restore"
          ? await restoreManyFromTrash(user.id, fileIds)
          : await deleteManyPermanently(user.id, fileIds);

    return jsonOk({ action: parsed.data.action, count, requested: fileIds.length });
  } catch (error) {
    return handleRouteError(error, "Bulk file action");
  }
}
