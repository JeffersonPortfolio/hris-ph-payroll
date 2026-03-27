import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { calculateWorkHoursDetailed } from '@/lib/utils';

export const dynamic = 'force-dynamic';

// POST: Bulk mark employees as present for a specific date
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'HR'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      date,          // "YYYY-MM-DD"
      employeeIds,   // string[] — specific employees, or empty for all active
      clockIn,       // "HH:mm" default "09:00"
      clockOut,      // "HH:mm" default "18:00"
      skipExisting,  // boolean — skip employees who already have attendance for the date
    } = body;

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    const targetDate = new Date(date + 'T00:00:00');
    const clockInTime = clockIn || '09:00';
    const clockOutTime = clockOut || '18:00';

    // Build clock-in and clock-out as proper UTC dates
    const [ciH, ciM] = clockInTime.split(':').map(Number);
    const [coH, coM] = clockOutTime.split(':').map(Number);

    // Get employees to process
    let employees;
    if (employeeIds && employeeIds.length > 0) {
      employees = await prisma.employee.findMany({
        where: { id: { in: employeeIds }, isActive: true },
        select: { id: true },
      });
    } else {
      employees = await prisma.employee.findMany({
        where: { isActive: true },
        select: { id: true },
      });
    }

    // Get existing attendance for the date to skip if needed
    const existingAttendance = await prisma.attendance.findMany({
      where: {
        date: targetDate,
        employeeId: { in: employees.map((e: { id: string }) => e.id) },
      },
      select: { employeeId: true },
    });
    const existingSet = new Set(existingAttendance.map((a: { employeeId: string }) => a.employeeId));

    let created = 0;
    let skipped = 0;
    let updated = 0;

    for (const emp of employees) {
      if (skipExisting && existingSet.has(emp.id)) {
        skipped++;
        continue;
      }

      // Build clock-in/out timestamps for this date
      const clockInDate = new Date(targetDate);
      clockInDate.setHours(ciH, ciM, 0, 0);
      const clockOutDate = new Date(targetDate);
      clockOutDate.setHours(coH, coM, 0, 0);

      // Calculate work hours
      const result = calculateWorkHoursDetailed(clockInDate, clockOutDate);

      // Check for holiday
      const holiday = await prisma.holiday.findFirst({
        where: { date: targetDate },
      });

      if (existingSet.has(emp.id)) {
        // Update existing record
        const existing = await prisma.attendance.findFirst({
          where: { employeeId: emp.id, date: targetDate },
        });
        if (existing) {
          await prisma.attendance.update({
            where: { id: existing.id },
            data: {
              clockIn: clockInDate,
              clockOut: clockOutDate,
              totalHours: result.totalHours,
              lateMinutes: result.lateMinutes,
              undertimeMinutes: result.undertimeMinutes,
              overtimeMinutes: result.overtimeMinutes,
              status: result.lateMinutes > 0 ? 'LATE' : 'PRESENT',
              isManualAdjust: true,
              isHoliday: !!holiday,
              holidayType: holiday?.type || null,
              holidayMultiplier: holiday?.type === 'REGULAR' ? 2.0 : holiday?.type === 'SPECIAL' ? 1.3 : 1.0,
            },
          });
          updated++;
        }
      } else {
        // Create new attendance
        await prisma.attendance.create({
          data: {
            employeeId: emp.id,
            date: targetDate,
            clockIn: clockInDate,
            clockOut: clockOutDate,
            totalHours: result.totalHours,
            lateMinutes: result.lateMinutes,
            undertimeMinutes: result.undertimeMinutes,
            overtimeMinutes: result.overtimeMinutes,
            nightDiffMinutes: 0,
            nightDiffOTMinutes: 0,
            status: result.lateMinutes > 0 ? 'LATE' : 'PRESENT',
            isManualAdjust: true,
            isHoliday: !!holiday,
            holidayType: holiday?.type || null,
            holidayMultiplier: holiday?.type === 'REGULAR' ? 2.0 : holiday?.type === 'SPECIAL' ? 1.3 : 1.0,
          },
        });
        created++;
      }
    }

    return NextResponse.json({
      success: true,
      created,
      updated,
      skipped,
      total: employees.length,
    });
  } catch (error) {
    console.error('Error bulk marking attendance:', error);
    return NextResponse.json({ error: 'Failed to mark attendance' }, { status: 500 });
  }
}
