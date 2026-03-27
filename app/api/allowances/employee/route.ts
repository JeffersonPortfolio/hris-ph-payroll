import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

// GET employee allowances
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');

    const where: any = {};
    if (employeeId) {
      where.employeeId = employeeId;
    }

    const employeeAllowances = await prisma.employeeAllowance.findMany({
      where,
      include: {
        allowanceType: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch employee details separately
    const employeeIds = [...new Set(employeeAllowances.map(ea => ea.employeeId))];
    const employees = await prisma.employee.findMany({
      where: { id: { in: employeeIds } },
      select: { id: true, firstName: true, lastName: true, employeeId: true, department: { select: { id: true, name: true } } },
    });

    const employeeMap = new Map(employees.map(e => [e.id, e]));

    const result = employeeAllowances.map(ea => ({
      ...ea,
      employee: employeeMap.get(ea.employeeId),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching employee allowances:', error);
    return NextResponse.json({ error: 'Failed to fetch employee allowances' }, { status: 500 });
  }
}

// POST assign allowance to employee(s) — supports bulk
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'HR'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Bulk assignment: array of { employeeId, amount }
    if (body.assignments && Array.isArray(body.assignments)) {
      const { allowanceTypeId, frequency, effectiveFrom, effectiveTo, payrollCutoff, prorated, proratedBy, assignments } = body;
      const results = [];
      for (const a of assignments) {
        if (!a.employeeId || !a.amount) continue;
        const ea = await prisma.employeeAllowance.create({
          data: {
            employeeId: a.employeeId,
            allowanceTypeId,
            amount: parseFloat(a.amount),
            frequency: frequency || 'MONTHLY',
            effectiveFrom: new Date(effectiveFrom),
            effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
          },
          include: { allowanceType: true },
        });
        results.push(ea);
      }
      return NextResponse.json(results, { status: 201 });
    }

    // Single assignment (backward compatible)
    const { employeeId, allowanceTypeId, amount, frequency, effectiveFrom, effectiveTo } = body;

    const employeeAllowance = await prisma.employeeAllowance.create({
      data: {
        employeeId,
        allowanceTypeId,
        amount: parseFloat(amount),
        frequency: frequency || 'MONTHLY',
        effectiveFrom: new Date(effectiveFrom),
        effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
      },
      include: {
        allowanceType: true,
      },
    });

    return NextResponse.json(employeeAllowance, { status: 201 });
  } catch (error) {
    console.error('Error assigning allowance:', error);
    return NextResponse.json({ error: 'Failed to assign allowance' }, { status: 500 });
  }
}

// PUT update employee allowance
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'HR'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, amount, frequency, effectiveFrom, effectiveTo, isActive } = body;

    const employeeAllowance = await prisma.employeeAllowance.update({
      where: { id },
      data: {
        amount: parseFloat(amount),
        frequency,
        effectiveFrom: new Date(effectiveFrom),
        effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
        isActive,
      },
      include: {
        allowanceType: true,
      },
    });

    return NextResponse.json(employeeAllowance);
  } catch (error) {
    console.error('Error updating employee allowance:', error);
    return NextResponse.json({ error: 'Failed to update employee allowance' }, { status: 500 });
  }
}

// DELETE employee allowance
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'HR'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    await prisma.employeeAllowance.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting employee allowance:', error);
    return NextResponse.json({ error: 'Failed to delete employee allowance' }, { status: 500 });
  }
}
