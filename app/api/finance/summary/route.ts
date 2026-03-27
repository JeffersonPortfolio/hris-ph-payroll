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
    const quarter = searchParams.get('quarter'); // Q1, Q2, Q3, Q4, or null for annual
    const month = searchParams.get('month'); // 1-12 or null

    // Build period filter
    const periodWhere: any = { year };
    if (quarter) {
      const quarterMap: Record<string, number[]> = {
        Q1: [1, 2, 3],
        Q2: [4, 5, 6],
        Q3: [7, 8, 9],
        Q4: [10, 11, 12],
      };
      periodWhere.month = { in: quarterMap[quarter] || [] };
    } else if (month) {
      periodWhere.month = parseInt(month);
    }

    // Get all payroll periods matching filter
    const periods = await prisma.payrollPeriod.findMany({
      where: periodWhere,
    });
    const periodIds = periods.map(p => p.id);

    if (periodIds.length === 0) {
      return NextResponse.json({
        year,
        quarter: quarter || 'Annual',
        totalEmployees: 0,
        totalGrossEarnings: 0,
        totalNetPay: 0,
        totalWithholdingTax: 0,
        employeeContributions: { sss: 0, philhealth: 0, pagibig: 0, total: 0 },
        employerContributions: { sss: 0, philhealth: 0, pagibig: 0, ec: 0, total: 0 },
        totalContributions: 0,
        monthlyBreakdown: [],
      });
    }

    // Aggregate payroll data
    const payrolls = await prisma.payroll.findMany({
      where: { payrollPeriodId: { in: periodIds } },
      include: { payrollPeriod: true, employee: { include: { department: true } } },
    });

    const uniqueEmployees = new Set(payrolls.map(p => p.employeeId));

    const totals = payrolls.reduce((acc, p) => {
      acc.grossEarnings += p.grossEarnings;
      acc.netPay += p.netPay;
      acc.withholdingTax += p.withholdingTax;
      acc.eeSss += p.sssContribution;
      acc.eePhilhealth += p.philHealthContribution;
      acc.eePagibig += p.pagIbigContribution;
      acc.erSss += p.employerSSS;
      acc.erPhilhealth += p.employerPhilHealth;
      acc.erPagibig += p.employerPagIbig;
      acc.erEc += (p as any).employerEC || 0;
      return acc;
    }, {
      grossEarnings: 0, netPay: 0, withholdingTax: 0,
      eeSss: 0, eePhilhealth: 0, eePagibig: 0,
      erSss: 0, erPhilhealth: 0, erPagibig: 0, erEc: 0,
    });

    // Monthly breakdown
    const monthlyMap: Record<number, any> = {};
    for (const p of payrolls) {
      const m = p.payrollPeriod.month;
      if (!monthlyMap[m]) {
        monthlyMap[m] = {
          month: m,
          grossEarnings: 0, netPay: 0, withholdingTax: 0,
          eeSss: 0, eePhilhealth: 0, eePagibig: 0,
          erSss: 0, erPhilhealth: 0, erPagibig: 0, erEc: 0,
          employeeCount: new Set(),
        };
      }
      const mm = monthlyMap[m];
      mm.grossEarnings += p.grossEarnings;
      mm.netPay += p.netPay;
      mm.withholdingTax += p.withholdingTax;
      mm.eeSss += p.sssContribution;
      mm.eePhilhealth += p.philHealthContribution;
      mm.eePagibig += p.pagIbigContribution;
      mm.erSss += p.employerSSS;
      mm.erPhilhealth += p.employerPhilHealth;
      mm.erPagibig += p.employerPagIbig;
      mm.erEc += (p as any).employerEC || 0;
      mm.employeeCount.add(p.employeeId);
    }

    const monthlyBreakdown = Object.values(monthlyMap).map((m: any) => ({
      month: m.month,
      employeeCount: m.employeeCount.size,
      grossEarnings: Math.round(m.grossEarnings * 100) / 100,
      netPay: Math.round(m.netPay * 100) / 100,
      withholdingTax: Math.round(m.withholdingTax * 100) / 100,
      employeeContributions: {
        sss: Math.round(m.eeSss * 100) / 100,
        philhealth: Math.round(m.eePhilhealth * 100) / 100,
        pagibig: Math.round(m.eePagibig * 100) / 100,
        total: Math.round((m.eeSss + m.eePhilhealth + m.eePagibig) * 100) / 100,
      },
      employerContributions: {
        sss: Math.round(m.erSss * 100) / 100,
        philhealth: Math.round(m.erPhilhealth * 100) / 100,
        pagibig: Math.round(m.erPagibig * 100) / 100,
        ec: Math.round(m.erEc * 100) / 100,
        total: Math.round((m.erSss + m.erPhilhealth + m.erPagibig + m.erEc) * 100) / 100,
      },
    })).sort((a, b) => a.month - b.month);

    const r = (v: number) => Math.round(v * 100) / 100;

    return NextResponse.json({
      year,
      quarter: quarter || (month ? `Month ${month}` : 'Annual'),
      totalEmployees: uniqueEmployees.size,
      totalGrossEarnings: r(totals.grossEarnings),
      totalNetPay: r(totals.netPay),
      totalWithholdingTax: r(totals.withholdingTax),
      employeeContributions: {
        sss: r(totals.eeSss),
        philhealth: r(totals.eePhilhealth),
        pagibig: r(totals.eePagibig),
        total: r(totals.eeSss + totals.eePhilhealth + totals.eePagibig),
      },
      employerContributions: {
        sss: r(totals.erSss),
        philhealth: r(totals.erPhilhealth),
        pagibig: r(totals.erPagibig),
        ec: r(totals.erEc),
        total: r(totals.erSss + totals.erPhilhealth + totals.erPagibig + totals.erEc),
      },
      totalContributions: r(
        totals.eeSss + totals.eePhilhealth + totals.eePagibig +
        totals.erSss + totals.erPhilhealth + totals.erPagibig + totals.erEc
      ),
      monthlyBreakdown,
    });
  } catch (error) {
    console.error('Error fetching finance summary:', error);
    return NextResponse.json({ error: 'Failed to fetch finance summary' }, { status: 500 });
  }
}
