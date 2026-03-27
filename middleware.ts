import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Admin only routes
    const adminRoutes = ["/settings", "/users"];
    if (adminRoutes.some((route) => path.startsWith(route))) {
      if (token?.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    // Admin and HR routes
    const hrRoutes = ["/employees/new", "/departments", "/roles"];
    if (hrRoutes.some((route) => path.startsWith(route))) {
      if (token?.role !== "ADMIN" && token?.role !== "HR") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/employees/:path*",
    "/attendance/:path*",
    "/leaves/:path*",
    "/departments/:path*",
    "/roles/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/users/:path*",
    "/profile/:path*",
    "/notifications/:path*",
  ],
};