import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { getCompanyContext } from "@/lib/tenant";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ctx = await getCompanyContext();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const where: any = { id };
    if (ctx.companyId) {
      where.OR = [{ companyId: ctx.companyId }, { companyId: null }];
    }

    const schedule = await prisma.workSchedule.findFirst({
      where,
      include: {
        employeeSchedules: true,
      },
    });

    if (!schedule) {
      return NextResponse.json({ error: "Work schedule not found" }, { status: 404 });
    }

    return NextResponse.json(schedule);
  } catch (error) {
    console.error("Error fetching work schedule:", error);
    return NextResponse.json({ error: "Failed to fetch work schedule" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'HR', 'SUPER_ADMIN'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ctx = await getCompanyContext();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    if (ctx.companyId) {
      const existing = await prisma.workSchedule.findFirst({
        where: { id, OR: [{ companyId: ctx.companyId }, { companyId: null }] },
      });
      if (!existing) {
        return NextResponse.json({ error: "Work schedule not found" }, { status: 404 });
      }
    }

    const body = await request.json();
    const {
      name, description, mondayStart, mondayEnd, tuesdayStart, tuesdayEnd,
      wednesdayStart, wednesdayEnd, thursdayStart, thursdayEnd,
      fridayStart, fridayEnd, saturdayStart, saturdayEnd, sundayStart, sundayEnd,
      breakMinutes, lateGracePeriod, requiredHours, isDefault, isActive,
    } = body;

    // If this is default, remove default from others in same company
    if (isDefault) {
      const defaultWhere: any = { isDefault: true, id: { not: id } };
      if (ctx.companyId) defaultWhere.companyId = ctx.companyId;
      await prisma.workSchedule.updateMany({
        where: defaultWhere,
        data: { isDefault: false },
      });
    }

    const schedule = await prisma.workSchedule.update({
      where: { id },
      data: {
        name, description, mondayStart, mondayEnd, tuesdayStart, tuesdayEnd,
        wednesdayStart, wednesdayEnd, thursdayStart, thursdayEnd,
        fridayStart, fridayEnd, saturdayStart, saturdayEnd, sundayStart, sundayEnd,
        breakMinutes, lateGracePeriod, requiredHours, isDefault, isActive,
      },
    });

    return NextResponse.json(schedule);
  } catch (error) {
    console.error("Error updating work schedule:", error);
    return NextResponse.json({ error: "Failed to update work schedule" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ctx = await getCompanyContext();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    
    // Verify ownership
    if (ctx.companyId) {
      const existing = await prisma.workSchedule.findFirst({
        where: { id, companyId: ctx.companyId },
      });
      if (!existing) {
        return NextResponse.json({ error: "Work schedule not found" }, { status: 404 });
      }
    }

    const schedule = await prisma.workSchedule.findUnique({
      where: { id },
      include: {
        _count: {
          select: { employeeSchedules: true },
        },
      },
    });

    if (schedule?._count.employeeSchedules && schedule._count.employeeSchedules > 0) {
      return NextResponse.json(
        { error: "Cannot delete schedule with assigned employees" },
        { status: 400 }
      );
    }

    await prisma.workSchedule.delete({ where: { id } });

    return NextResponse.json({ message: "Work schedule deleted successfully" });
  } catch (error) {
    console.error("Error deleting work schedule:", error);
    return NextResponse.json({ error: "Failed to delete work schedule" }, { status: 500 });
  }
}
