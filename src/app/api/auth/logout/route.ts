
import { NextResponse } from "next/server";
import { deleteCurrentSession } from "@/lib/auth/session";


export async function POST() {
  try {
    // Delete the database session and expire the cookie.
    await deleteCurrentSession();

    return NextResponse.json(
      {
        success: true,
        message: "Logged out successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Logout error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to log out. Please try again.",
      },
      { status: 500 }
    );
  }
}
