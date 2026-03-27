import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const schedule = await prisma.workSchedule.findUnique({
      where: { id },
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
    if (!session || ((session.user as any)?.role !== "ADMIN" && (session.user as any)?.role !== "HR")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
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
      isActive,
    } = body;

    // If this is default, remove default from others
    if (isDefault) {
      await prisma.workSchedule.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const schedule = await prisma.workSchedule.update({
      where: { id },
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
        breakMinutes,
        lateGracePeriod,
        requiredHours,
        isDefault,
        isActive,
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
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    
    // Check if schedule has employees assigned
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

    await prisma.workSchedule.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Work schedule deleted successfully" });
  } catch (error) {
    console.error("Error deleting work schedule:", error);
    return NextResponse.json({ error: "Failed to delete work schedule" }, { status: 500 });
  }
}
