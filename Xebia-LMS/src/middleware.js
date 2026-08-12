import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAdminRoute = req.nextUrl.pathname.startsWith("/admin");

    // Block non-admin and non-teacher users from accessing the admin space
    if (isAdminRoute && token?.role !== "admin" && token?.role !== "teacher") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  },
  {
    callbacks: {
      // Access granted only if JWT token exists
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/signin",
    },
  }
);

// Matches pages needing active login sessions
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/categories/:path*",
    "/courses/:path*",
    "/assessments/:path*",
    "/assessment/:path*",
    "/results/:path*",
    "/admin/:path*",
    "/learn/:path*",
  ],
};
