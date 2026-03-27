import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { calculateSSS, calculatePhilHealth, calculatePagIbig } from '@/lib/payroll-utils';

// GET payrolls
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const periodId = searchParams.get('periodId');
    const employeeId = searchParams.get('employeeId');

    const where: any = {};
    if (periodId) {
      where.payrollPeriodId = periodId;
    }
    if (employeeId) {
      where.employeeId = employeeId;
    }

    // Non-admin/HR users can only see their own payrolls
    const role = (session.user as any).role;
    if (!['ADMIN', 'HR'].includes(role)) {
      const userEmployeeId = (session.user as any).employeeId;
      if (userEmployeeId) {
        where.employeeId = userEmployeeId;
      }
    }

    const payrolls = await prisma.payroll.findMany({
      where,
      include: {
        payrollPeriod: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch employee details
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
    if (!session || !['ADMIN', 'HR'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { periodId } = body;

    // Get the payroll period
    const period = await prisma.payrollPeriod.findUnique({ where: { id: periodId } });
    if (!period) {
      return NextResponse.json({ error: 'Payroll period not found' }, { status: 404 });
    }

    // Check if attendance is locked before generating payroll
    if (!period.isLocked) {
      return NextResponse.json({ 
        error: 'Attendance must be locked before generating payroll. Please lock attendance first.' 
      }, { status: 400 });
    }

    // Get all active employees
    const employees = await prisma.employee.findMany({
      where: { isActive: true },
    });

    const isFirstHalf = period.periodType === 'FIRST_HALF';
    const payrolls = [];

    for (const employee of employees) {
      // Get attendance for the period
      const attendances = await prisma.attendance.findMany({
        where: {
          employeeId: employee.id,
          date: {
            gte: period.startDate,
            lte: period.endDate,
          },
        },
      });

      // Calculate totals from attendance
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

      // Get employee allowances
      const allowances = await prisma.employeeAllowance.findMany({
        where: {
          employeeId: employee.id,
          isActive: true,
          effectiveFrom: { lte: period.endDate },
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gte: period.startDate } },
          ],
        },
        include: { allowanceType: true },
      });

      let mobileAllowance = 0;
      let performancePay = 0;
      let otherAllowances = 0;

      for (const allowance of allowances) {
        const amount = allowance.frequency === 'MONTHLY' ? allowance.amount / 2 : allowance.amount;
        if (allowance.allowanceType.name.toLowerCase().includes('mobile') || 
            allowance.allowanceType.name.toLowerCase().includes('load')) {
          mobileAllowance += amount;
        } else if (allowance.allowanceType.name.toLowerCase().includes('performance')) {
          performancePay += amount;
        } else {
          otherAllowances += amount;
        }
      }

      // Get ALL active payroll adjustments for this employee
      // Adjustments with payrollCutoff format: "YYYY-MM-DD_YYYY-MM-DD"
      // Match: no cutoff (applies to all), or cutoff overlaps with period dates
      const allAdjustments = await prisma.payrollAdjustment.findMany({
        where: {
          employeeId: employee.id,
          isActive: true,
        },
      });

      let adjustmentTotal = 0;
      const periodStart = period.startDate.getTime();
      const periodEnd = period.endDate.getTime();

      for (const adj of allAdjustments) {
        if (!adj.payrollCutoff || adj.payrollCutoff.trim() === '') {
          // No specific cutoff → applies to any period
          adjustmentTotal += adj.amount;
        } else {
          // Parse cutoff: "YYYY-MM-DD_YYYY-MM-DD"
          const parts = adj.payrollCutoff.split('_');
          if (parts.length === 2) {
            const adjStart = new Date(parts[0]).getTime();
            const adjEnd = new Date(parts[1]).getTime();
            // Check overlap: adjustment range overlaps with period range
            if (adjStart <= periodEnd && adjEnd >= periodStart) {
              adjustmentTotal += adj.amount;
            }
          }
        }
      }

      // Get active loans for deduction (must be isActive AND status APPROVED/ACTIVE)
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
        const deduction = loan.monthlyDeduction / 2; // Semi-monthly
        if (loan.loanType.name.toLowerCase().includes('salary')) {
          salaryLoanDeduction += deduction;
        } else if (loan.loanType.name.toLowerCase().includes('computer') || 
                   loan.loanType.name.toLowerCase().includes('laptop')) {
          computerLoanDeduction += deduction;
        } else {
          otherLoanDeductions += deduction;
        }
      }

      // Use employee's actual basic salary from employee record
      const basicMonthlySalary = employee.basicSalary || 0;
      const workDaysPerMonth = 22;
      const dailyRate = basicMonthlySalary / workDaysPerMonth;
      const hourlyRate = dailyRate / 8;

      // Calculate basic pay - FIXED semi-monthly basic salary (half of monthly)
      const daysWorked = totalHours / 8;
      const basicPay = basicMonthlySalary / 2; // Fixed semi-monthly basic

      // Calculate overtime pay (125%)
      const overtimePay = (overtimeMinutes / 60) * hourlyRate * 1.25;

      // Calculate holiday pay
      let holidayPay = 0;
      if (holidayType === 'REGULAR') {
        holidayPay = (holidayHours / 8) * dailyRate; // Additional 100% for regular holiday
      } else if (holidayType === 'SPECIAL') {
        holidayPay = (holidayHours / 8) * dailyRate * 0.3; // Additional 30% for special
      }

      // Calculate night differential (10%)
      const nightDiffPay = ((nightDiffMinutes + nightDiffOTMinutes) / 60) * hourlyRate * 0.10;

      // Total Gross Pay = Basic Pay + Allowances + OT/Holiday/NightDiff (NO adjustments, NO employer share)
      const grossEarnings = basicPay + overtimePay + holidayPay + nightDiffPay +
                           mobileAllowance + performancePay + otherAllowances;

      // Monthly gross for employer contribution basis = actual total gross of BOTH cutoffs in the month
      let monthlyGross = grossEarnings * 2; // default fallback: double current half
      if (!isFirstHalf) {
        // Look up actual 1st half payroll for the same employee, month, year
        const firstHalfPeriod = await prisma.payrollPeriod.findUnique({
          where: { periodType_month_year: { periodType: 'FIRST_HALF', month: period.month, year: period.year } },
        });
        if (firstHalfPeriod) {
          const firstHalfPayroll = await prisma.payroll.findUnique({
            where: { payrollPeriodId_employeeId: { payrollPeriodId: firstHalfPeriod.id, employeeId: employee.id } },
          });
          if (firstHalfPayroll) {
            monthlyGross = firstHalfPayroll.grossEarnings + grossEarnings;
          }
        }
      } else {
        // For 1st half, check if 2nd half already exists (re-generation scenario)
        const secondHalfPeriod = await prisma.payrollPeriod.findUnique({
          where: { periodType_month_year: { periodType: 'SECOND_HALF', month: period.month, year: period.year } },
        });
        if (secondHalfPeriod) {
          const secondHalfPayroll = await prisma.payroll.findUnique({
            where: { payrollPeriodId_employeeId: { payrollPeriodId: secondHalfPeriod.id, employeeId: employee.id } },
          });
          if (secondHalfPayroll) {
            monthlyGross = grossEarnings + secondHalfPayroll.grossEarnings;
          }
        }
      }

      // Government contributions calculation (based on actual monthly gross of both cutoffs)
      const sss = calculateSSS(monthlyGross);
      const philHealth = calculatePhilHealth(monthlyGross);
      const pagIbig = calculatePagIbig(monthlyGross);

      // NO employee deductions - company handles all contributions
      const sssContribution = 0;
      const philHealthContribution = 0;
      const pagIbigContribution = 0;
      
      // Employer share - added on 2nd cutoff ONLY
      let employerSSS = 0;
      let employerPhilHealth = 0;
      let employerPagIbig = 0;

      if (!isFirstHalf) {
        employerSSS = sss.employer;
        employerPhilHealth = philHealth.employer;
        employerPagIbig = pagIbig.employer;
      }

      // Deductions (loans only - no government deductions since company shoulders them)
      const withholdingTax = 0;
      const totalDeductions = sssContribution + philHealthContribution + pagIbigContribution +
                             salaryLoanDeduction + computerLoanDeduction +
                             otherLoanDeductions;

      // Net Pay = Total Gross + Adjustments + Employer Share - Deductions
      const netPay = grossEarnings + adjustmentTotal +
                     employerSSS + employerPhilHealth + employerPagIbig -
                     totalDeductions;

      // Create or update payroll record
      const payroll = await prisma.payroll.upsert({
        where: {
          payrollPeriodId_employeeId: {
            payrollPeriodId: periodId,
            employeeId: employee.id,
          },
        },
        update: {
          basicSalary: basicMonthlySalary,
          dailyRate,
          hourlyRate,
          daysWorked,
          hoursWorked: totalHours,
          basicPay,
          overtimePay,
          holidayPay,
          nightDiffPay,
          mobileAllowance,
          performancePay,
          otherAllowances,
          adjustmentTotal,
          employerSSS,
          employerPhilHealth,
          employerPagIbig,
          sssContribution,
          philHealthContribution,
          pagIbigContribution,
          withholdingTax,
          salaryLoanDeduction,
          computerLoanDeduction,
          otherLoanDeductions,
          grossEarnings,
          totalDeductions,
          netPay,
          status: 'PROCESSING',
        },
        create: {
          payrollPeriodId: periodId,
          employeeId: employee.id,
          basicSalary: basicMonthlySalary,
          dailyRate,
          hourlyRate,
          daysWorked,
          hoursWorked: totalHours,
          basicPay,
          overtimePay,
          holidayPay,
          nightDiffPay,
          mobileAllowance,
          performancePay,
          otherAllowances,
          adjustmentTotal,
          employerSSS,
          employerPhilHealth,
          employerPagIbig,
          sssContribution,
          philHealthContribution,
          pagIbigContribution,
          withholdingTax,
          salaryLoanDeduction,
          computerLoanDeduction,
          otherLoanDeductions,
          grossEarnings,
          totalDeductions,
          netPay,
          status: 'PROCESSING',
        },
      });

      payrolls.push(payroll);
    }

    // Update period status
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
    if (!session || !['ADMIN', 'HR'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    // Recalculate totals if earnings/deductions changed
    const payroll = await prisma.payroll.findUnique({ where: { id } });
    if (!payroll) {
      return NextResponse.json({ error: 'Payroll not found' }, { status: 404 });
    }

    const merged = { ...payroll, ...updateData };

    // Total Gross = Basic + Allowances + OT/Holiday/NightDiff (NO adjustments, NO employer share)
    const grossEarnings = 
      merged.basicPay + merged.overtimePay + merged.holidayPay + merged.nightDiffPay +
      merged.restDayPay + merged.mobileAllowance + merged.performancePay + 
      merged.otherAllowances;

    const totalDeductions = 
      merged.sssContribution + merged.philHealthContribution + merged.pagIbigContribution +
      merged.salaryLoanDeduction + merged.computerLoanDeduction +
      merged.otherLoanDeductions + merged.otherDeductions;

    // Net Pay = Total Gross + Adjustments + Employer Share - Deductions
    const netPay = grossEarnings + (merged.adjustmentTotal || 0) +
      merged.employerSSS + merged.employerPhilHealth + merged.employerPagIbig -
      totalDeductions;

    const updated = await prisma.payroll.update({
      where: { id },
      data: {
        ...updateData,
        grossEarnings,
        totalDeductions,
        netPay,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating payroll:', error);
    return NextResponse.json({ error: 'Failed to update payroll' }, { status: 500 });
  }
}
