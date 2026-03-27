import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

// GET department schedules
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get('departmentId');

    const where: any = {};
    if (departmentId) {
      where.departmentId = departmentId;
    }

    const schedules = await prisma.departmentSchedule.findMany({
      where,
      include: {
        workSchedule: true,
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    // Get department names
    const deptIds = [...new Set(schedules.map(s => s.departmentId))];
    const departments = await prisma.department.findMany({
      where: { id: { in: deptIds } },
    });
    const deptMap = new Map(departments.map(d => [d.id, d.name]));

    const result = schedules.map(s => ({
      ...s,
      departmentName: deptMap.get(s.departmentId) || 'Unknown',
    }));

    return NextResponse.json({ schedules: result });
  } catch (error) {
    console.error('Error fetching department schedules:', error);
    return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 });
  }
}

// POST assign schedule to department
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'HR'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { departmentId, workScheduleId, effectiveFrom, effectiveTo, isDefault } = body;

    if (!departmentId || !workScheduleId || !effectiveFrom) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // If setting as default, unset other defaults for this department
    if (isDefault) {
      await prisma.departmentSchedule.updateMany({
        where: { departmentId },
        data: { isDefault: false },
      });
    }

    const schedule = await prisma.departmentSchedule.create({
      data: {
        departmentId,
        workScheduleId,
        effectiveFrom: new Date(effectiveFrom),
        effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
        isDefault: isDefault ?? true,
      },
      include: {
        workSchedule: true,
      },
    });

    return NextResponse.json(schedule, { status: 201 });
  } catch (error) {
    console.error('Error creating department schedule:', error);
    return NextResponse.json({ error: 'Failed to create schedule' }, { status: 500 });
  }
}

// DELETE department schedule
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'HR'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Schedule ID required' }, { status: 400 });
    }

    await prisma.departmentSchedule.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting department schedule:', error);
    return NextResponse.json({ error: 'Failed to delete schedule' }, { status: 500 });
  }
}
