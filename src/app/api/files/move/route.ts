import type { NextRequest } from "next/server";
import { z } from "zod";

import { getApiUser, handleRouteError, jsonError, jsonOk } from "@/lib/api/http";
import { moveFiles } from "@/lib/folders/service";
import { checkRateLimit } from "@/lib/rate-limit";

const moveSchema = z.object({
  fileIds: z.array(z.uuid()).min(1, "Select at least one file").max(500, "Move at most 500 files at a time"),
  /** Destination folder, or null for the top level. */
  folderId: z.uuid().nullable(),
});

/** POST /api/files/move { fileIds, folderId } — move one or more files. */
export async function POST(request: NextRequest) {
  try {
    const user = await getApiUser();
    if (!user) return jsonError(401, "Not authenticated");

    if (!checkRateLimit(`move:${user.id}`, 60, 60_000).success) {
      return jsonError(429, "Too many requests. Please wait a moment.");
    }

    const parsed = moveSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return jsonError(400, parsed.error.issues[0]?.message ?? "Invalid move request");

    const fileIds = [...new Set(parsed.data.fileIds)];
    const moved = await moveFiles(user.id, fileIds, parsed.data.folderId);
    return jsonOk({ moved });
  } catch (error) {
    return handleRouteError(error, "File move");
  }
}
