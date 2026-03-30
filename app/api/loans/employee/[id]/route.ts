import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { getCompanyContext } from '@/lib/tenant';

// GET single loan detail
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ctx = await getCompanyContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const loan = await prisma.employeeLoan.findUnique({
      where: { id: params.id },
      include: {
        loanType: true,
        payments: {
          orderBy: { cutoffStart: 'asc' },
        },
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
            employeeId: true,
            email: true,
            companyId: true,
            department: { select: { name: true } },
            role: { select: { name: true } },
          },
        },
      },
    });

    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    // Verify company access
    if (ctx.companyId && loan.employee?.companyId !== ctx.companyId) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    return NextResponse.json(loan);
  } catch (error) {
    console.error('Error fetching loan detail:', error);
    return NextResponse.json({ error: 'Failed to fetch loan detail' }, { status: 500 });
  }
}

// PUT update loan details
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'HR', 'SUPER_ADMIN'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ctx = await getCompanyContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    if (ctx.companyId) {
      const existing = await prisma.employeeLoan.findFirst({
        where: { id: params.id, employee: { companyId: ctx.companyId } },
      });
      if (!existing) {
        return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
      }
    }

    const body = await request.json();
    const { applicationDate, loanDate, referenceNumber, firstAmortizationDate, payrollCutoff, remarks, notes } = body;

    const loan = await prisma.employeeLoan.update({
      where: { id: params.id },
      data: {
        applicationDate: applicationDate ? new Date(applicationDate) : undefined,
        loanDate: loanDate ? new Date(loanDate) : undefined,
        referenceNumber: referenceNumber !== undefined ? referenceNumber : undefined,
        firstAmortizationDate: firstAmortizationDate ? new Date(firstAmortizationDate) : undefined,
        payrollCutoff: payrollCutoff !== undefined ? payrollCutoff : undefined,
        remarks: remarks !== undefined ? remarks : undefined,
        notes: notes !== undefined ? notes : undefined,
      },
      include: {
        loanType: true,
        payments: { orderBy: { cutoffStart: 'asc' } },
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
            department: { select: { name: true } },
            role: { select: { name: true } },
          },
        },
      },
    });

    return NextResponse.json(loan);
  } catch (error) {
    console.error('Error updating loan:', error);
    return NextResponse.json({ error: 'Failed to update loan' }, { status: 500 });
  }
}

// PATCH - toggle active, update payment amounts, mark payment status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'HR', 'SUPER_ADMIN'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ctx = await getCompanyContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    if (ctx.companyId) {
      const existing = await prisma.employeeLoan.findFirst({
        where: { id: params.id, employee: { companyId: ctx.companyId } },
      });
      if (!existing) {
        return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
      }
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'toggleActive') {
      const loan = await prisma.employeeLoan.findUnique({ where: { id: params.id } });
      if (!loan) return NextResponse.json({ error: 'Not found' }, { status: 404 });

      const updated = await prisma.employeeLoan.update({
        where: { id: params.id },
        data: { isActive: !loan.isActive },
      });
      return NextResponse.json(updated);
    }

    if (action === 'updateAmounts') {
      const { payments } = body;
      if (!payments || !Array.isArray(payments)) {
        return NextResponse.json({ error: 'Invalid payments data' }, { status: 400 });
      }

      await prisma.$transaction(
        payments.map((p: { id: string; amount: number }) =>
          prisma.loanPayment.update({
            where: { id: p.id },
            data: { amount: p.amount },
          })
        )
      );

      const allPayments = await prisma.loanPayment.findMany({
        where: { employeeLoanId: params.id },
      });
      const newTotal = allPayments.reduce((s, p) => s + p.amount, 0);
      const paidPayments = allPayments.filter(p => p.paymentStatus === 'PAID');
      const newPaid = paidPayments.reduce((s, p) => s + p.amount, 0);

      await prisma.employeeLoan.update({
        where: { id: params.id },
        data: {
          totalAmount: newTotal,
          remainingBalance: newTotal - newPaid,
          amountPaid: newPaid,
        },
      });

      return NextResponse.json({ success: true });
    }

    if (action === 'markPaid') {
      const { paymentId } = body;
      const payment = await prisma.loanPayment.findUnique({ where: { id: paymentId } });
      if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });

      const newStatus = payment.paymentStatus === 'PAID' ? 'UNPAID' : 'PAID';
      const amountDiff = newStatus === 'PAID' ? payment.amount : -payment.amount;

      await prisma.$transaction([
        prisma.loanPayment.update({
          where: { id: paymentId },
          data: { paymentStatus: newStatus },
        }),
        prisma.employeeLoan.update({
          where: { id: params.id },
          data: {
            amountPaid: { increment: amountDiff },
            remainingBalance: { decrement: amountDiff },
          },
        }),
      ]);

      const loan = await prisma.employeeLoan.findUnique({ where: { id: params.id } });
      if (loan && loan.remainingBalance <= 0) {
        await prisma.employeeLoan.update({
          where: { id: params.id },
          data: { status: 'FULLY_PAID' },
        });
      } else if (loan && loan.status === 'FULLY_PAID' && loan.remainingBalance > 0) {
        await prisma.employeeLoan.update({
          where: { id: params.id },
          data: { status: 'ACTIVE' },
        });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error patching loan:', error);
    return NextResponse.json({ error: 'Failed to update loan' }, { status: 500 });
  }
}
