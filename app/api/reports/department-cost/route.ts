import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'HR'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : null;

    // Get all departments
    const departments = await prisma.department.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    // Get all employees with their departments
    const employees = await prisma.employee.findMany({
      where: { isActive: true },
      select: { id: true, departmentId: true },
    });

    const employeeDeptMap = new Map(employees.map(e => [e.id, e.departmentId]));

    // Build date range filter
    const dateFilter: any = { year };
    if (month) {
      dateFilter.month = month;
    }

    // Get payroll periods for the specified timeframe
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

    // Initialize department costs
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

    // Add "Unassigned" for employees without department
    departmentCosts['unassigned'] = {
      name: 'Unassigned',
      monthly: {},
      totalGross: 0,
      totalNet: 0,
      totalDeductions: 0,
      employerContributions: 0,
      employeeCount: 0,
    };

    // Track unique employees per department
    const deptEmployees: { [key: string]: Set<string> } = {};
    for (const deptId of Object.keys(departmentCosts)) {
      deptEmployees[deptId] = new Set();
    }

    // Process payrolls
    for (const period of periods) {
      const monthKey = `${period.year}-${String(period.month).padStart(2, '0')}`;

      for (const payroll of period.payrolls) {
        const deptId = employeeDeptMap.get(payroll.employeeId) || 'unassigned';
        const dept = departmentCosts[deptId] || departmentCosts['unassigned'];

        // Track employee
        deptEmployees[deptId]?.add(payroll.employeeId);

        // Initialize monthly if not exists
        if (!dept.monthly[monthKey]) {
          dept.monthly[monthKey] = 0;
        }

        // Add costs
        const employerContrib = payroll.employerSSS + payroll.employerPhilHealth + payroll.employerPagIbig;
        dept.monthly[monthKey] += payroll.grossEarnings;
        dept.totalGross += payroll.grossEarnings;
        dept.totalNet += payroll.netPay;
        dept.totalDeductions += payroll.totalDeductions;
        dept.employerContributions += employerContrib;
      }
    }

    // Set employee counts
    for (const deptId of Object.keys(departmentCosts)) {
      departmentCosts[deptId].employeeCount = deptEmployees[deptId]?.size || 0;
    }

    // Calculate grand totals
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

      for (const [month, cost] of Object.entries(dept.monthly)) {
        if (!grandTotal.monthly[month]) {
          grandTotal.monthly[month] = 0;
        }
        grandTotal.monthly[month] += cost;
      }
    }

    // Generate months list for the year
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
