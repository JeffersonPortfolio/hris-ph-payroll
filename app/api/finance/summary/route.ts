import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { getCompanyContext } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'HR', 'FINANCE', 'SUPER_ADMIN'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ctx = await getCompanyContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const quarter = searchParams.get('quarter');
    const month = searchParams.get('month');

    // Build period filter
    const periodWhere: any = { year };
    if (ctx.companyId) periodWhere.companyId = ctx.companyId;

    if (quarter) {
      const q = parseInt(quarter);
      const startMonth = (q - 1) * 3 + 1;
      periodWhere.month = { gte: startMonth, lte: startMonth + 2 };
    } else if (month) {
      periodWhere.month = parseInt(month);
    }

    const periods = await prisma.payrollPeriod.findMany({
      where: periodWhere,
      include: { payrolls: true },
      orderBy: [{ month: 'asc' }, { periodType: 'asc' }],
    });

    // Aggregate data
    let totalEmployees = 0;
    let totalGrossEarnings = 0;
    let totalNetPay = 0;
    let totalWithholdingTax = 0;
    let totalSSS = 0;
    let totalPhilHealth = 0;
    let totalPagIbig = 0;
    let totalEmployerSSS = 0;
    let totalEmployerPhilHealth = 0;
    let totalEmployerPagIbig = 0;
    let totalEmployerEC = 0;

    const monthlyData: Record<number, any> = {};
    const uniqueEmployees = new Set<string>();

    for (const period of periods) {
      if (!monthlyData[period.month]) {
        monthlyData[period.month] = {
          month: period.month,
          grossEarnings: 0,
          netPay: 0,
          withholdingTax: 0,
          sss: 0,
          philHealth: 0,
          pagIbig: 0,
          employerSSS: 0,
          employerPhilHealth: 0,
          employerPagIbig: 0,
          employerEC: 0,
          employeeCount: 0,
        };
      }

      for (const p of period.payrolls) {
        uniqueEmployees.add(p.employeeId);
        totalGrossEarnings += p.grossEarnings;
        totalNetPay += p.netPay;
        totalWithholdingTax += p.withholdingTax || 0;
        totalSSS += p.sssContribution;
        totalPhilHealth += p.philHealthContribution;
        totalPagIbig += p.pagIbigContribution;
        totalEmployerSSS += p.employerSSS;
        totalEmployerPhilHealth += p.employerPhilHealth;
        totalEmployerPagIbig += p.employerPagIbig;
        totalEmployerEC += p.employerEC || 0;

        const md = monthlyData[period.month];
        md.grossEarnings += p.grossEarnings;
        md.netPay += p.netPay;
        md.withholdingTax += p.withholdingTax || 0;
        md.sss += p.sssContribution;
        md.philHealth += p.philHealthContribution;
        md.pagIbig += p.pagIbigContribution;
        md.employerSSS += p.employerSSS;
        md.employerPhilHealth += p.employerPhilHealth;
        md.employerPagIbig += p.employerPagIbig;
        md.employerEC += p.employerEC || 0;
      }
    }

    totalEmployees = uniqueEmployees.size;

    return NextResponse.json({
      year,
      totalEmployees,
      totalGrossEarnings,
      totalNetPay,
      totalWithholdingTax,
      employeeContributions: {
        sss: totalSSS,
        philHealth: totalPhilHealth,
        pagIbig: totalPagIbig,
      },
      employerContributions: {
        sss: totalEmployerSSS,
        philHealth: totalEmployerPhilHealth,
        pagIbig: totalEmployerPagIbig,
        ec: totalEmployerEC,
      },
      monthlyBreakdown: Object.values(monthlyData).sort((a: any, b: any) => a.month - b.month),
    });
  } catch (error) {
    console.error('Error fetching finance summary:', error);
    return NextResponse.json({ error: 'Failed to fetch finance summary' }, { status: 500 });
  }
}
