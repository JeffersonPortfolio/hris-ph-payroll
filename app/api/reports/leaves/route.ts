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

    const userRole = (session.user as any)?.role;
    if (userRole !== "ADMIN" && userRole !== "HR" && userRole !== "SUPER_ADMIN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const ctx = await getCompanyContext();
    if (!ctx) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const departmentId = searchParams.get("departmentId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const leaveType = searchParams.get("leaveType");
    const filingType = searchParams.get("filingType");
    const status = searchParams.get("status");

    const where: any = {};

    // Company filter through employee relation
    if (ctx.companyId) {
      where.employee = { companyId: ctx.companyId };
    }

    if (employeeId && employeeId !== "all") {
      where.employeeId = employeeId;
    }

    if (departmentId && departmentId !== "all") {
      where.employee = {
        ...where.employee,
        departmentId: departmentId,
      };
    }

    if (startDate) {
      where.startDate = { ...where.startDate, gte: new Date(startDate) };
    }

    if (endDate) {
      where.endDate = { ...where.endDate, lte: new Date(endDate) };
    }

    if (leaveType && leaveType !== "all") where.leaveType = leaveType;
    if (filingType && filingType !== "all") where.filingType = filingType;
    if (status && status !== "all") where.status = status;

    const leaves = await prisma.leave.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            department: { select: { id: true, name: true } },
          },
        },
        approver: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: [
        { employee: { lastName: "asc" } },
        { startDate: "desc" },
      ],
    });

    const summary = {
      totalLeaves: leaves.length,
      totalDays: leaves.reduce((sum, l) => sum + (l.totalDays || 0), 0),
      byStatus: {
        PENDING: leaves.filter((l) => l.status === "PENDING").length,
        APPROVED: leaves.filter((l) => l.status === "APPROVED").length,
        REJECTED: leaves.filter((l) => l.status === "REJECTED").length,
      },
      byFilingType: {
        ADVANCE: leaves.filter((l) => l.filingType === "ADVANCE").length,
        URGENT: leaves.filter((l) => l.filingType === "URGENT").length,
      },
      byLeaveType: {
        ANNUAL: leaves.filter((l) => l.leaveType === "ANNUAL").length,
        SICK: leaves.filter((l) => l.leaveType === "SICK").length,
        EMERGENCY: leaves.filter((l) => l.leaveType === "EMERGENCY").length,
        WFH: leaves.filter((l) => l.leaveType === "WFH").length,
        COMPASSIONATE: leaves.filter((l) => l.leaveType === "COMPASSIONATE").length,
      },
    };

    const employeeLeaves: Record<string, any> = {};
    leaves.forEach((leave) => {
      const empId = leave.employee?.id || "unknown";
      if (!employeeLeaves[empId]) {
        employeeLeaves[empId] = {
          employee: leave.employee,
          leaves: [],
          totalDays: 0,
          byType: { ANNUAL: 0, SICK: 0, EMERGENCY: 0, WFH: 0, COMPASSIONATE: 0 },
          byFilingType: { ADVANCE: 0, URGENT: 0 },
          byStatus: { PENDING: 0, APPROVED: 0, REJECTED: 0 },
        };
      }
      employeeLeaves[empId].leaves.push(leave);
      employeeLeaves[empId].totalDays += leave.totalDays || 0;
      employeeLeaves[empId].byType[leave.leaveType] = (employeeLeaves[empId].byType[leave.leaveType] || 0) + (leave.totalDays || 0);
      employeeLeaves[empId].byFilingType[leave.filingType || "ADVANCE"]++;
      employeeLeaves[empId].byStatus[leave.status]++;
    });

    return NextResponse.json({
      leaves,
      summary,
      employeeLeaves: Object.values(employeeLeaves),
    });
  } catch (error) {
    console.error("Leave report error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
