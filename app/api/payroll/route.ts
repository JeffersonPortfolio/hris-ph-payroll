import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { calculateSSS, calculatePhilHealth, calculatePagIbig, calculateWithholdingTax } from '@/lib/payroll-utils';
import { getCompanyContext } from '@/lib/tenant';

// GET payrolls
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ctx = await getCompanyContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const periodId = searchParams.get('periodId');
    const employeeId = searchParams.get('employeeId');

    const where: any = {};
    if (periodId) where.payrollPeriodId = periodId;
    if (employeeId) where.employeeId = employeeId;

    // Tenant isolation via payroll period
    if (ctx.companyId) {
      where.payrollPeriod = { companyId: ctx.companyId };
    }

    if (!['ADMIN', 'HR', 'FINANCE', 'SUPER_ADMIN'].includes(ctx.role)) {
      if (ctx.employeeId) where.employeeId = ctx.employeeId;
    }

    const payrolls = await prisma.payroll.findMany({
      where,
      include: { payrollPeriod: true },
      orderBy: { createdAt: 'desc' },
    });

    const employeeIds = [...new Set(payrolls.map(p => p.employeeId))];
    const employees = await prisma.employee.findMany({
      where: { id: { in: employeeIds } },
      include: { department: true },
    });
    const employeeMap = new Map(employees.map(e => [e.id, e]));

    const result = payrolls.map(p => ({
      ...p,
      employee: employeeMap.get(p.employeeId),
    }));

    return NextResponse.json({ payrolls: result });
  } catch (error) {
    console.error('Error fetching payrolls:', error);
    return NextResponse.json({ error: 'Failed to fetch payrolls' }, { status: 500 });
  }
}

