import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

/**
 * Get the current user's company context from session.
 * Returns companyId, role, and whether the user is a super admin.
 * For impersonation, checks session for impersonatedCompanyId.
 */
export async function getCompanyContext() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  const user = session.user as any;
  const isSuperAdmin = user.role === "SUPER_ADMIN";
  
  // If super admin is impersonating a company, use that company's ID
  const companyId = user.impersonatedCompanyId || user.companyId || null;

  return {
    userId: user.id,
    companyId,
    role: user.role as string,
    isSuperAdmin,
    isImpersonating: !!user.impersonatedCompanyId,
    employeeId: user.employeeId || null,
  };
}

/**
 * Get company filter for Prisma queries.
 * Super admins without impersonation see all data (returns {}).
 * Regular users get filtered by their company.
 */
export async function getCompanyFilter() {
  const ctx = await getCompanyContext();
  if (!ctx) return null;

  // Super admin not impersonating: no filter (see all)
  if (ctx.isSuperAdmin && !ctx.companyId) {
    return {};
  }

  // Regular users and impersonating super admins: filter by company
  if (ctx.companyId) {
    return { companyId: ctx.companyId };
  }

  // Users without a company (legacy data) - return empty filter
  return {};
}

/**
 * Build where clause with company filtering.
 * Merges existing where conditions with company filter.
 */
export async function withCompanyFilter(existingWhere: any = {}) {
  const filter = await getCompanyFilter();
  if (!filter) return null; // unauthorized
  
  return { ...existingWhere, ...filter };
}

/**
 * Require company context - returns context or throws.
 * Use this in routes that require a company context.
 */
export async function requireCompanyContext() {
  const ctx = await getCompanyContext();
  if (!ctx) {
    throw new Error("Unauthorized: No session found");
  }
  return ctx;
}
