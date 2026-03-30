import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { getCompanyContext } from "@/lib/tenant";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ctx = await getCompanyContext();

    const where: any = { isActive: true };
    if (ctx?.companyId) {
      where.OR = [{ companyId: ctx.companyId }, { companyId: null }];
    }

    const schedules = await prisma.workSchedule.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        _count: { select: { employeeSchedules: true } },
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
    if (!session || !['ADMIN', 'HR', 'SUPER_ADMIN'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ctx = await getCompanyContext();

    const body = await request.json();
    const {
      name, description,
      mondayStart, mondayEnd, tuesdayStart, tuesdayEnd,
      wednesdayStart, wednesdayEnd, thursdayStart, thursdayEnd,
      fridayStart, fridayEnd, saturdayStart, saturdayEnd,
      sundayStart, sundayEnd,
      breakMinutes, lateGracePeriod, requiredHours, isDefault,
    } = body;

    if (isDefault) {
      const defaultWhere: any = { isDefault: true };
      if (ctx?.companyId) {
        defaultWhere.companyId = ctx.companyId;
      }
      await prisma.workSchedule.updateMany({
        where: defaultWhere,
        data: { isDefault: false },
      });
    }

    const schedule = await prisma.workSchedule.create({
      data: {
        name, description,
        mondayStart, mondayEnd, tuesdayStart, tuesdayEnd,
        wednesdayStart, wednesdayEnd, thursdayStart, thursdayEnd,
        fridayStart, fridayEnd, saturdayStart, saturdayEnd,
        sundayStart, sundayEnd,
        breakMinutes: breakMinutes || 60,
        lateGracePeriod: lateGracePeriod || 0,
        requiredHours: requiredHours || 9,
        isDefault: isDefault || false,
        companyId: ctx?.companyId || null,
      },
    });

    return NextResponse.json(schedule);
  } catch (error) {
    console.error("Error creating work schedule:", error);
    return NextResponse.json({ error: "Failed to create work schedule" }, { status: 500 });
  }
}
