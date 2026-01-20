import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { signUpSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = signUpSchema.parse(body);
    const emailVerified = body.emailVerified === true;

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: validated.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validated.password, 12);

    // Generate username from email
    const baseUsername = validated.email.split("@")[0].replace(/[^a-zA-Z0-9_-]/g, "");
    let username = baseUsername;
    let counter = 1;
    
    // Ensure username is unique
    while (await db.user.findUnique({ where: { username } })) {
      username = `${baseUsername}${counter}`;
      counter++;
    }

    // Create user with emailVerified if OTP was verified
    const user = await db.user.create({
      data: {
        name: validated.name,
        email: validated.email,
        username,
        role: "USER",
        emailVerified: emailVerified ? new Date() : null,
      },
    });

    // Create credentials account with hashed password
    await db.account.create({
      data: {
        userId: user.id,
        type: "credentials",
        provider: "credentials",
        providerAccountId: user.id,
        access_token: hashedPassword, // Store hashed password here
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);

    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid input data" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}

