import { NextRequest, NextResponse } from "next/server";
import { updateProfileById } from "@lib/userService";

export async function POST(req: NextRequest) {
  try {
    const { userId, updates } = await req.json() as {
      userId: string;
      updates: Record<string, unknown>;
    };
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Missing userId" },
        { status: 400 }
      );
    }
    const profile = await updateProfileById(userId, updates);
    if (!profile) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, user: profile }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
