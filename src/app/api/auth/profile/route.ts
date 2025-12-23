import { NextResponse } from "next/server";
import { verifySession } from "@lib/session";
import { getProfileById } from "@lib/userService";

export async function GET() {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "No active session" },
        { status: 401 }
      );
    }

    const profile = await getProfileById(session.userId);
    if (!profile) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, user: profile }, { status: 200 });
  } catch (error) {
    if (error instanceof Error) {
      console.log(`Error fetching profile: ${error.message}`);
    }
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
