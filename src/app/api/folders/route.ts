import type { NextRequest } from "next/server";
import { z } from "zod";

import { getApiUser, handleRouteError, jsonError, jsonOk } from "@/lib/api/http";
import { createFolder, listAllFolders, listFolders, MAX_FOLDER_NAME_LENGTH } from "@/lib/folders/service";
import { checkRateLimit } from "@/lib/rate-limit";

const querySchema = z.object({
  parentId: z.uuid().optional(),
  all: z.enum(["true", "false"]).optional(),
});

const createSchema = z.object({
  name: z.string().max(MAX_FOLDER_NAME_LENGTH * 4, "Folder name is too long"),
  parentFolderId: z.uuid().nullish(),
});

/**
 * GET /api/folders                 → top-level folders (with counts)
 * GET /api/folders?parentId=<id>   → subfolders of one folder
 * GET /api/folders?all=true        → every folder (id, name, parent) for pickers
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getApiUser();
    if (!user) return jsonError(401, "Not authenticated");

    const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
    if (!parsed.success) return jsonError(400, "Invalid query parameters");

    if (parsed.data.all === "true") {
      return jsonOk({ folders: await listAllFolders(user.id) });
    }
    return jsonOk({ folders: await listFolders(user.id, parsed.data.parentId ?? null) });
  } catch (error) {
    return handleRouteError(error, "Folder list");
  }
}

/** POST /api/folders { name, parentFolderId? } — create a folder. */
export async function POST(request: NextRequest) {
  try {
    const user = await getApiUser();
    if (!user) return jsonError(401, "Not authenticated");

    if (!checkRateLimit(`folders:${user.id}`, 60, 60_000).success) {
      return jsonError(429, "Too many requests. Please wait a moment.");
    }

    const parsed = createSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return jsonError(400, parsed.error.issues[0]?.message ?? "Invalid folder");

    const folder = await createFolder(user.id, {
      name: parsed.data.name,
      parentFolderId: parsed.data.parentFolderId ?? null,
    });
    return jsonOk({ folder }, 201);
  } catch (error) {
    return handleRouteError(error, "Folder create");
  }
}
