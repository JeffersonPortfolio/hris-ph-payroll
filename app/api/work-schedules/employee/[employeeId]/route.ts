import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { employeeId } = await params;

    const schedules = await prisma.employeeSchedule.findMany({
      where: { employeeId },
      include: {
        workSchedule: true,
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    return NextResponse.json({ schedules });
  } catch (error) {
    console.error('Error fetching employee schedules:', error);
    return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'HR'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { employeeId } = await params;
    const { searchParams } = new URL(request.url);
    const scheduleId = searchParams.get('scheduleId');

    if (!scheduleId) {
      return NextResponse.json({ error: 'Schedule ID required' }, { status: 400 });
    }

    await prisma.employeeSchedule.delete({
      where: { id: scheduleId, employeeId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting employee schedule:', error);
    return NextResponse.json({ error: 'Failed to delete schedule' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'HR'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { employeeId } = await params;
    const body = await request.json();
    const { workScheduleId, effectiveFrom, effectiveTo } = body;

    // Check if employee exists
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Check if work schedule exists
    const workSchedule = await prisma.workSchedule.findUnique({ where: { id: workScheduleId } });
    if (!workSchedule) {
      return NextResponse.json({ error: 'Work schedule not found' }, { status: 404 });
    }

    // End any existing active schedules
    await prisma.employeeSchedule.updateMany({
      where: {
        employeeId,
        effectiveTo: null,
      },
      data: {
        effectiveTo: new Date(effectiveFrom),
      },
    });

    // Create new schedule assignment
    const schedule = await prisma.employeeSchedule.create({
      data: {
        employeeId,
        workScheduleId,
        effectiveFrom: new Date(effectiveFrom),
        effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
      },
      include: {
        workSchedule: true,
      },
    });

    return NextResponse.json({ schedule });
  } catch (error) {
    console.error('Error assigning schedule:', error);
    return NextResponse.json({ error: 'Failed to assign schedule' }, { status: 500 });
  }
}
