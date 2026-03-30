import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { generatePayslipHTML } from '@/lib/payslip-generator';
import { uploadPayslipToS3 } from '@/lib/s3';
import { getCompanyContext } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

// GET payroll periods
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ctx = await getCompanyContext();

    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    const where: any = {};
    if (year) where.year = parseInt(year);
    if (month) where.month = parseInt(month);

    // Tenant isolation
    if (ctx?.companyId) {
      where.companyId = ctx.companyId;
    }

    const periods = await prisma.payrollPeriod.findMany({
      where,
      include: {
        _count: { select: { payrolls: true } },
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
        { periodType: 'desc' },
      ],
    });

    return NextResponse.json(periods);
  } catch (error) {
    console.error('Error fetching payroll periods:', error);
    return NextResponse.json({ error: 'Failed to fetch payroll periods' }, { status: 500 });
  }
}

// POST create payroll period
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'HR', 'SUPER_ADMIN'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ctx = await getCompanyContext();

    const body = await request.json();
    const { month, year, periodType } = body;

    const m = parseInt(month);
    const y = parseInt(year);

    // Fetch cutoff settings - company-specific or global
    const settingsWhere: any = {
      key: {
        in: ['payroll_cutoff_1_start', 'payroll_cutoff_1_end', 'payroll_cutoff_2_start', 'payroll_cutoff_2_end']
      }
    };

    const settings = await prisma.systemSettings.findMany({ where: settingsWhere });
    
    const settingsMap: Record<string, string> = {};
    settings.forEach(s => { settingsMap[s.key] = s.value; });
    
    const cutoff1Start = parseInt(settingsMap.payroll_cutoff_1_start || '27');
    const cutoff1End = parseInt(settingsMap.payroll_cutoff_1_end || '10');
    const cutoff2Start = parseInt(settingsMap.payroll_cutoff_2_start || '11');
    const cutoff2End = parseInt(settingsMap.payroll_cutoff_2_end || '25');

    let startDate: Date;
    let endDate: Date;
    let cutoffDate: Date;
    let payDate: Date;

    if (periodType === 'FIRST_HALF') {
      const prevMonth = m === 1 ? 12 : m - 1;
      const prevYear = m === 1 ? y - 1 : y;
      startDate = new Date(prevYear, prevMonth - 1, cutoff1Start);
      endDate = new Date(y, m - 1, cutoff1End);
      cutoffDate = new Date(y, m - 1, cutoff1End);
      payDate = new Date(y, m - 1, 15);
    } else if (periodType === 'SECOND_HALF') {
      startDate = new Date(y, m - 1, cutoff2Start);
      endDate = new Date(y, m - 1, cutoff2End);
      cutoffDate = new Date(y, m - 1, cutoff2End);
      const lastDay = new Date(y, m, 0).getDate();
      payDate = new Date(y, m - 1, Math.min(30, lastDay));
    } else if (periodType === 'MONTHLY') {
      startDate = new Date(y, m - 1, 1);
      const lastDay = new Date(y, m, 0).getDate();
      endDate = new Date(y, m - 1, lastDay);
      cutoffDate = new Date(y, m - 1, lastDay);
      payDate = new Date(y, m - 1, Math.min(30, lastDay));
    } else if (periodType === 'BI_WEEKLY') {
      const biWeekStart = body.startDay ? parseInt(body.startDay) : 1;
      startDate = new Date(y, m - 1, biWeekStart);
      endDate = new Date(y, m - 1, biWeekStart + 13);
      cutoffDate = new Date(y, m - 1, biWeekStart + 13);
      payDate = new Date(y, m - 1, biWeekStart + 14);
    } else {
      startDate = new Date(y, m - 1, 1);
      endDate = new Date(y, m - 1, 15);
      cutoffDate = new Date(y, m - 1, 15);
      payDate = new Date(y, m - 1, 20);
    }

    const period = await prisma.payrollPeriod.create({
      data: {
        periodType,
        month: m,
        year: y,
        startDate,
        endDate,
        cutoffDate,
        payDate,
        status: 'DRAFT',
        companyId: ctx?.companyId || null,
      },
    });

    return NextResponse.json(period, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Payroll period already exists' }, { status: 400 });
    }
    console.error('Error creating payroll period:', error);
    return NextResponse.json({ error: 'Failed to create payroll period' }, { status: 500 });
  }
}

