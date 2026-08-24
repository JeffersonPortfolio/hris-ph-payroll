import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { sendNotificationEmail, getPasswordResetEmailTemplate } from "@/lib/email";
import { getCompanyContext } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// Generate a reasonably strong temporary password.
function generateTempPassword(): string {
  return Math.random().toString(36).slice(-8) + "A1!";
}

// PATCH: Admin/HR directly SETS a temporary password for the user (rather than
// emailing a self-service reset link). The chosen/generated password is
// returned to the admin so they can hand it to the employee. Tenant-scoped:
// company admins can only touch users in their own company; SUPER_ADMIN can
// touch anyone.
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== "ADMIN" && userRole !== "HR" && userRole !== "SUPER_ADMIN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const ctx = await getCompanyContext();
    if (!ctx) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Verify the target user belongs to the same company (SUPER_ADMIN bypasses).
    const userWhere: any = { id: params.id };
    if (ctx.companyId && userRole !== "SUPER_ADMIN") {
      userWhere.companyId = ctx.companyId;
    }

    const user = await prisma.user.findFirst({ where: userWhere });
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    let newPassword = (body?.password ? String(body.password) : "").trim();

    if (newPassword) {
      if (newPassword.length < 6) {
        return NextResponse.json(
          { message: "Temporary password must be at least 6 characters." },
          { status: 400 }
        );
      }
    } else {
      // No password provided -> auto-generate one.
      newPassword = generateTempPassword();
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        // Clear any pending self-service reset token so it can't be reused.
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    console.warn(
      `[USER] Temporary password set for ${user.email} (id=${user.id}) by ${(session.user as any)?.email}`
    );

    return NextResponse.json({
      message: "Temporary password set successfully.",
      tempPassword: newPassword,
      email: user.email,
    });
  } catch (error) {
    console.error("Set temporary password error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const ctx = await getCompanyContext();
    if (!ctx) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Verify user belongs to same company
    const userWhere: any = { id: params.id };
    if (ctx.companyId) userWhere.companyId = ctx.companyId;

    const user = await prisma.user.findFirst({ where: userWhere });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;

    await sendNotificationEmail({
      to: user.email,
      subject: "Password Reset - HRIS",
      body: getPasswordResetEmailTemplate(user.name, resetLink),
    });

    return NextResponse.json({ message: "Password reset email sent" });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
