import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (!['ADMIN', 'HR', 'FINANCE'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const quarter = searchParams.get('quarter');
    const month = searchParams.get('month');

    const periodWhere: any = { year };
    if (quarter) {
      const quarterMap: Record<string, number[]> = {
        Q1: [1, 2, 3], Q2: [4, 5, 6], Q3: [7, 8, 9], Q4: [10, 11, 12],
      };
      periodWhere.month = { in: quarterMap[quarter] || [] };
    } else if (month) {
      periodWhere.month = parseInt(month);
    }

    const periods = await prisma.payrollPeriod.findMany({ where: periodWhere });
    const periodIds = periods.map(p => p.id);

    if (periodIds.length === 0) {
      return NextResponse.json({ year, expenses: [], totals: { sss: 0, philhealth: 0, pagibig: 0, ec: 0, total: 0 } });
    }

    // Get per-employee employer expenses
    const payrolls = await prisma.payroll.findMany({
      where: { payrollPeriodId: { in: periodIds } },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeId: true, department: { select: { name: true } } } },
        payrollPeriod: { select: { month: true, year: true, periodType: true } },
      },
    });

    // Group by employee
    const employeeExpenses: Record<string, any> = {};
    for (const p of payrolls) {
      const eid = p.employeeId;
      if (!employeeExpenses[eid]) {
        employeeExpenses[eid] = {
          employeeId: p.employee.employeeId,
          name: `${p.employee.firstName} ${p.employee.lastName}`,
          department: p.employee.department?.name || 'N/A',
          erSss: 0, erPhilhealth: 0, erPagibig: 0, erEc: 0, total: 0,
        };
      }
      const e = employeeExpenses[eid];
      e.erSss += p.employerSSS;
      e.erPhilhealth += p.employerPhilHealth;
      e.erPagibig += p.employerPagIbig;
      e.erEc += (p as any).employerEC || 0;
      e.total += p.employerSSS + p.employerPhilHealth + p.employerPagIbig + ((p as any).employerEC || 0);
    }

    const r = (v: number) => Math.round(v * 100) / 100;
    const expenses = Object.values(employeeExpenses).map((e: any) => ({
      ...e,
      erSss: r(e.erSss),
      erPhilhealth: r(e.erPhilhealth),
      erPagibig: r(e.erPagibig),
      erEc: r(e.erEc),
      total: r(e.total),
    }));

    const totals = expenses.reduce((acc: any, e: any) => {
      acc.sss += e.erSss;
      acc.philhealth += e.erPhilhealth;
      acc.pagibig += e.erPagibig;
      acc.ec += e.erEc;
      acc.total += e.total;
      return acc;
    }, { sss: 0, philhealth: 0, pagibig: 0, ec: 0, total: 0 });

    return NextResponse.json({
      year,
      filter: quarter || (month ? `Month ${month}` : 'Annual'),
      expenses,
      totals: {
        sss: r(totals.sss),
        philhealth: r(totals.philhealth),
        pagibig: r(totals.pagibig),
        ec: r(totals.ec),
        total: r(totals.total),
      },
    });
  } catch (error) {
    console.error('Error fetching employer expenses:', error);
    return NextResponse.json({ error: 'Failed to fetch employer expenses' }, { status: 500 });
  }
}
