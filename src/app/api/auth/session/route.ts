import { NextResponse } from "next/server";
import { verifySession } from "@lib/session";
import { getUserById } from "@db/database";

export async function GET() {
  const session = await verifySession();
  if (!session) {
    console.log(`No session could be verified for user`);
    return NextResponse.json({ user: null, session: null }, { status: 401 });
  }

  // Fetch user data from DB
  const result = await getUserById(session.userId);
  if (!result.success) {
    console.log(`User not found in database`);
    return NextResponse.json({ user: null, session: null }, { status: 401 });
  }

  console.log(`Verified user session.`)
  return NextResponse.json({
    user: result.user,
    session: session,
  });
}
