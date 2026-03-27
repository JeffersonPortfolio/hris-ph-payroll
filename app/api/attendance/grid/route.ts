import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Optimized endpoint for attendance grid view
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const departmentId = searchParams.get("departmentId");

    if (!startDate || !endDate) {
      return NextResponse.json(
        { message: "startDate and endDate are required" },
        { status: 400 }
      );
    }

    const userRole = (session.user as any)?.role;
    const sessionEmployeeId = (session.user as any)?.employeeId;

    // Build employee filter
    const employeeWhere: any = { isActive: true };
    if (userRole === "EMPLOYEE") {
      employeeWhere.id = sessionEmployeeId;
    } else if (departmentId && departmentId !== "all") {
      employeeWhere.departmentId = departmentId;
    }

    // Fetch employees and attendance in parallel
    const [employees, attendance, holidays] = await Promise.all([
      prisma.employee.findMany({
        where: employeeWhere,
        select: {
          id: true,
          employeeId: true,
          firstName: true,
          lastName: true,
          departmentId: true,
          department: { select: { name: true } },
        },
        orderBy: { lastName: "asc" },
        take: 500,
      }),
      prisma.attendance.findMany({
        where: {
          date: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
          ...(userRole === "EMPLOYEE" ? { employeeId: sessionEmployeeId } : {}),
          ...(departmentId && departmentId !== "all"
            ? {
                employee: { departmentId },
              }
            : {}),
        },
        select: {
          id: true,
          employeeId: true,
          date: true,
          clockIn: true,
          clockOut: true,
          totalHours: true,
          status: true,
          lateMinutes: true,
          undertimeMinutes: true,
          overtimeMinutes: true,
          nightDiffMinutes: true,
          nightDiffOTMinutes: true,
          isHoliday: true,
          holidayType: true,
          holidayMultiplier: true,
          notes: true,
          isManualAdjust: true,
        },
        orderBy: { date: "asc" },
      }),
      prisma.holiday.findMany({
        where: {
          date: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
        select: {
          id: true,
          name: true,
          date: true,
          type: true,
        },
      }),
    ]);

    // Pre-group attendance by employee ID for faster client-side rendering
    const attendanceByEmployee: Record<string, any[]> = {};
    for (const att of attendance) {
      if (!attendanceByEmployee[att.employeeId]) {
        attendanceByEmployee[att.employeeId] = [];
      }
      attendanceByEmployee[att.employeeId].push(att);
    }

    return NextResponse.json({
      employees,
      attendanceByEmployee,
      holidays,
    });
  } catch (error) {
    console.error("Get attendance grid error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
