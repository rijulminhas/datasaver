import type { NextRequest } from "next/server";
import { z } from "zod";

import { getApiUser, handleRouteError, jsonError, jsonOk } from "@/lib/api/http";
import { FILE_CATEGORIES } from "@/lib/files/categories";
import { listFiles } from "@/lib/files/service";

const querySchema = z.object({
  category: z.enum(FILE_CATEGORIES).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  /** A folder id, or "root" for files not in any folder. Omit for all files. */
  folderId: z.union([z.literal("root"), z.uuid()]).optional(),
});

/** GET /api/files?category=photos&folderId=<id|root>&limit=50 — the user's files, newest first. */
export async function GET(request: NextRequest) {
  try {
    const user = await getApiUser();
    if (!user) return jsonError(401, "Not authenticated");

    const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
    if (!parsed.success) return jsonError(400, "Invalid query parameters");

    const { folderId, ...rest } = parsed.data;
    const files = await listFiles(user.id, {
      ...rest,
      folderId: folderId === undefined ? undefined : folderId === "root" ? null : folderId,
    });
    return jsonOk({ files });
  } catch (error) {
    return handleRouteError(error, "File list");
  }
}
