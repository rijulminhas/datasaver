import { fileIdSchema, getApiUser, handleRouteError, jsonError, jsonOk } from "@/lib/api/http";
import { restoreFromTrash } from "@/lib/files/service";

/** POST /api/files/[id]/restore — move a file from Trash back to the library. */
export async function POST(_request: Request, ctx: RouteContext<"/api/files/[id]/restore">) {
  try {
    const user = await getApiUser();
    if (!user) return jsonError(401, "Not authenticated");

    const { id } = await ctx.params;
    if (!fileIdSchema.safeParse(id).success) return jsonError(404, "File not found in Trash.");

    const file = await restoreFromTrash(user.id, id);
    return jsonOk({ message: "File restored", file });
  } catch (error) {
    return handleRouteError(error, "File restore");
  }
}
