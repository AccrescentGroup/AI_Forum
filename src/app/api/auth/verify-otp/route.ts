import { NextResponse } from "next/server";
import { verifyCode } from "@/lib/email";
import { z } from "zod";

const verifyOTPSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  type: z.enum(["signup", "signin"]),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, code, type } = verifyOTPSchema.parse(body);

    const codeType = type === "signup" ? "EMAIL_VERIFICATION" : "SIGN_IN";
    const result = await verifyCode(email, code, codeType);

    if (!result.valid) {
      return NextResponse.json(
        { error: "Invalid or expired verification code" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      verified: true,
      userId: result.userId,
    });
  } catch (error) {
    console.error("Verify OTP error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid verification code format" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to verify code" },
      { status: 500 }
    );
  }
}

