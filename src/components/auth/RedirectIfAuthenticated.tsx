import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";

/**
 * Sends already signed-in users to the dashboard. Validates the session
 * against the database (not just cookie presence), so a stale cookie never
 * causes a redirect loop. Render inside <Suspense> — it reads cookies.
 */
export default async function RedirectIfAuthenticated() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  return null;
}
