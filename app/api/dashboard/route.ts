import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { getCompanyContext } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const ctx = await getCompanyContext();
    if (!ctx) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Build company filter for employee queries
    const companyFilter: any = {};
    if (ctx.companyId) {
      companyFilter.companyId = ctx.companyId;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get employee stats (filtered by company)
    const [totalEmployees, activeEmployees, probationaryEmployees, regularEmployees] =
      await Promise.all([
        prisma.employee.count({ where: { isActive: true, ...companyFilter } }),
        prisma.employee.count({
          where: { isActive: true, employmentStatus: { not: "RESIGNED" }, ...companyFilter },
        }),
        prisma.employee.count({
          where: { isActive: true, employmentStatus: "PROBATIONARY", ...companyFilter },
        }),
        prisma.employee.count({
          where: { isActive: true, employmentStatus: "REGULAR", ...companyFilter },
        }),
      ]);

    // Get employee IDs for this company (for attendance/leave filtering)
    const companyEmployeeIds = ctx.companyId
      ? (await prisma.employee.findMany({
          where: companyFilter,
          select: { id: true },
        })).map((e) => e.id)
      : null;

    // Build attendance filter
    const attendanceFilter: any = { date: today };
    if (companyEmployeeIds) {
      attendanceFilter.employeeId = { in: companyEmployeeIds };
    }

    // Get today's attendance stats
    const todayAttendance = await prisma.attendance.findMany({
      where: attendanceFilter,
    });

    const todayPresent = todayAttendance.filter(
      (a) => a.status === "PRESENT" || a.status === "LATE"
    ).length;
    const todayLate = todayAttendance.filter((a) => a.status === "LATE").length;
    const todayAbsent = todayAttendance.filter((a) => a.status === "ABSENT").length;

    // Get pending leaves
    const leaveFilter: any = { status: "PENDING" };
    if (companyEmployeeIds) {
      leaveFilter.employeeId = { in: companyEmployeeIds };
    }
    const pendingLeaves = await prisma.leave.count({
      where: leaveFilter,
    });

    // Get department distribution
    const deptFilter: any = { isActive: true };
    if (ctx.companyId) {
      deptFilter.companyId = ctx.companyId;
    }
    const departments = await prisma.department.findMany({
      where: deptFilter,
      include: {
        _count: {
          select: { employees: true },
        },
      },
    });

    const departmentData = departments.map((d) => ({
      name: d.name,
      count: d._count.employees,
    }));

    // Get leave type distribution (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const leaveTypeFilter: any = {
      createdAt: { gte: thirtyDaysAgo },
      status: "APPROVED",
    };
    if (companyEmployeeIds) {
      leaveTypeFilter.employeeId = { in: companyEmployeeIds };
    }

    const leavesByType = await prisma.leave.groupBy({
      by: ["leaveType"],
      where: leaveTypeFilter,
      _count: true,
    });

    const leaveTypeData = leavesByType.map((l) => ({
      type: l.leaveType,
      count: l._count,
    }));

    // Get attendance trends (last 14 days)
    const attendanceTrends = [];
    for (let i = 13; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const dayFilter: any = { date };
      if (companyEmployeeIds) {
        dayFilter.employeeId = { in: companyEmployeeIds };
      }

      const dayAttendance = await prisma.attendance.findMany({
        where: dayFilter,
      });

      attendanceTrends.push({
        date: date.toLocaleDateString("en-PH", {
          month: "short",
          day: "numeric",
        }),
        present: dayAttendance.filter(
          (a) => a.status === "PRESENT" || a.status === "LATE"
        ).length,
        late: dayAttendance.filter((a) => a.status === "LATE").length,
        absent: dayAttendance.filter((a) => a.status === "ABSENT").length,
      });
    }

    // Get recent activities
    const recentLeaveFilter: any = {};
    if (companyEmployeeIds) {
      recentLeaveFilter.employeeId = { in: companyEmployeeIds };
    }

    const recentLeaves = await prisma.leave.findMany({
      take: 5,
      where: recentLeaveFilter,
      orderBy: { createdAt: "desc" },
      include: {
        employee: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    const recentAttFilter: any = { clockIn: { not: null } };
    if (companyEmployeeIds) {
      recentAttFilter.employeeId = { in: companyEmployeeIds };
    }

    const recentAttendance = await prisma.attendance.findMany({
      take: 5,
      orderBy: { clockIn: "desc" },
      where: recentAttFilter,
      include: {
        employee: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    const activities = [
      ...recentLeaves.map((l) => ({
        id: l.id,
        type: "leave" as const,
        title: `${l.employee?.firstName ?? ""} ${l.employee?.lastName ?? ""}`,
        description: `Applied for ${l.leaveType.toLowerCase().replace("_", " ")} leave`,
        timestamp: l.createdAt.toISOString(),
      })),
      ...recentAttendance.map((a) => ({
        id: a.id,
        type: "attendance" as const,
        title: `${a.employee?.firstName ?? ""} ${a.employee?.lastName ?? ""}`,
        description: `Clocked in`,
        timestamp: a.clockIn?.toISOString() ?? a.createdAt.toISOString(),
      })),
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);

    return NextResponse.json({
      stats: {
        totalEmployees,
        activeEmployees,
        probationaryEmployees,
        regularEmployees,
        todayPresent,
        todayLate,
        todayAbsent,
        pendingLeaves,
      },
      departmentData,
      leaveTypeData,
      attendanceTrends,
      activities,
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
