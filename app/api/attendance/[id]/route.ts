import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { calculateWorkHoursDetailed } from "@/lib/utils";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const attendance = await prisma.attendance.findUnique({
      where: { id },
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
    });

    if (!attendance) {
      return NextResponse.json({ message: "Attendance not found" }, { status: 404 });
    }

    return NextResponse.json(attendance);
  } catch (error) {
    console.error("Get attendance error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any)?.role;
    if (role !== "ADMIN" && role !== "HR" && role !== "SUPER_ADMIN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      clockIn, clockOut, status, lateMinutes, undertimeMinutes,
      overtimeMinutes, nightDiffMinutes, nightDiffOTMinutes, notes,
    } = body;

    let totalHours: number | undefined = undefined;
    let computedLate = 0;
    let computedUT = 0;
    let computedOT = 0;
    let computedStatus = status;
    if (clockIn && clockOut) {
      const result = calculateWorkHoursDetailed(new Date(clockIn), new Date(clockOut));
      totalHours = result.totalHours;
      computedLate = result.lateMinutes;
      computedUT = result.undertimeMinutes;
      computedOT = result.overtimeMinutes;
      if (!status && result.lateMinutes > 0) computedStatus = "LATE";
      else if (!status) computedStatus = "PRESENT";
    }

    const attendance = await prisma.attendance.update({
      where: { id },
      data: {
        clockIn: clockIn ? new Date(clockIn) : null,
        clockOut: clockOut ? new Date(clockOut) : null,
        status: computedStatus,
        totalHours,
        lateMinutes: lateMinutes ?? computedLate,
        undertimeMinutes: undertimeMinutes ?? computedUT,
        overtimeMinutes: overtimeMinutes ?? computedOT,
        nightDiffMinutes: nightDiffMinutes ?? undefined,
        nightDiffOTMinutes: nightDiffOTMinutes ?? undefined,
        notes,
        isManualAdjust: true,
        adjustedById: (session.user as any)?.id,
      },
    });

    return NextResponse.json(attendance);
  } catch (error) {
    console.error("Update attendance error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any)?.role;
    if (role !== "ADMIN" && role !== "HR" && role !== "SUPER_ADMIN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    await prisma.attendance.delete({ where: { id } });

    return NextResponse.json({ message: "Attendance deleted successfully" });
  } catch (error) {
    console.error("Delete attendance error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