// POST generate payroll for a period
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'HR', 'SUPER_ADMIN'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ctx = await getCompanyContext();

    const body = await request.json();
    const { periodId } = body;

    const period = await prisma.payrollPeriod.findUnique({ where: { id: periodId } });
    if (!period) {
      return NextResponse.json({ error: 'Payroll period not found' }, { status: 404 });
    }

    if (!period.isLocked) {
      return NextResponse.json({
        error: 'Attendance must be locked before generating payroll. Please lock attendance first.'
      }, { status: 400 });
    }

    // Get employees filtered by company
    const empWhere: any = { isActive: true };
    if (ctx?.companyId) {
      empWhere.companyId = ctx.companyId;
    }
    const employees = await prisma.employee.findMany({ where: empWhere });

    const isFirstHalf = period.periodType === 'FIRST_HALF';
    const isSemiMonthly = ['FIRST_HALF', 'SECOND_HALF'].includes(period.periodType);
    const isMonthly = period.periodType === 'MONTHLY';
    const isBiWeekly = period.periodType === 'BI_WEEKLY';

    let payDivisor = 2; // semi-monthly
    if (isMonthly) payDivisor = 1;

    let wtPeriod: 'SEMI_MONTHLY' | 'MONTHLY' = 'SEMI_MONTHLY';
    if (isMonthly) wtPeriod = 'MONTHLY';

    const payrolls = [];

    for (const employee of employees) {
      const attendances = await prisma.attendance.findMany({
        where: {
          employeeId: employee.id,
          date: { gte: period.startDate, lte: period.endDate },
        },
      });

      let totalHours = 0;
      let overtimeMinutes = 0;
      let nightDiffMinutes = 0;
      let nightDiffOTMinutes = 0;
      let holidayHours = 0;
      let holidayType: string | null = null;

      for (const att of attendances) {
        totalHours += att.totalHours || 0;
        overtimeMinutes += att.overtimeMinutes || 0;
        nightDiffMinutes += att.nightDiffMinutes || 0;
        nightDiffOTMinutes += att.nightDiffOTMinutes || 0;
        if (att.isHoliday) {
          holidayHours += att.totalHours || 0;
          holidayType = att.holidayType;
        }
      }

      const allowances = await prisma.employeeAllowance.findMany({
        where: {
          employeeId: employee.id,
          isActive: true,
          effectiveFrom: { lte: period.endDate },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: period.startDate } }],
        },
        include: { allowanceType: true },
      });

      let mobileAllowance = 0;
      let performancePay = 0;
      let otherAllowances = 0;

      for (const allowance of allowances) {
        const amount = allowance.frequency === 'MONTHLY' ? allowance.amount / payDivisor : allowance.amount;
        if (allowance.allowanceType.name.toLowerCase().includes('mobile') ||
          allowance.allowanceType.name.toLowerCase().includes('load')) {
          mobileAllowance += amount;
        } else if (allowance.allowanceType.name.toLowerCase().includes('performance')) {
          performancePay += amount;
        } else {
          otherAllowances += amount;
        }
      }

      const allAdjustments = await prisma.payrollAdjustment.findMany({
        where: { employeeId: employee.id, isActive: true },
      });

      let adjustmentTotal = 0;
      let bonusPay = 0;
      const periodStart = period.startDate.getTime();
      const periodEnd = period.endDate.getTime();

      for (const adj of allAdjustments) {
        let applies = false;
        if (!adj.payrollCutoff || adj.payrollCutoff.trim() === '') {
          applies = true;
        } else {
          const parts = adj.payrollCutoff.split('_');
          if (parts.length === 2) {
            const adjStart = new Date(parts[0]).getTime();
            const adjEnd = new Date(parts[1]).getTime();
            if (adjStart <= periodEnd && adjEnd >= periodStart) applies = true;
          }
        }
        if (applies) {
          if (adj.adjustmentType === 'BONUS') {
            bonusPay += adj.amount;
          } else {
            adjustmentTotal += adj.amount;
          }
        }
      }

      const loans = await prisma.employeeLoan.findMany({
        where: {
          employeeId: employee.id,
          isActive: true,
          status: { in: ['APPROVED', 'ACTIVE'] },
          startDate: { lte: period.endDate },
        },
        include: { loanType: true },
      });

      let salaryLoanDeduction = 0;
      let computerLoanDeduction = 0;
      let otherLoanDeductions = 0;

      for (const loan of loans) {
        const deduction = loan.monthlyDeduction / payDivisor;
        if (loan.loanType.name.toLowerCase().includes('salary')) {
          salaryLoanDeduction += deduction;
        } else if (loan.loanType.name.toLowerCase().includes('computer') ||
          loan.loanType.name.toLowerCase().includes('laptop')) {
          computerLoanDeduction += deduction;
        } else {
          otherLoanDeductions += deduction;
        }
      }

      const basicMonthlySalary = employee.basicSalary || 0;
      const workDaysPerMonth = 22;
      const dailyRate = basicMonthlySalary / workDaysPerMonth;
      const hourlyRate = dailyRate / 8;
      const daysWorked = totalHours / 8;
      const basicPay = basicMonthlySalary / payDivisor;

      const overtimePay = (overtimeMinutes / 60) * hourlyRate * 1.25;

      let holidayPay = 0;
      if (holidayType === 'REGULAR') {
        holidayPay = (holidayHours / 8) * dailyRate;
      } else if (holidayType === 'SPECIAL') {
        holidayPay = (holidayHours / 8) * dailyRate * 0.3;
      }

      const nightDiffPay = ((nightDiffMinutes + nightDiffOTMinutes) / 60) * hourlyRate * 0.10;

      const grossEarnings = basicPay + overtimePay + holidayPay + nightDiffPay +
        bonusPay + mobileAllowance + performancePay + otherAllowances;

      const monthlyGross = grossEarnings * payDivisor;

      const sss = calculateSSS(monthlyGross);
      const philHealth = calculatePhilHealth(monthlyGross);
      const pagIbig = calculatePagIbig(monthlyGross);

      const sssContribution = Math.round(sss.employee / payDivisor * 100) / 100;
      const philHealthContribution = Math.round(philHealth.employee / payDivisor * 100) / 100;
      const pagIbigContribution = Math.round(pagIbig.employee / payDivisor * 100) / 100;

      const employerSSS = Math.round(sss.employer / payDivisor * 100) / 100;
      const employerPhilHealth = Math.round(philHealth.employer / payDivisor * 100) / 100;
      const employerPagIbig = Math.round(pagIbig.employer / payDivisor * 100) / 100;
      const employerEC = Math.round(sss.employerEC / payDivisor * 100) / 100;

      const taxableIncome = grossEarnings - sssContribution - philHealthContribution - pagIbigContribution;
      const withholdingTax = calculateWithholdingTax(taxableIncome, wtPeriod);

      const totalDeductions = sssContribution + philHealthContribution + pagIbigContribution +
        withholdingTax +
        salaryLoanDeduction + computerLoanDeduction + otherLoanDeductions;

      const netPay = grossEarnings + adjustmentTotal - totalDeductions;

      const payroll = await prisma.payroll.upsert({
        where: {
          payrollPeriodId_employeeId: {
            payrollPeriodId: periodId,
            employeeId: employee.id,
          },
        },
        update: {
          basicSalary: basicMonthlySalary, dailyRate, hourlyRate, daysWorked,
          hoursWorked: totalHours, basicPay, overtimePay, holidayPay, nightDiffPay,
          bonusPay, mobileAllowance, performancePay, otherAllowances, adjustmentTotal,
          employerSSS, employerPhilHealth, employerPagIbig, employerEC,
          sssContribution, philHealthContribution, pagIbigContribution,
          withholdingTax, taxableIncome,
          salaryLoanDeduction, computerLoanDeduction, otherLoanDeductions,
          grossEarnings, totalDeductions, netPay, status: 'PROCESSING',
        },
        create: {
          payrollPeriodId: periodId, employeeId: employee.id,
          basicSalary: basicMonthlySalary, dailyRate, hourlyRate, daysWorked,
          hoursWorked: totalHours, basicPay, overtimePay, holidayPay, nightDiffPay,
          bonusPay, mobileAllowance, performancePay, otherAllowances, adjustmentTotal,
          employerSSS, employerPhilHealth, employerPagIbig, employerEC,
          sssContribution, philHealthContribution, pagIbigContribution,
          withholdingTax, taxableIncome,
          salaryLoanDeduction, computerLoanDeduction, otherLoanDeductions,
          grossEarnings, totalDeductions, netPay, status: 'PROCESSING',
        },
      });

      payrolls.push(payroll);
    }

    await prisma.payrollPeriod.update({
      where: { id: periodId },
      data: { status: 'PROCESSING', processedAt: new Date() },
    });

    return NextResponse.json({ success: true, count: payrolls.length }, { status: 201 });
  } catch (error) {
    console.error('Error generating payroll:', error);
    return NextResponse.json({ error: 'Failed to generate payroll' }, { status: 500 });
  }
}

// PUT update payroll (for adjustments)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'HR', 'SUPER_ADMIN'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    const payroll = await prisma.payroll.findUnique({ where: { id } });
    if (!payroll) {
      return NextResponse.json({ error: 'Payroll not found' }, { status: 404 });
    }

    const merged = { ...payroll, ...updateData };

    const grossEarnings =
      merged.basicPay + merged.overtimePay + merged.holidayPay + merged.nightDiffPay +
      merged.restDayPay + (merged.bonusPay || 0) + merged.mobileAllowance + merged.performancePay +
      merged.otherAllowances;

    const totalDeductions =
      merged.sssContribution + merged.philHealthContribution + merged.pagIbigContribution +
      merged.withholdingTax +
      merged.salaryLoanDeduction + merged.computerLoanDeduction +
      merged.otherLoanDeductions + (merged.advancesDeduction || 0) + merged.otherDeductions;

    const netPay = grossEarnings + (merged.adjustmentTotal || 0) - totalDeductions;

    const updated = await prisma.payroll.update({
      where: { id },
      data: { ...updateData, grossEarnings, totalDeductions, netPay },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating payroll:', error);
    return NextResponse.json({ error: 'Failed to update payroll' }, { status: 500 });
  }
}
