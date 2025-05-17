import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@lib/session";

export async function POST(req: NextRequest) {
  try {
    const { userId, role } = await req.json() as { userId: string, role: string };;

    if (!userId || !role) {
      return NextResponse.json(
        { error: "Missing userId or role" },
        { status: 400 }
      );
    }

    // This sets the session cookie and redirects (if your createSession does so)
    await createSession(userId, role);

    // If createSession redirects, this line may not be reached.
    // If not, you can return a success response:
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}
