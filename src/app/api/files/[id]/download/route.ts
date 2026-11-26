import { NextResponse } from "next/server";

import { fileIdSchema, getApiUser, handleRouteError, jsonError } from "@/lib/api/http";
import { createDownloadUrl } from "@/lib/files/service";

/**
 * GET /api/files/[id]/download — checks ownership, then redirects to a
 * signed URL valid for 60 seconds. Storage URLs are never public or reusable.
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/files/[id]/download">) {
  try {
    const user = await getApiUser();
    if (!user) return jsonError(401, "Not authenticated");

    const { id } = await ctx.params;
    if (!fileIdSchema.safeParse(id).success) return jsonError(404, "File not found.");

    const url = await createDownloadUrl(user.id, id);
    return NextResponse.redirect(url, {
      status: 302,
      headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
    });
  } catch (error) {
    return handleRouteError(error, "File download");
  }
}
