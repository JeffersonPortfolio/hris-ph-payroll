import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { generateAmortizationSchedule } from '@/lib/loan-utils';

// GET employee loans
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const status = searchParams.get('status');

    const where: any = {};
    if (employeeId) {
      where.employeeId = employeeId;
    }
    if (status) {
      where.status = status;
    }

    const employeeLoans = await prisma.employeeLoan.findMany({
      where,
      include: {
        loanType: true,
        payments: {
          orderBy: { cutoffStart: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch employee details including department and role
    const employeeIds = [...new Set(employeeLoans.map(el => el.employeeId))];
    const employees = await prisma.employee.findMany({
      where: { id: { in: employeeIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeId: true,
        department: { select: { name: true } },
        role: { select: { name: true } },
      },
    });

    const employeeMap = new Map(employees.map(e => [e.id, e]));

    const result = employeeLoans.map(el => ({
      ...el,
      employee: employeeMap.get(el.employeeId),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching employee loans:', error);
    return NextResponse.json({ error: 'Failed to fetch employee loans' }, { status: 500 });
  }
}

// POST create employee loan with amortization schedule
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'HR'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      employeeId,
      loanTypeId,
      principalAmount,
      termMonths,
      startDate,
      notes,
      applicationDate,
      loanDate,
      referenceNumber,
      firstAmortizationDate,
      payrollCutoff,
      remarks,
    } = body;

    // Get loan type for interest rate
    const loanType = await prisma.loanType.findUnique({ where: { id: loanTypeId } });
    if (!loanType) {
      return NextResponse.json({ error: 'Loan type not found' }, { status: 404 });
    }

    const principal = parseFloat(principalAmount);
    const term = parseInt(termMonths);

    // Calculate simple interest
    const interestAmount = principal * (loanType.interestRate / 100) * (term / 12);
    const totalAmount = principal + interestAmount;
    const monthlyDeduction = totalAmount / term;

    // Calculate end date
    const start = new Date(startDate);
    const end = new Date(start);
    end.setMonth(end.getMonth() + term);

    // Parse first amortization date (defaults to startDate if not provided)
    const amortStart = firstAmortizationDate ? new Date(firstAmortizationDate) : start;

    // Generate amortization schedule
    const { periods, perPayAmount } = generateAmortizationSchedule(totalAmount, term, amortStart);

    // Adjust last period to handle rounding
    const regularTotal = perPayAmount * (periods.length - 1);
    const lastAmount = Math.round((totalAmount - regularTotal) * 100) / 100;

    const employeeLoan = await prisma.employeeLoan.create({
      data: {
        employeeId,
        loanTypeId,
        principalAmount: principal,
        interestAmount,
        totalAmount,
        monthlyDeduction,
        termMonths: term,
        startDate: start,
        endDate: end,
        remainingBalance: totalAmount,
        status: 'ACTIVE',
        approvedAt: new Date(),
        notes,
        applicationDate: applicationDate ? new Date(applicationDate) : null,
        loanDate: loanDate ? new Date(loanDate) : null,
        referenceNumber: referenceNumber || null,
        firstAmortizationDate: amortStart,
        payrollCutoff: payrollCutoff || null,
        remarks: remarks || null,
        isActive: true,
        payments: {
          create: periods.map((p, idx) => ({
            amount: idx === periods.length - 1 ? lastAmount : perPayAmount,
            paymentDate: p.end,
            cutoffLabel: p.label,
            cutoffStart: p.start,
            cutoffEnd: p.end,
            paymentStatus: 'UNPAID' as const,
          })),
        },
      },
      include: {
        loanType: true,
        payments: { orderBy: { cutoffStart: 'asc' } },
      },
    });

    return NextResponse.json(employeeLoan, { status: 201 });
  } catch (error) {
    console.error('Error creating employee loan:', error);
    return NextResponse.json({ error: 'Failed to create employee loan' }, { status: 500 });
  }
}

// PUT update employee loan status
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'HR'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, notes } = body;

    const employeeLoan = await prisma.employeeLoan.update({
      where: { id },
      data: {
        status,
        notes,
        ...(status === 'APPROVED' ? { approvedAt: new Date() } : {}),
      },
      include: {
        loanType: true,
      },
    });

    return NextResponse.json(employeeLoan);
  } catch (error) {
    console.error('Error updating employee loan:', error);
    return NextResponse.json({ error: 'Failed to update employee loan' }, { status: 500 });
  }
}

// Record loan payment
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'HR'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { loanId, amount, paymentDate, payrollPeriodId, notes } = body;

    // Get current loan
    const loan = await prisma.employeeLoan.findUnique({ where: { id: loanId } });
    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    const paymentAmount = parseFloat(amount);
    const newAmountPaid = loan.amountPaid + paymentAmount;
    const newRemainingBalance = loan.remainingBalance - paymentAmount;

    // Create payment record and update loan
    const [payment, updatedLoan] = await prisma.$transaction([
      prisma.loanPayment.create({
        data: {
          employeeLoanId: loanId,
          payrollPeriodId,
          amount: paymentAmount,
          paymentDate: new Date(paymentDate),
          notes,
        },
      }),
      prisma.employeeLoan.update({
        where: { id: loanId },
        data: {
          amountPaid: newAmountPaid,
          remainingBalance: Math.max(0, newRemainingBalance),
          status: newRemainingBalance <= 0 ? 'FULLY_PAID' : 'ACTIVE',
        },
      }),
    ]);

    return NextResponse.json({ payment, loan: updatedLoan });
  } catch (error) {
    console.error('Error recording loan payment:', error);
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 });
  }
}
