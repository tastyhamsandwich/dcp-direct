import { NextRequest, NextResponse } from "next/server";
import { generateVerificationToken } from "@lib/utils";
import { sendVerificationEmail } from "@lib/mailers";
import { EmailVerification } from "@lib/mongoose/schema/email";
import { testIsEmail as isValidEmail } from "@lib/utils";
import { verifySession } from '@/lib/session';;

export async function PUT(req: NextRequest) {
  try {
    const session = await verifySession();

    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { newEmail } = await req.json() as { newEmail: string };
    const userId = session.userId;  

    if (!isValidEmail(newEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    const verificationToken = generateVerificationToken();

    await EmailVerification.create({
      user_id: userId,
      new_email: newEmail,
      token: verificationToken,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });

    await sendVerificationEmail(newEmail, verificationToken);

    return NextResponse.json(
      {
        message: "Verification email sent",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating email:", error);
    return NextResponse.json(
      { error: "Failed to process email update" },
      { status: 500 }
    );
  }
}
