import nodemailer from "nodemailer";

const appUrl = 'http://localhost:3003';

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

export async function sendVerificationEmail(
  email: string,
  token: string
): Promise<void> {
  const verificationLink = `${appUrl}/verify-email?token=${token}`;

  await transporter.sendMail({
    from: process.env.MAILER_FROM,
    to: email,
    subject: "Verify Your New Email Address",
    html: `
      <!DOCTYPE html>
      <html>
        <body>
          <h1>Email Verification</h1>
          <p>Click the link below to verify your new email address:</p>
          <a href="${verificationLink}">${verificationLink}</a>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't request this change, please ignore this email.</p>
        </body>
      </html>
    `,
  });
}
