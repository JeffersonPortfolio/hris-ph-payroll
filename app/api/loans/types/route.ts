import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { getCompanyContext } from '@/lib/tenant';

// GET all loan types
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ctx = await getCompanyContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Show company-specific + global loan types
    const where: any = {};
    if (ctx.companyId) {
      where.OR = [
        { companyId: ctx.companyId },
        { companyId: null },
      ];
    }

    const loanTypes = await prisma.loanType.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { employeeLoans: true }
        }
      }
    });

    return NextResponse.json(loanTypes);
  } catch (error) {
    console.error('Error fetching loan types:', error);
    return NextResponse.json({ error: 'Failed to fetch loan types' }, { status: 500 });
  }
}

// POST create new loan type
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'HR', 'SUPER_ADMIN'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ctx = await getCompanyContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, maxAmount, maxTermMonths, interestRate } = body;

    const loanType = await prisma.loanType.create({
      data: {
        name,
        description,
        maxAmount: maxAmount ? parseFloat(maxAmount) : null,
        maxTermMonths: maxTermMonths ? parseInt(maxTermMonths) : null,
        interestRate: interestRate ? parseFloat(interestRate) : 0,
        companyId: ctx.companyId || null,
      },
    });

    return NextResponse.json(loanType, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Loan type already exists' }, { status: 400 });
    }
    console.error('Error creating loan type:', error);
    return NextResponse.json({ error: 'Failed to create loan type' }, { status: 500 });
  }
}

// PUT update loan type
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'HR', 'SUPER_ADMIN'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ctx = await getCompanyContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, description, maxAmount, maxTermMonths, interestRate, isActive } = body;

    // Verify ownership
    if (ctx.companyId) {
      const existing = await prisma.loanType.findFirst({
        where: { id, OR: [{ companyId: ctx.companyId }, { companyId: null }] },
      });
      if (!existing) {
        return NextResponse.json({ error: 'Loan type not found' }, { status: 404 });
      }
    }

    const loanType = await prisma.loanType.update({
      where: { id },
      data: {
        name,
        description,
        maxAmount: maxAmount ? parseFloat(maxAmount) : null,
        maxTermMonths: maxTermMonths ? parseInt(maxTermMonths) : null,
        interestRate: interestRate ? parseFloat(interestRate) : 0,
        isActive,
      },
    });

    return NextResponse.json(loanType);
  } catch (error) {
    console.error('Error updating loan type:', error);
    return NextResponse.json({ error: 'Failed to update loan type' }, { status: 500 });
  }
}

// DELETE loan type
export async function DELETE(request: NextRequest) {
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
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    // Verify ownership - only delete company-owned loan types
    if (ctx.companyId) {
      const existing = await prisma.loanType.findFirst({
        where: { id, companyId: ctx.companyId },
      });
      if (!existing) {
        return NextResponse.json({ error: 'Loan type not found' }, { status: 404 });
      }
    }

    await prisma.loanType.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting loan type:', error);
    return NextResponse.json({ error: 'Failed to delete loan type' }, { status: 500 });
  }
}
