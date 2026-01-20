import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Admin routes - require ADMIN role
    if (path.startsWith("/admin")) {
      if (token?.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/community", req.url));
      }
    }

    // Mod routes - require MODERATOR or ADMIN role
    if (path.startsWith("/mod")) {
      if (token?.role !== "MODERATOR" && token?.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/community", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;

        // Public routes - allow access
        if (
          path.startsWith("/community") ||
          path.startsWith("/u/") ||
          path.startsWith("/auth") ||
          path.startsWith("/api/auth")
        ) {
          return true;
        }

        // Protected routes - require authentication
        if (path.startsWith("/admin") || path.startsWith("/mod") || path.startsWith("/settings")) {
          return !!token;
        }

        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    "/admin/:path*",
    "/mod/:path*",
    "/settings/:path*",
  ],
};

