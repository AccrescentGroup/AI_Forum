import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createVerificationCode, sendVerificationEmail } from "@/lib/email";
import { z } from "zod";

const sendOTPSchema = z.object({
  email: z.string().email(),
  type: z.enum(["signup", "signin"]),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, type } = sendOTPSchema.parse(body);

    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { email },
      select: { id: true, isBanned: true },
    });

    if (type === "signup") {
      // For signup, user should NOT exist
      if (existingUser) {
        return NextResponse.json(
          { error: "An account with this email already exists" },
          { status: 400 }
        );
      }
    } else {
      // For signin, user MUST exist
      if (!existingUser) {
        // Don't reveal if email exists or not for security
        // Still return success but don't send email
        return NextResponse.json({ success: true });
      }

      if (existingUser.isBanned) {
        return NextResponse.json(
          { error: "This account has been suspended" },
          { status: 403 }
        );
      }
    }

    // Create and send verification code
    const codeType = type === "signup" ? "EMAIL_VERIFICATION" : "SIGN_IN";
    const code = await createVerificationCode(
      email,
      codeType,
      existingUser?.id
    );

    const emailSent = await sendVerificationEmail(email, code, type);

    if (!emailSent) {
      return NextResponse.json(
        { error: "Failed to send verification email. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Send OTP error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to send verification code" },
      { status: 500 }
    );
  }
}

