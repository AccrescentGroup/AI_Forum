import nodemailer from "nodemailer";
import { db } from "./db";
import type { VerificationCodeType } from "@prisma/client";

// Create transporter - uses Ethereal for development if no SMTP configured
let transporter: nodemailer.Transporter;

async function getTransporter() {
  if (transporter) return transporter;

  // Check if SMTP is configured
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT ?? "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  } else {
    // Use Ethereal for development (emails are captured but not sent)
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log("📧 Using Ethereal email for development");
    console.log("   View sent emails at: https://ethereal.email");
    console.log("   Login:", testAccount.user);
  }

  return transporter;
}

// Generate a 6-digit OTP
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Create and store a verification code
export async function createVerificationCode(
  email: string,
  type: VerificationCodeType,
  userId?: string
): Promise<string> {
  const code = generateOTP();
  const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Invalidate any existing codes for this email/type
  await db.verificationCode.updateMany({
    where: { email, type, used: false },
    data: { used: true },
  });

  // Create new code
  await db.verificationCode.create({
    data: {
      code,
      type,
      email,
      userId,
      expires,
    },
  });

  return code;
}

// Verify a code
export async function verifyCode(
  email: string,
  code: string,
  type: VerificationCodeType
): Promise<{ valid: boolean; userId?: string }> {
  const verificationCode = await db.verificationCode.findFirst({
    where: {
      email,
      code,
      type,
      used: false,
      expires: { gt: new Date() },
    },
  });

  if (!verificationCode) {
    return { valid: false };
  }

  // Mark as used
  await db.verificationCode.update({
    where: { id: verificationCode.id },
    data: { used: true },
  });

  return { valid: true, userId: verificationCode.userId ?? undefined };
}

// Send verification email
export async function sendVerificationEmail(
  email: string,
  code: string,
  type: "signup" | "signin"
): Promise<boolean> {
  try {
    const transport = await getTransporter();

    const subject =
      type === "signup"
        ? "Verify your email - Community Forum"
        : "Sign in code - Community Forum";

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; padding: 40px 20px;">
          <div style="max-width: 400px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; margin-bottom: 32px;">
              <div style="width: 48px; height: 48px; background: #6366f1; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 20px;">C</div>
            </div>
            
            <h1 style="font-size: 24px; font-weight: 600; text-align: center; margin: 0 0 8px 0; color: #18181b;">
              ${type === "signup" ? "Verify your email" : "Your sign in code"}
            </h1>
            
            <p style="color: #71717a; text-align: center; margin: 0 0 32px 0;">
              ${type === "signup" ? "Enter this code to complete your registration" : "Enter this code to sign in to your account"}
            </p>
            
            <div style="background: #f4f4f5; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 32px;">
              <span style="font-family: monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #18181b;">${code}</span>
            </div>
            
            <p style="color: #a1a1aa; font-size: 14px; text-align: center; margin: 0;">
              This code expires in 10 minutes.<br>
              If you didn't request this, you can safely ignore this email.
            </p>
          </div>
          
          <p style="color: #a1a1aa; font-size: 12px; text-align: center; margin-top: 24px;">
            © ${new Date().getFullYear()} Community Forum
          </p>
        </body>
      </html>
    `;

    const info = await transport.sendMail({
      from: process.env.EMAIL_FROM ?? '"Community Forum" <noreply@community.dev>',
      to: email,
      subject,
      html,
    });

    // Log preview URL for Ethereal emails (development)
    if (info.messageId && info.envelope) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log("📧 Preview email:", previewUrl);
      }
    }

    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
}

// Clean up expired codes (can be called periodically)
export async function cleanupExpiredCodes(): Promise<void> {
  await db.verificationCode.deleteMany({
    where: {
      OR: [{ expires: { lt: new Date() } }, { used: true }],
      createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Older than 24h
    },
  });
}

