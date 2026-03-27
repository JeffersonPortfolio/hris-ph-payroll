import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get employee stats
    const [totalEmployees, activeEmployees, probationaryEmployees, regularEmployees] =
      await Promise.all([
        prisma.employee.count({ where: { isActive: true } }),
        prisma.employee.count({
          where: { isActive: true, employmentStatus: { not: "RESIGNED" } },
        }),
        prisma.employee.count({
          where: { isActive: true, employmentStatus: "PROBATIONARY" },
        }),
        prisma.employee.count({
          where: { isActive: true, employmentStatus: "REGULAR" },
        }),
      ]);

    // Get today's attendance stats
    const todayAttendance = await prisma.attendance.findMany({
      where: { date: today },
    });

    const todayPresent = todayAttendance.filter(
      (a) => a.status === "PRESENT" || a.status === "LATE"
    ).length;
    const todayLate = todayAttendance.filter((a) => a.status === "LATE").length;
    const todayAbsent = todayAttendance.filter((a) => a.status === "ABSENT").length;

    // Get pending leaves
    const pendingLeaves = await prisma.leave.count({
      where: { status: "PENDING" },
    });

    // Get department distribution
    const departments = await prisma.department.findMany({
      where: { isActive: true },
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

    const leavesByType = await prisma.leave.groupBy({
      by: ["leaveType"],
      where: {
        createdAt: { gte: thirtyDaysAgo },
        status: "APPROVED",
      },
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

      const dayAttendance = await prisma.attendance.findMany({
        where: { date },
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
    const recentLeaves = await prisma.leave.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        employee: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    const recentAttendance = await prisma.attendance.findMany({
      take: 5,
      orderBy: { clockIn: "desc" },
      where: { clockIn: { not: null } },
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