import { NextResponse } from "next/server";
import { verifySession } from "@lib/session";
import { getUserById } from "@db/database";

export async function GET() {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ user: null, session: null }, { status: 401 });
  }

  // Fetch user data from DB
  const { data: user } = await getUserById(session.userId);

  // Compose a session object for the frontend
  const sessionData = {
    userId: session.userId,
    role: session.role,
    expiresAt: session.expiresAt,
  };

  return NextResponse.json({
    user,
    session: sessionData,
  });
}
