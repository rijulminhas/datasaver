
import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { connection } from "next/server";

import { db } from "@/lib/db";
import { sessions, users } from "@/lib/db/schema";

export const SESSION_COOKIE_NAME = "auth_session";

const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000;

// Hash the session token before storing it in PostgreSQL.
function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

// Create a new session.
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");

  const tokenHash = hashSessionToken(token);

  const expiresAt = new Date(Date.now() + SESSION_DURATION);

  await db.insert(sessions).values({
    userId,
    tokenHash,
    expiresAt,
  });

  return {
    token,
    expiresAt,
  };
}

// Set the secure session cookie.
export async function setSessionCookie(token: string, expiresAt: Date) {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

// Get the authenticated user from the session.
export async function getCurrentUser() {
  // Session validity depends on the current time, so this must run at request
  // time. Without this, Cache Components + Partial Prefetching may try to
  // prerender it and reject `new Date()` ("Blocking Route" error).
  await connection();

  const cookieStore = await cookies();

  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const tokenHash = hashSessionToken(token);

  const [result] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.tokenHash, tokenHash),
        gt(sessions.expiresAt, new Date())
      )
    )
    .limit(1);

  return result ?? null;
}

// Destroy the current session.
export async function deleteCurrentSession() {
  const cookieStore = await cookies();

  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    const tokenHash = hashSessionToken(token);

    await db
      .delete(sessions)
      .where(eq(sessions.tokenHash, tokenHash));
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}
