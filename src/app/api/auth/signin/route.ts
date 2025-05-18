import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@lib/session";
import { validateUser } from "@db/database";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json() as { email: string, password: string };

    const user = await validateUser(email, password);
    if (!user.success) {
      return NextResponse.json(
        { error: user.error },
        { status: 401 }
      );
    }
    const { id, role } = user.user;

    if (!id || !role) 
      return NextResponse.json({ success: false }, { status: 401 });
    
    const result = await createSession(id, role);

    // If createSession redirects, this line may not be reached.
    // If not, you can return a success response:
    return NextResponse.json({ user: user.user, session: result, success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}
