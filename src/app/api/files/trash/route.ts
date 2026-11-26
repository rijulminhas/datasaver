import { getApiUser, handleRouteError, jsonError, jsonOk } from "@/lib/api/http";
import { emptyTrash, listTrash } from "@/lib/files/service";
import { storageConfig } from "@/lib/storage/config";

/** GET /api/files/trash — files in Trash with their permanent-deletion date. */
export async function GET() {
  try {
    const user = await getApiUser();
    if (!user) return jsonError(401, "Not authenticated");

    const files = await listTrash(user.id);
    return jsonOk({ files, retentionDays: storageConfig.trashRetentionDays });
  } catch (error) {
    return handleRouteError(error, "Trash list");
  }
}

/** DELETE /api/files/trash — permanently delete everything in Trash. */
export async function DELETE() {
  try {
    const user = await getApiUser();
    if (!user) return jsonError(401, "Not authenticated");

    const deleted = await emptyTrash(user.id);
    return jsonOk({ message: "Trash emptied", deleted });
  } catch (error) {
    return handleRouteError(error, "Empty trash");
  }
}
