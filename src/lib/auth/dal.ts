import "server-only";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { cache } from "react";

import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

/**
 * Data Access Layer for authenticated server code.
 *
 * `requireUser` validates the session against the database and redirects to
 * /login when it is missing or expired. `cache` dedupes the lookup within a
 * single request, so many components can call it for one DB query.
 * Must be called inside a <Suspense> boundary (it reads cookies).
 */
export const requireUser = cache(async () => {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
});

export type CurrentUser = Awaited<ReturnType<typeof requireUser>>;

/** Profile details for the signed-in user only. Never returns the password hash. */
export const getProfile = cache(async () => {
  const user = await requireUser();

  const [profile] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  if (!profile) redirect("/login");
  return profile;
});