// PUT update payroll period status
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'HR', 'SUPER_ADMIN'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, notes, isLocked } = body;

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (isLocked !== undefined) updateData.isLocked = isLocked;

    if (status === 'APPROVED') {
      updateData.approvedAt = new Date();
      await prisma.payroll.updateMany({
        where: { payrollPeriodId: id },
        data: { status: 'APPROVED' },
      });
    } else if (status === 'PAID') {
      const period = await prisma.payrollPeriod.findUnique({ where: { id } });
      if (!period) {
        return NextResponse.json({ error: 'Period not found' }, { status: 404 });
      }

      const payrolls = await prisma.payroll.findMany({
        where: { payrollPeriodId: id },
        include: {
          employee: {
            include: {
              department: true,
              role: true,
              user: true,
            },
          },
        },
      });

      for (const payroll of payrolls) {
        try {
          const payslipHTML = generatePayslipHTML(payroll, period);
          const fileName = `Payslip_${period.periodType}_${period.month}_${period.year}_${payroll.employee.employeeId}.html`;
          const cloudStoragePath = await uploadPayslipToS3(payslipHTML, fileName);
          
          await prisma.document.create({
            data: {
              employeeId: payroll.employeeId,
              name: fileName,
              type: 'payslip',
              cloudStoragePath,
              size: Buffer.byteLength(payslipHTML, 'utf8'),
            },
          });

          if (payroll.employee.user) {
            const periodLabel = period.periodType === 'FIRST_HALF' 
              ? `1st Half (${getMonthName(period.month)} ${period.year})`
              : `2nd Half (${getMonthName(period.month)} ${period.year})`;
            
            await prisma.notification.create({
              data: {
                userId: payroll.employee.user.id,
                title: 'Payslip Available',
                message: `Your payslip for ${periodLabel} is now available. Net Pay: ₱${payroll.netPay.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
                type: 'PAYROLL',
                link: `/employees/${payroll.employeeId}`,
              },
            });
          }

          const totalLoanDeduction = payroll.salaryLoanDeduction + 
                                     payroll.computerLoanDeduction + 
                                     payroll.otherLoanDeductions;

          if (totalLoanDeduction > 0) {
            const loans = await prisma.employeeLoan.findMany({
              where: {
                employeeId: payroll.employeeId,
                status: { in: ['APPROVED', 'ACTIVE'] },
              },
              include: { loanType: true },
            });

            for (const loan of loans) {
              let deductionAmount = 0;
              if (loan.loanType.name.toLowerCase().includes('salary')) {
                deductionAmount = payroll.salaryLoanDeduction;
              } else if (loan.loanType.name.toLowerCase().includes('computer')) {
                deductionAmount = payroll.computerLoanDeduction;
              }

              if (deductionAmount > 0 && loan.remainingBalance > 0) {
                const actualPayment = Math.min(deductionAmount, loan.remainingBalance);
                
                await prisma.loanPayment.create({
                  data: {
                    employeeLoanId: loan.id,
                    payrollPeriodId: id,
                    amount: actualPayment,
                    paymentDate: new Date(),
                    notes: 'Auto-deducted from payroll',
                  },
                });

                await prisma.employeeLoan.update({
                  where: { id: loan.id },
                  data: {
                    amountPaid: loan.amountPaid + actualPayment,
                    remainingBalance: loan.remainingBalance - actualPayment,
                    status: loan.remainingBalance - actualPayment <= 0 ? 'FULLY_PAID' : 'ACTIVE',
                  },
                });
              }
            }
          }
        } catch (payrollError) {
          console.error(`Error processing payroll for employee ${payroll.employeeId}:`, payrollError);
        }
      }

      await prisma.payroll.updateMany({
        where: { payrollPeriodId: id },
        data: { status: 'PAID' },
      });
    }

    const period = await prisma.payrollPeriod.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(period);
  } catch (error) {
    console.error('Error updating payroll period:', error);
    return NextResponse.json({ error: 'Failed to update payroll period' }, { status: 500 });
  }
}

// DELETE payroll period (only if draft)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    const period = await prisma.payrollPeriod.findUnique({ where: { id } });
    if (!period) {
      return NextResponse.json({ error: 'Period not found' }, { status: 404 });
    }

    if (period.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Can only delete draft periods' }, { status: 400 });
    }

    await prisma.payrollPeriod.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting payroll period:', error);
    return NextResponse.json({ error: 'Failed to delete payroll period' }, { status: 500 });
  }
}

function getMonthName(month: number): string {
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
  return months[month - 1] || '';
}
