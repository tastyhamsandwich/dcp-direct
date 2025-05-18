import { NextRequest, NextResponse } from "next/server";
import { registerSchema } from "@lib/zod";
import { createUser } from "@db/database";
import { createSession } from "@lib/session";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Validate input
    const validated = registerSchema.safeParse(body);
    if (!validated.success) {
      console.log(`Failed to validate form data`);
      return NextResponse.json({
        success: false,
        errors: validated.error.flatten().fieldErrors,
      }, { status: 400 });
    }

    // Create user
    const { username, email, password } = validated.data;
    const result = await createUser({ username, email, password });
    if (!result.success) {
      console.log(`Creating new user unsuccessful.`);
      return NextResponse.json({
        success: false,
        errors: { email: [result.error || result.message || "Registration failed"] },
      }, { status: 400 });
    }

    // Create session (sets cookie)
    await createSession(result.user.id!, result.user.role!);

    // Return user info (never return password)
    return NextResponse.json({
      success: true,
      user: {
        id: result.user.id,
        username: result.user.username,
        role: result.user.role,
        balance: result.user.balance,
        avatar: result.user.avatar,
        level: result.user.level,
        exp: result.user.exp,
      },
    });
  } catch (err) {
    if (err instanceof Error)
      console.log(`Error encountered registering user: ${err.message}`);
    return NextResponse.json({
      success: false,
      errors: { email: ["Internal server error"] },
    }, { status: 500 });
  }
}
