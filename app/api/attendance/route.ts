import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { calculateWorkHoursDetailed } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "1000");
    const noPagination = searchParams.get("all") === "true";

    const userRole = (session.user as any)?.role;
    const sessionEmployeeId = (session.user as any)?.employeeId;

    const where: any = {};

    // Employees can only see their own attendance
    if (userRole === "EMPLOYEE") {
      where.employeeId = sessionEmployeeId;
    } else if (employeeId) {
      where.employeeId = employeeId;
    }

    if (startDate) {
      where.date = {
        ...where.date,
        gte: new Date(startDate),
      };
    }

    if (endDate) {
      where.date = {
        ...where.date,
        lte: new Date(endDate),
      };
    }

    // For grid view, return all attendance without pagination - optimized for speed
    if (noPagination || (startDate && endDate)) {
      const attendance = await prisma.attendance.findMany({
        where,
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
        orderBy: { date: "desc" },
      });
      return NextResponse.json(attendance);
    }

    const [attendance, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeId: true,
              department: { select: { name: true } },
            },
          },
        },
        orderBy: { date: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.attendance.count({ where }),
    ]);

    return NextResponse.json({
      attendance,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get attendance error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any)?.role;
    if (role !== "ADMIN" && role !== "HR") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { 
      employeeId, 
      date, 
      clockIn, 
      clockOut, 
      status, 
      lateMinutes,
      undertimeMinutes,
      overtimeMinutes,
      nightDiffMinutes,
      nightDiffOTMinutes,
      notes,
      isManualAdjust 
    } = body;

    if (!employeeId || !date) {
      return NextResponse.json(
        { message: "Employee ID and date required" },
        { status: 400 }
      );
    }

    // Check if attendance already exists for this date
    const existingAttendance = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId,
          date: new Date(date),
        },
      },
    });

    if (existingAttendance) {
      return NextResponse.json(
        { message: "Attendance record already exists for this date" },
        { status: 400 }
      );
    }

    // Check if date is a holiday
    const holiday = await prisma.holiday.findFirst({
      where: {
        date: new Date(date),
      },
    });

    let totalHours: number | undefined = undefined;
    let computedLate = 0;
    let computedUT = 0;
    let computedOT = 0;
    let computedStatus = status || "PRESENT";
    if (clockIn && clockOut) {
      const result = calculateWorkHoursDetailed(new Date(clockIn), new Date(clockOut));
      totalHours = result.totalHours;
      computedLate = result.lateMinutes;
      computedUT = result.undertimeMinutes;
      computedOT = result.overtimeMinutes;
      // Auto-determine status from computation
      if (result.lateMinutes > 0) computedStatus = "LATE";
    }

    const attendance = await prisma.attendance.create({
      data: {
        employeeId,
        date: new Date(date),
        clockIn: clockIn ? new Date(clockIn) : null,
        clockOut: clockOut ? new Date(clockOut) : null,
        status: computedStatus,
        totalHours,
        lateMinutes: lateMinutes || computedLate,
        undertimeMinutes: undertimeMinutes || computedUT,
        overtimeMinutes: overtimeMinutes || computedOT,
        nightDiffMinutes: nightDiffMinutes || 0,
        nightDiffOTMinutes: nightDiffOTMinutes || 0,
        isHoliday: !!holiday,
        holidayType: holiday?.type || null,
        holidayMultiplier: holiday?.type === "REGULAR" ? 2.0 : holiday?.type === "SPECIAL" ? 1.3 : 1.0,
        notes,
        isManualAdjust: isManualAdjust || true,
        adjustedById: (session.user as any)?.id,
      },
    });

    return NextResponse.json(attendance);
  } catch (error) {
    console.error("Create attendance error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any)?.role;
    if (role !== "ADMIN" && role !== "HR") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { 
      id, 
      clockIn, 
      clockOut, 
      status, 
      lateMinutes,
      undertimeMinutes,
      overtimeMinutes,
      nightDiffMinutes,
      nightDiffOTMinutes,
      notes 
    } = body;

    if (!id) {
      return NextResponse.json(
        { message: "Attendance ID required" },
        { status: 400 }
      );
    }

    let totalHours: number | undefined = undefined;
    let computedLateUpd = 0;
    let computedUTUpd = 0;
    let computedOTUpd = 0;
    let computedStatusUpd = status;
    if (clockIn && clockOut) {
      const result = calculateWorkHoursDetailed(new Date(clockIn), new Date(clockOut));
      totalHours = result.totalHours;
      computedLateUpd = result.lateMinutes;
      computedUTUpd = result.undertimeMinutes;
      computedOTUpd = result.overtimeMinutes;
      if (!status && result.lateMinutes > 0) computedStatusUpd = "LATE";
      else if (!status) computedStatusUpd = "PRESENT";
    }

    const attendance = await prisma.attendance.update({
      where: { id },
      data: {
        clockIn: clockIn ? new Date(clockIn) : undefined,
        clockOut: clockOut ? new Date(clockOut) : undefined,
        status: computedStatusUpd,
        totalHours,
        lateMinutes: lateMinutes !== undefined ? lateMinutes : computedLateUpd,
        undertimeMinutes: undertimeMinutes !== undefined ? undertimeMinutes : computedUTUpd,
        overtimeMinutes: overtimeMinutes !== undefined ? overtimeMinutes : computedOTUpd,
        nightDiffMinutes: nightDiffMinutes !== undefined ? nightDiffMinutes : undefined,
        nightDiffOTMinutes: nightDiffOTMinutes !== undefined ? nightDiffOTMinutes : undefined,
        notes,
        isManualAdjust: true,
        adjustedById: (session.user as any)?.id,
      },
    });

    return NextResponse.json({ attendance });
  } catch (error) {
    console.error("Update attendance error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}