import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { calculateWorkHoursDetailed } from "@/lib/utils";
import { AttendanceStatus } from "@prisma/client";
import { validateGeofence } from "@/lib/geofence";
import { getCompanyContext } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const ctx = await getCompanyContext();
    if (!ctx) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { attendanceId, latitude, longitude } = await request.json();

    if (!attendanceId) {
      return NextResponse.json({ message: "Attendance ID required" }, { status: 400 });
    }

    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: { employee: { select: { companyId: true } } },
    });

    if (!attendance) {
      return NextResponse.json({ message: "Attendance not found" }, { status: 404 });
    }

    // Verify company access
    if (ctx.companyId && attendance.employee?.companyId !== ctx.companyId) {
      return NextResponse.json({ message: "Attendance not found" }, { status: 404 });
    }

    // Validate geofence before allowing clock-out
    const geoCheck = await validateGeofence(attendance.employeeId, latitude, longitude);
    if (!geoCheck.allowed) {
      return NextResponse.json({ message: geoCheck.message }, { status: 403 });
    }

    if (!attendance.clockIn) {
      return NextResponse.json(
        { message: "Must clock in first" },
        { status: 400 }
      );
    }

    if (attendance.clockOut) {
      return NextResponse.json(
        { message: "Already clocked out" },
        { status: 400 }
      );
    }

    const now = new Date();
    const result = calculateWorkHoursDetailed(attendance.clockIn, now);

    // Determine status based on new rules
    let status: AttendanceStatus = AttendanceStatus.PRESENT;
    if (result.lateMinutes > 0) status = AttendanceStatus.LATE;

    const updated = await prisma.attendance.update({
      where: { id: attendanceId },
      data: {
        clockOut: now,
        totalHours: result.totalHours,
        overtimeMinutes: result.overtimeMinutes,
        undertimeMinutes: result.undertimeMinutes,
        lateMinutes: result.lateMinutes,
        status,
      },
    });

    return NextResponse.json({ attendance: updated });
  } catch (error) {
    console.error("Clock-out error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
