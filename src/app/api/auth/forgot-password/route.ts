import { NextResponse, NextRequest } from "next/server";
import { getUserByEmail, updateUser } from '@lib/db/database';
import { generateResetToken } from '@lib/utils';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
    try {
    const { email } = await req.json() as { email: string };

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Find the user
    const userAvailable = await getUserByEmail(email);

    if (!userAvailable?.success || !userAvailable.user) {
      return NextResponse.json({
        error: "User not found" }, { status: 400 });
    }

    const user = userAvailable.user;
    const token = generateResetToken();
    const tokenExpires = new Date(Date.now() + 3600000); // 1 hour from now

    const beginResetForUser = await updateUser(user.username, {
      reset_password_token: token,
      reset_password_expires: tokenExpires
    }, 'username');

    if (!beginResetForUser.success) {
      return NextResponse.json({
        error: "Could not update user with reset token" }, { status: 400 });  
    }

    console.log(`---UPDATED USER RESULTS---`);
    console.log(beginResetForUser.user);
    console.log(beginResetForUser.data);

    const resetURL = `${process.env.URL_PROTO}${process.env.URL_HOST}:${process.env.URL_PORT}/reset-password?token=${token}`;
    const html = `
        <p>Hi, ${user.username},</p>
        <p>Here's your password recovery link. It will expire in 1 hour.</p>
        <a href="${resetURL}">Reset password here</a>
        <p>If you didn't request this, please ignore this email.</p>
        <p>Best regards, DCP</p>
  `;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });

    await transporter.sendMail({
        from: '"Dealers Choice Poker" <danvisibleman+dcp@gmail.com>', // sender address
        to: user.email,
        subject: `Reset your Dealer's Choice Poker Account Password`, // Subject line
        html: html, // html body
      });

    return NextResponse.json({
      success: true,
      message: "Password recovery email has been sent succesfully",
      }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({
      error: `Internal server error: ${error.message ? error.message : error}` }, { status: 500 });
  }
}

