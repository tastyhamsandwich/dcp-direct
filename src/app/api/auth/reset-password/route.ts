import { NextResponse, NextRequest } from "next/server";
import { getUserByResetToken, updateUser } from "@lib/db/database";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { token, newPassword } = (await req.json()) as { token: string; newPassword: string };

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: "Missing required fields", code: 101 },
        { status: 400 }
      );
    }

    // Find user with valid reset token
    const user = await getUserByResetToken(token);

    if (!user) {
      return NextResponse.json(
        { error: "Invalid or expired reset token", code: 111 },
        { status: 400 }
      );
    }

    // Check if token has expired
    if (user.resetPasswordExpires < new Date()) {
      return NextResponse.json(
        { error: "Reset token has expired", code: 121 },
        { status: 400 }
      );
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user's password and clear reset token fields
    await updateUser(user._id, {
      password: hashedPassword,
      reset_password_token: null,
      reset_password_expires: null,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Password has been reset successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error", code: 131 },
      { status: 500 }
    );
  }
}