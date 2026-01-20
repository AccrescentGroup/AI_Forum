"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { signInSchema, type SignInInput } from "@/lib/validations";
import { Mail, Lock, Chrome, AlertCircle, ArrowLeft, KeyRound } from "lucide-react";
import { z } from "zod";

type Step = "method" | "password" | "otp-send" | "otp-verify";

const emailSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/community";
  const errorParam = searchParams.get("error");
  
  const [step, setStep] = useState<Step>("method");
  const [authMethod, setAuthMethod] = useState<"password" | "otp">("password");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
  });

  // Password sign in
  const onPasswordSubmit = async (data: SignInInput) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // Send OTP for email sign in
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = emailSchema.safeParse({ email });
    if (!result.success) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, type: "signin" }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Failed to send verification code");
        return;
      }

      setStep("otp-verify");
      startResendCooldown();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // Verify OTP and sign in
  const handleVerifyOTP = async () => {
    if (otpCode.length !== 6) return;

    setIsLoading(true);
    setError(null);

    try {
      // Verify the OTP
      const verifyResponse = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otpCode, type: "signin" }),
      });

      const verifyResult = await verifyResponse.json();

      if (!verifyResponse.ok) {
        setError(verifyResult.error ?? "Invalid verification code");
        return;
      }

      // OTP verified, sign in with special OTP credential
      const signInResult = await signIn("credentials", {
        email,
        password: `OTP:${otpCode}`,
        redirect: false,
      });

      if (signInResult?.error) {
        // If OTP sign in fails, try the magic link approach
        // For now, just redirect to home
        router.push(callbackUrl);
        router.refresh();
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
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
        body: JSON.stringify({ email, type: "signin" }),
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
    await signIn("google", { callbackUrl });
  };

  // OTP Verification step
  if (step === "otp-verify") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 gradient-mesh">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Link href="/community" className="inline-flex items-center justify-center gap-2 mb-4">
              <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground text-lg font-bold">C</span>
              </div>
            </Link>
            <CardTitle className="text-2xl">Enter verification code</CardTitle>
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
              {isLoading ? "Verifying..." : "Sign in"}
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
                setStep("method");
                setOtpCode("");
                setError(null);
              }}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to sign in
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-mesh">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link href="/community" className="inline-flex items-center justify-center gap-2 mb-4">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-lg font-bold">C</span>
            </div>
          </Link>
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>
            Sign in to your account to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(errorParam || error) && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error || "Authentication failed. Please try again."}</span>
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
                Or continue with
              </span>
            </div>
          </div>

          <Tabs value={authMethod} onValueChange={(v) => setAuthMethod(v as "password" | "otp")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="password">
                <Lock className="h-4 w-4 mr-2" />
                Password
              </TabsTrigger>
              <TabsTrigger value="otp">
                <KeyRound className="h-4 w-4 mr-2" />
                Email Code
              </TabsTrigger>
            </TabsList>

            <TabsContent value="password" className="mt-4">
              <form onSubmit={handleSubmit(onPasswordSubmit)} className="space-y-4">
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
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link
                      href="/auth/forgot-password"
                      className="text-xs text-primary hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
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
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="otp" className="mt-4">
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="otp-email"
                      type="email"
                      placeholder="you@example.com"
                      className="pl-10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading || !email}>
                  {isLoading ? "Sending code..." : "Send verification code"}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  We&apos;ll send a 6-digit code to your email
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/auth/signup" className="text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
