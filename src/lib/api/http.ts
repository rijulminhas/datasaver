import "server-only";

import { NextResponse } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/session";
import { FileServiceError } from "@/lib/files/service";

const NO_STORE = { "Cache-Control": "no-store" };

export function jsonError(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ success: false, message, ...extra }, { status, headers: NO_STORE });
}

export function jsonOk(data: Record<string, unknown>, status = 200) {
  return NextResponse.json({ success: true, ...data }, { status, headers: NO_STORE });
}

/** Session user for API routes, or null (caller returns 401). */
export async function getApiUser() {
  return getCurrentUser();
}

export const fileIdSchema = z.uuid();

/** Convert thrown errors into safe JSON responses. Never leaks internals. */
export function handleRouteError(error: unknown, context: string) {
  unstable_rethrow(error);

  if (error instanceof FileServiceError) {
    return jsonError(error.status, error.message);
  }

  // Log only the error type/message — never request bodies, keys or tokens.
  console.error(`${context} failed:`, error instanceof Error ? `${error.name}: ${error.message}` : "unknown error");
  return jsonError(500, "Something went wrong. Please try again.");
}
