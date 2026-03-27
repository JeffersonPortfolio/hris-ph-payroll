import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const schedules = await prisma.workSchedule.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { employeeSchedules: true },
        },
      },
    });

    return NextResponse.json(schedules);
  } catch (error) {
    console.error("Error fetching work schedules:", error);
    return NextResponse.json({ error: "Failed to fetch work schedules" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || ((session.user as any)?.role !== "ADMIN" && (session.user as any)?.role !== "HR")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      mondayStart,
      mondayEnd,
      tuesdayStart,
      tuesdayEnd,
      wednesdayStart,
      wednesdayEnd,
      thursdayStart,
      thursdayEnd,
      fridayStart,
      fridayEnd,
      saturdayStart,
      saturdayEnd,
      sundayStart,
      sundayEnd,
      breakMinutes,
      lateGracePeriod,
      requiredHours,
      isDefault,
    } = body;

    // If this is default, remove default from others
    if (isDefault) {
      await prisma.workSchedule.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const schedule = await prisma.workSchedule.create({
      data: {
        name,
        description,
        mondayStart,
        mondayEnd,
        tuesdayStart,
        tuesdayEnd,
        wednesdayStart,
        wednesdayEnd,
        thursdayStart,
        thursdayEnd,
        fridayStart,
        fridayEnd,
        saturdayStart,
        saturdayEnd,
        sundayStart,
        sundayEnd,
        breakMinutes: breakMinutes || 60,
        lateGracePeriod: lateGracePeriod || 0,
        requiredHours: requiredHours || 9,
        isDefault: isDefault || false,
      },
    });

    return NextResponse.json(schedule);
  } catch (error) {
    console.error("Error creating work schedule:", error);
    return NextResponse.json({ error: "Failed to create work schedule" }, { status: 500 });
  }
}
