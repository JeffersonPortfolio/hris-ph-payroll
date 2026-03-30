import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { calculateWorkHoursDetailed } from '@/lib/utils';
import { getCompanyContext } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

// POST: Bulk mark employees as present for a specific date
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'HR', 'SUPER_ADMIN'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ctx = await getCompanyContext();

    const body = await request.json();
    const {
      date,
      employeeIds,
      clockIn,
      clockOut,
      skipExisting,
    } = body;

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    const targetDate = new Date(date + 'T00:00:00');
    const clockInTime = clockIn || '09:00';
    const clockOutTime = clockOut || '18:00';

    const [ciH, ciM] = clockInTime.split(':').map(Number);
    const [coH, coM] = clockOutTime.split(':').map(Number);

    // Get employees with company filter
    const empWhere: any = { isActive: true };
    if (ctx?.companyId) {
      empWhere.companyId = ctx.companyId;
    }
    if (employeeIds && employeeIds.length > 0) {
      empWhere.id = { in: employeeIds };
    }

    const employees = await prisma.employee.findMany({
      where: empWhere,
      select: { id: true },
    });

    // Get existing attendance for the date to skip if needed
    const existingAttendance = await prisma.attendance.findMany({
      where: {
        date: targetDate,
        employeeId: { in: employees.map((e: { id: string }) => e.id) },
      },
      select: { employeeId: true },
    });
    const existingSet = new Set(existingAttendance.map((a: { employeeId: string }) => a.employeeId));

    // Holiday check with company scope
    const holidayWhere: any = { date: targetDate };
    if (ctx?.companyId) {
      holidayWhere.OR = [{ companyId: ctx.companyId }, { companyId: null }];
    }

    let created = 0;
    let skipped = 0;
    let updated = 0;

    for (const emp of employees) {
      if (skipExisting && existingSet.has(emp.id)) {
        skipped++;
        continue;
      }

      const clockInDate = new Date(targetDate);
      clockInDate.setHours(ciH, ciM, 0, 0);
      const clockOutDate = new Date(targetDate);
      clockOutDate.setHours(coH, coM, 0, 0);

      const result = calculateWorkHoursDetailed(clockInDate, clockOutDate);

      const holiday = await prisma.holiday.findFirst({ where: holidayWhere });

      if (existingSet.has(emp.id)) {
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
            companyId: ctx?.companyId || null,
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
