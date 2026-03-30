import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { getCompanyContext } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const ctx = await getCompanyContext();
    if (!ctx) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());

    if (!employeeId) {
      return NextResponse.json({ message: "Employee ID required" }, { status: 400 });
    }

    // Verify the employee belongs to the same company
    if (ctx.companyId) {
      const employee = await prisma.employee.findFirst({
        where: { id: employeeId, companyId: ctx.companyId },
      });
      if (!employee) {
        return NextResponse.json({ message: "Employee not found" }, { status: 404 });
      }
    }

    const balances = await prisma.leaveBalance.findMany({
      where: {
        employeeId,
        year,
      },
    });

    return NextResponse.json({ balances });
  } catch (error) {
    console.error("Leave balance error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
