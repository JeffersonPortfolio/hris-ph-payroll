import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { getCompanyContext } from '@/lib/tenant';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'HR', 'SUPER_ADMIN'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ctx = await getCompanyContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : null;

    // Get departments scoped by company
    const deptWhere: any = { isActive: true };
    if (ctx.companyId) deptWhere.companyId = ctx.companyId;

    const departments = await prisma.department.findMany({
      where: deptWhere,
      orderBy: { name: 'asc' },
    });

    // Get employees scoped by company
    const empWhere: any = { isActive: true };
    if (ctx.companyId) empWhere.companyId = ctx.companyId;

    const employees = await prisma.employee.findMany({
      where: empWhere,
      select: { id: true, departmentId: true },
    });

    const employeeDeptMap = new Map(employees.map(e => [e.id, e.departmentId]));

    // Build date range filter
    const dateFilter: any = { year };
    if (month) dateFilter.month = month;
    if (ctx.companyId) dateFilter.companyId = ctx.companyId;

    const periods = await prisma.payrollPeriod.findMany({
      where: dateFilter,
      include: {
        payrolls: true,
      },
      orderBy: [
        { month: 'asc' },
        { periodType: 'asc' },
      ],
    });

    // Calculate costs per department
    const departmentCosts: { [key: string]: {
      name: string;
      monthly: { [key: string]: number };
      totalGross: number;
      totalNet: number;
      totalDeductions: number;
      employerContributions: number;
      employeeCount: number;
    }} = {};

    for (const dept of departments) {
      departmentCosts[dept.id] = {
        name: dept.name,
        monthly: {},
        totalGross: 0,
        totalNet: 0,
        totalDeductions: 0,
        employerContributions: 0,
        employeeCount: 0,
      };
    }

    departmentCosts['unassigned'] = {
      name: 'Unassigned',
      monthly: {},
      totalGross: 0,
      totalNet: 0,
      totalDeductions: 0,
      employerContributions: 0,
      employeeCount: 0,
    };

    const deptEmployees: { [key: string]: Set<string> } = {};
    for (const deptId of Object.keys(departmentCosts)) {
      deptEmployees[deptId] = new Set();
    }

    // Only include payrolls for employees in our company
    const companyEmployeeIds = new Set(employees.map(e => e.id));

    for (const period of periods) {
      const monthKey = `${period.year}-${String(period.month).padStart(2, '0')}`;

      for (const payroll of period.payrolls) {
        // Skip payrolls for employees not in this company
        if (ctx.companyId && !companyEmployeeIds.has(payroll.employeeId)) continue;

        const deptId = employeeDeptMap.get(payroll.employeeId) || 'unassigned';
        const dept = departmentCosts[deptId] || departmentCosts['unassigned'];

        deptEmployees[deptId]?.add(payroll.employeeId);

        if (!dept.monthly[monthKey]) dept.monthly[monthKey] = 0;

        const employerContrib = payroll.employerSSS + payroll.employerPhilHealth + payroll.employerPagIbig;
        dept.monthly[monthKey] += payroll.grossEarnings;
        dept.totalGross += payroll.grossEarnings;
        dept.totalNet += payroll.netPay;
        dept.totalDeductions += payroll.totalDeductions;
        dept.employerContributions += employerContrib;
      }
    }

    for (const deptId of Object.keys(departmentCosts)) {
      departmentCosts[deptId].employeeCount = deptEmployees[deptId]?.size || 0;
    }

    const grandTotal = {
      totalGross: 0,
      totalNet: 0,
      totalDeductions: 0,
      employerContributions: 0,
      monthly: {} as { [key: string]: number },
    };

    for (const dept of Object.values(departmentCosts)) {
      grandTotal.totalGross += dept.totalGross;
      grandTotal.totalNet += dept.totalNet;
      grandTotal.totalDeductions += dept.totalDeductions;
      grandTotal.employerContributions += dept.employerContributions;

      for (const [m, cost] of Object.entries(dept.monthly)) {
        if (!grandTotal.monthly[m]) grandTotal.monthly[m] = 0;
        grandTotal.monthly[m] += cost;
      }
    }

    const months = month 
      ? [`${year}-${String(month).padStart(2, '0')}`]
      : Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);

    return NextResponse.json({
      year,
      month,
      months,
      departments: Object.values(departmentCosts).filter(d => d.employeeCount > 0 || d.totalGross > 0),
      grandTotal,
    });
  } catch (error) {
    console.error('Error fetching department costs:', error);
    return NextResponse.json({ error: 'Failed to fetch department costs' }, { status: 500 });
  }
}
