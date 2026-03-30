import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Super admin routes - only SUPER_ADMIN can access
    const superAdminRoutes = ["/super-admin"];
    if (superAdminRoutes.some((route) => path.startsWith(route))) {
      if (token?.role !== "SUPER_ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    // Admin only routes (also accessible by SUPER_ADMIN)
    const adminRoutes = ["/settings", "/users"];
    if (adminRoutes.some((route) => path.startsWith(route))) {
      if (token?.role !== "ADMIN" && token?.role !== "SUPER_ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    // Admin and HR routes (also accessible by SUPER_ADMIN)
    const hrRoutes = ["/employees/new", "/departments", "/roles"];
    if (hrRoutes.some((route) => path.startsWith(route))) {
      if (token?.role !== "ADMIN" && token?.role !== "HR" && token?.role !== "SUPER_ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    // Finance routes - accessible by ADMIN, HR, FINANCE, SUPER_ADMIN
    const financeRoutes = ["/finance"];
    if (financeRoutes.some((route) => path.startsWith(route))) {
      if (!["ADMIN", "HR", "FINANCE", "SUPER_ADMIN"].includes(token?.role as string)) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    // Payroll routes - accessible by ADMIN, HR, SUPER_ADMIN
    const payrollRoutes = ["/payroll", "/allowances", "/adjustments", "/loans"];
    if (payrollRoutes.some((route) => path.startsWith(route))) {
      if (!["ADMIN", "HR", "SUPER_ADMIN"].includes(token?.role as string)) {
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
    "/finance/:path*",
    "/payroll/:path*",
    "/allowances/:path*",
    "/adjustments/:path*",
    "/loans/:path*",
    "/payslip/:path*",
    "/work-schedules/:path*",
    "/holidays/:path*",
    "/office-locations/:path*",
    "/super-admin/:path*",
  ],
};
