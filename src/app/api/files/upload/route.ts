import type { NextRequest } from "next/server";
import { z } from "zod";

import { getApiUser, handleRouteError, jsonError, jsonOk } from "@/lib/api/http";
import { createUpload } from "@/lib/files/service";
import { checkRateLimit } from "@/lib/rate-limit";

const uploadSchema = z.object({
  name: z.string().trim().min(1, "File name is required").max(1024),
  size: z.number().int().min(1, "Empty files can't be uploaded").max(Number.MAX_SAFE_INTEGER),
});

/**
 * POST /api/files/upload — step 1 of an upload.
 * Validates the request, reserves quota and returns a short-lived signed URL
 * the browser PUTs the file to. The upload must then be confirmed with
 * POST /api/files/[id]/complete.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getApiUser();
    if (!user) return jsonError(401, "Not authenticated");

    const limit = checkRateLimit(`upload:${user.id}`, 60, 60_000);
    if (!limit.success) {
      return jsonError(429, "Too many uploads. Please wait a moment.", undefined);
    }

    const body = await request.json().catch(() => null);
    const parsed = uploadSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(400, parsed.error.issues[0]?.message ?? "Invalid upload request");
    }

    const { fileId, upload } = await createUpload(user.id, parsed.data);
    return jsonOk({ fileId, upload }, 201);
  } catch (error) {
    return handleRouteError(error, "Upload init");
  }
}
