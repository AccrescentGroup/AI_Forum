"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { signUpSchema, type SignUpInput } from "@/lib/validations";
import { Mail, Lock, User, Chrome, AlertCircle, CheckCircle, ArrowLeft } from "lucide-react";

type Step = "form" | "verify" | "success";

export default function SignUpPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [formData, setFormData] = useState<SignUpInput | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
  });

  // Step 1: Submit form and send OTP
  const onSubmit = async (data: SignUpInput) => {
    setIsLoading(true);
    setError(null);

    try {
      // Send OTP to email
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email, type: "signup" }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error ?? "Failed to send verification code");
        return;
      }

      // Store form data and move to verification step
      setFormData(data);
      setEmail(data.email);
      setStep("verify");
      startResendCooldown();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP and create account
  const handleVerifyOTP = async () => {
    if (otpCode.length !== 6 || !formData) return;

    setIsLoading(true);
    setError(null);

    try {
      // Verify the OTP
      const verifyResponse = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otpCode, type: "signup" }),
      });

      const verifyResult = await verifyResponse.json();

      if (!verifyResponse.ok) {
        setError(verifyResult.error ?? "Invalid verification code");
        return;
      }

      // OTP verified, now create the account
      const signupResponse = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, emailVerified: true }),
      });

      const signupResult = await signupResponse.json();

      if (!signupResponse.ok) {
        setError(signupResult.error ?? "Failed to create account");
        return;
      }

      setStep("success");

      // Auto sign in after successful registration
      setTimeout(async () => {
        await signIn("credentials", {
          email: formData.email,
          password: formData.password,
          callbackUrl: "/community",
        });
      }, 1500);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, type: "signup" }),
      });

      if (!response.ok) {
        const result = await response.json();
        setError(result.error ?? "Failed to resend code");
        return;
      }

      startResendCooldown();
    } catch {
      setError("Failed to resend code");
    } finally {
      setIsLoading(false);
    }
  };

  const startResendCooldown = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    await signIn("google", { callbackUrl: "/community" });
  };

  // Success state
  if (step === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 gradient-mesh">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Account Created!</h2>
            <p className="text-muted-foreground">
              Signing you in...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // OTP Verification step
  if (step === "verify") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 gradient-mesh">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Link href="/community" className="inline-flex items-center justify-center gap-2 mb-4">
              <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground text-lg font-bold">C</span>
              </div>
            </Link>
            <CardTitle className="text-2xl">Verify your email</CardTitle>
            <CardDescription>
              We sent a 6-digit code to<br />
              <span className="font-medium text-foreground">{email}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="otp">Verification Code</Label>
              <Input
                id="otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                className="text-center text-2xl tracking-[0.5em] font-mono"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                autoFocus
              />
            </div>

            <Button
              className="w-full"
              onClick={handleVerifyOTP}
              disabled={isLoading || otpCode.length !== 6}
            >
              {isLoading ? "Verifying..." : "Verify & Create Account"}
            </Button>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">Didn&apos;t receive the code? </span>
              {resendCooldown > 0 ? (
                <span className="text-muted-foreground">Resend in {resendCooldown}s</span>
              ) : (
                <button
                  onClick={handleResendOTP}
                  disabled={isLoading}
                  className="text-primary hover:underline"
                >
                  Resend code
                </button>
              )}
            </div>

            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                setStep("form");
                setOtpCode("");
                setError(null);
              }}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to sign up
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Initial form
  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-mesh">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link href="/community" className="inline-flex items-center justify-center gap-2 mb-4">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-lg font-bold">C</span>
            </div>
          </Link>
          <CardTitle className="text-2xl">Create an account</CardTitle>
          <CardDescription>
            Join the community and start participating
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
          >
            <Chrome className="h-4 w-4 mr-2" />
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Or continue with email
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  className="pl-10"
                  {...register("name")}
                />
              </div>
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className="pl-10"
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10"
                  {...register("password")}
                />
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                At least 8 characters, one uppercase, one number
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Sending code..." : "Continue"}
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground">
            By creating an account, you agree to our{" "}
            <Link href="/terms" className="text-primary hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
          </p>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/auth/signin" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
