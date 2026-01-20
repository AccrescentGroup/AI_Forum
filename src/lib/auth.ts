import { PrismaAdapter } from "@auth/prisma-adapter";
import { type NextAuthOptions, getServerSession } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { db } from "./db";
import type { UserRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      username?: string | null;
      role: UserRole;
      reputation: number;
    };
  }

  interface User {
    id: string;
    username?: string | null;
    role: UserRole;
    reputation: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username?: string | null;
    role: UserRole;
    reputation: number;
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as Adapter,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            username: true,
            role: true,
            reputation: true,
            isBanned: true,
            accounts: {
              where: { provider: "credentials" },
              select: { id: true },
            },
          },
        });

        if (!user) {
          throw new Error("No user found with this email");
        }

        if (user.isBanned) {
          throw new Error("This account has been suspended");
        }

        // Check if this is an OTP-based sign in
        if (credentials.password.startsWith("OTP:")) {
          const otpCode = credentials.password.replace("OTP:", "");
          
          // Verify the OTP was already validated by the API
          const validCode = await db.verificationCode.findFirst({
            where: {
              email: credentials.email,
              code: otpCode,
              type: "SIGN_IN",
              used: true, // Should be marked as used by the verify endpoint
              expires: { gt: new Date(Date.now() - 5 * 60 * 1000) }, // Within last 5 mins
            },
          });

          if (validCode) {
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              image: user.image,
              username: user.username,
              role: user.role,
              reputation: user.reputation,
            };
          }
          
          throw new Error("Invalid or expired verification code");
        }

        // Standard password authentication
        const credentialAccount = await db.account.findFirst({
          where: { userId: user.id, provider: "credentials" },
        });

        if (!credentialAccount?.access_token) {
          throw new Error("Please sign in with Google or set up a password");
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          credentialAccount.access_token
        );

        if (!isValid) {
          throw new Error("Invalid password");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          username: user.username,
          role: user.role,
          reputation: user.reputation,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const existingUser = await db.user.findUnique({
          where: { id: user.id },
          select: { isBanned: true },
        });

        if (existingUser?.isBanned) {
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.role = user.role;
        token.reputation = user.reputation;
      }

      if (trigger === "update" && session) {
        token.username = session.username;
        token.role = session.role;
        token.reputation = session.reputation;
      }

      // Refresh user data periodically
      if (token.id) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id },
          select: { username: true, role: true, reputation: true, isBanned: true },
        });

        if (dbUser && !dbUser.isBanned) {
          token.username = dbUser.username;
          token.role = dbUser.role;
          token.reputation = dbUser.reputation;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.username = token.username;
        session.user.role = token.role;
        session.user.reputation = token.reputation;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // Generate username from email
      if (user.email && !user.name) {
        const username = user.email.split("@")[0];
        await db.user.update({
          where: { id: user.id },
          data: { username },
        });
      }
    },
  },
};

export async function getSession() {
  return getServerSession(authOptions);
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session?.user?.id) return null;

  return db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      username: true,
      bio: true,
      website: true,
      github: true,
      twitter: true,
      role: true,
      reputation: true,
      createdAt: true,
    },
  });
}

export function canModerate(role: UserRole): boolean {
  return role === "MODERATOR" || role === "ADMIN";
}

export function canAdmin(role: UserRole): boolean {
  return role === "ADMIN";
}

export function isTrusted(role: UserRole): boolean {
  return role === "TRUSTED" || role === "MODERATOR" || role === "ADMIN";
}

