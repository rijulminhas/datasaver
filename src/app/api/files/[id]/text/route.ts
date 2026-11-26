import { fileIdSchema, getApiUser, handleRouteError, jsonError, jsonOk } from "@/lib/api/http";
import { readTextPreview } from "@/lib/files/service";

/** GET /api/files/[id]/text — first 256 KB of a text file, as JSON. */
export async function GET(_request: Request, ctx: RouteContext<"/api/files/[id]/text">) {
  try {
    const user = await getApiUser();
    if (!user) return jsonError(401, "Not authenticated");

    const { id } = await ctx.params;
    if (!fileIdSchema.safeParse(id).success) return jsonError(404, "File not found.");

    const preview = await readTextPreview(user.id, id);
    return jsonOk(preview);
  } catch (error) {
    return handleRouteError(error, "Text preview");
  }
}
