import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { unstable_rethrow } from "next/navigation";

// Returns the signed-in user's public profile. Never includes the password
// hash or session token.
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      { success: true, user },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    // Let Next.js handle its own control-flow errors (e.g. request-time bailouts).
    unstable_rethrow(error);

    console.error("Current user lookup failed:", error instanceof Error ? error.name : "unknown");

    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
