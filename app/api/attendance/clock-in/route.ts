import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { calculateLateMinutes } from "@/lib/utils";
import { validateGeofence } from "@/lib/geofence";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { employeeId, latitude, longitude } = await request.json();

    if (!employeeId) {
      return NextResponse.json({ message: "Employee ID required" }, { status: 400 });
    }

    // Validate geofence before allowing clock-in
    const geoCheck = await validateGeofence(employeeId, latitude, longitude);
    if (!geoCheck.allowed) {
      return NextResponse.json({ message: geoCheck.message }, { status: 403 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already clocked in
    const existing = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId,
          date: today,
        },
      },
    });

    if (existing?.clockIn) {
      return NextResponse.json(
        { message: "Already clocked in today" },
        { status: 400 }
      );
    }

    const now = new Date();
    const lateMinutes = calculateLateMinutes(now);
    const status = lateMinutes > 0 ? "LATE" : "PRESENT";

    const attendance = await prisma.attendance.upsert({
      where: {
        employeeId_date: {
          employeeId,
          date: today,
        },
      },
      update: {
        clockIn: now,
        status,
        lateMinutes,
      },
      create: {
        employeeId,
        date: today,
        clockIn: now,
        status,
        lateMinutes,
      },
    });

    return NextResponse.json({ attendance });
  } catch (error) {
    console.error("Clock-in error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}