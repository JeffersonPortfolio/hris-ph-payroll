import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { getCompanyContext } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

// GET adjustments
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
    const employeeId = searchParams.get('employeeId');
    const cutoff = searchParams.get('cutoff');

    const where: any = { isActive: true };
    if (employeeId) where.employeeId = employeeId;
    if (cutoff) where.payrollCutoff = cutoff;

    // Filter by company through employee relation
    if (ctx.companyId) {
      where.employee = { companyId: ctx.companyId };
    }

    const adjustments = await prisma.payrollAdjustment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Fetch employee details
    const employeeIds = [...new Set(adjustments.map(a => a.employeeId))];
    const employeeWhere: any = { id: { in: employeeIds } };
    if (ctx.companyId) employeeWhere.companyId = ctx.companyId;

    const employees = await prisma.employee.findMany({
      where: employeeWhere,
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        department: { select: { id: true, name: true } },
      },
    });

    const employeeMap = new Map(employees.map(e => [e.id, e]));

    const result = adjustments.map(a => ({
      ...a,
      employee: employeeMap.get(a.employeeId),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching adjustments:', error);
    return NextResponse.json({ error: 'Failed to fetch adjustments' }, { status: 500 });
  }
}

// POST create adjustment
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
    const { employeeId, adjustmentName, adjustmentType, amount, payrollCutoff, includeInGross, notes } = body;

    if (!employeeId || !adjustmentName || !amount) {
      return NextResponse.json({ error: 'Employee, adjustment name, and amount are required' }, { status: 400 });
    }

    // Verify employee belongs to same company
    if (ctx.companyId) {
      const employee = await prisma.employee.findFirst({
        where: { id: employeeId, companyId: ctx.companyId },
      });
      if (!employee) {
        return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
      }
    }

    const adjustment = await prisma.payrollAdjustment.create({
      data: {
        employeeId,
        adjustmentName,
        adjustmentType: adjustmentType || 'BONUS',
        amount: parseFloat(amount),
        payrollCutoff: payrollCutoff || null,
        includeInGross: includeInGross !== undefined ? includeInGross : true,
        addedById: (session.user as any).id || null,
        notes: notes || null,
      },
    });

    return NextResponse.json(adjustment, { status: 201 });
  } catch (error) {
    console.error('Error creating adjustment:', error);
    return NextResponse.json({ error: 'Failed to create adjustment' }, { status: 500 });
  }
}

// PUT update adjustment
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
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Adjustment ID required' }, { status: 400 });
    }

    // Verify adjustment belongs to company
    if (ctx.companyId) {
      const existing = await prisma.payrollAdjustment.findFirst({
        where: { id, employee: { companyId: ctx.companyId } },
      });
      if (!existing) {
        return NextResponse.json({ error: 'Adjustment not found' }, { status: 404 });
      }
    }

    if (updateData.amount) {
      updateData.amount = parseFloat(updateData.amount);
    }

    const adjustment = await prisma.payrollAdjustment.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(adjustment);
  } catch (error) {
    console.error('Error updating adjustment:', error);
    return NextResponse.json({ error: 'Failed to update adjustment' }, { status: 500 });
  }
}

// DELETE adjustment
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

    // Verify adjustment belongs to company
    if (ctx.companyId) {
      const existing = await prisma.payrollAdjustment.findFirst({
        where: { id, employee: { companyId: ctx.companyId } },
      });
      if (!existing) {
        return NextResponse.json({ error: 'Adjustment not found' }, { status: 404 });
      }
    }

    await prisma.payrollAdjustment.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting adjustment:', error);
    return NextResponse.json({ error: 'Failed to delete adjustment' }, { status: 500 });
  }
}
