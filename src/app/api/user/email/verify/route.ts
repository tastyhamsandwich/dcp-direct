import { NextRequest, NextResponse } from "next/server";
import { EmailVerification } from "@schema/email";
import { UserModel as User } from "@schema/user";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const searchParams = req.nextUrl.searchParams;
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const verification = await EmailVerification.findOne({
      token,
      verified: false,
      expiresAt: { $gt: new Date() },
    });

    if (!verification) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 }
      );
    }

    await User.findByIdAndUpdate(
      verification.user_id,
      { email: verification.new_email },
      { session }
    );

    await EmailVerification.findByIdAndUpdate(
      verification._id,
      { verified: true },
      { session }
    );

    await session.commitTransaction();

    return NextResponse.json(
      { message: "Email successfully updated" },
      { status: 200 }
    );
  } catch (error) {
    await session.abortTransaction();
    console.error("Error verifying email:", error);
    return NextResponse.json(
      { error: "Failed to verify email" },
      { status: 500 }
    );
  } finally {
    session.endSession();
  }
}
