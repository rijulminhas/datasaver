import { NextResponse } from "next/server";

import { fileIdSchema, getApiUser, handleRouteError, jsonError } from "@/lib/api/http";
import { createPreviewUrl } from "@/lib/files/service";

/**
 * GET /api/files/[id]/preview — for images, video, audio and PDF only.
 * Checks ownership on every request, then redirects to a signed inline URL.
 * Used as the src of <img>/<video>/<audio>/<iframe> in the app.
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/files/[id]/preview">) {
  try {
    const user = await getApiUser();
    if (!user) return jsonError(401, "Not authenticated");

    const { id } = await ctx.params;
    if (!fileIdSchema.safeParse(id).success) return jsonError(404, "File not found.");

    const url = await createPreviewUrl(user.id, id);
    return NextResponse.redirect(url, {
      status: 302,
      headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" },
    });
  } catch (error) {
    return handleRouteError(error, "File preview");
  }
}
