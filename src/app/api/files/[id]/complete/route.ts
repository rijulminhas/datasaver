import { fileIdSchema, getApiUser, handleRouteError, jsonError, jsonOk } from "@/lib/api/http";
import { completeUpload } from "@/lib/files/service";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * POST /api/files/[id]/complete — step 2 of an upload.
 * Verifies the stored object (size, quota, file signature) and marks the
 * file ready. Invalid uploads are deleted from storage.
 */
export async function POST(_request: Request, ctx: RouteContext<"/api/files/[id]/complete">) {
  try {
    const user = await getApiUser();
    if (!user) return jsonError(401, "Not authenticated");

    const limit = checkRateLimit(`upload-complete:${user.id}`, 120, 60_000);
    if (!limit.success) return jsonError(429, "Too many requests. Please wait a moment.");

    const { id } = await ctx.params;
    if (!fileIdSchema.safeParse(id).success) return jsonError(404, "Upload not found.");

    const file = await completeUpload(user.id, id);
    return jsonOk({ file });
  } catch (error) {
    return handleRouteError(error, "Upload complete");
  }
}
