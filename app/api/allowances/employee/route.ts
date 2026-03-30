import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { getCompanyContext } from '@/lib/tenant';

// GET employee allowances
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

    const where: any = {};
    if (employeeId) {
      where.employeeId = employeeId;
    }

    // Filter by company through employee relation
    if (ctx.companyId) {
      where.employee = { companyId: ctx.companyId };
    }

    const employeeAllowances = await prisma.employeeAllowance.findMany({
      where,
      include: {
        allowanceType: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch employee details
    const employeeIds = [...new Set(employeeAllowances.map(ea => ea.employeeId))];
    const employeeWhere: any = { id: { in: employeeIds } };
    if (ctx.companyId) employeeWhere.companyId = ctx.companyId;

    const employees = await prisma.employee.findMany({
      where: employeeWhere,
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
    if (!session || !['ADMIN', 'HR', 'SUPER_ADMIN'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ctx = await getCompanyContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Bulk assignment
    if (body.assignments && Array.isArray(body.assignments)) {
      const { allowanceTypeId, frequency, effectiveFrom, effectiveTo, assignments } = body;

      // Verify all employees belong to company
      if (ctx.companyId) {
        const empIds = assignments.map((a: any) => a.employeeId).filter(Boolean);
        const validEmployees = await prisma.employee.findMany({
          where: { id: { in: empIds }, companyId: ctx.companyId },
          select: { id: true },
        });
        const validIds = new Set(validEmployees.map(e => e.id));
        for (const a of assignments) {
          if (a.employeeId && !validIds.has(a.employeeId)) {
            return NextResponse.json({ error: `Employee ${a.employeeId} not found in your company` }, { status: 404 });
          }
        }
      }

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

    // Single assignment
    const { employeeId, allowanceTypeId, amount, frequency, effectiveFrom, effectiveTo } = body;

    // Verify employee belongs to company
    if (ctx.companyId) {
      const employee = await prisma.employee.findFirst({
        where: { id: employeeId, companyId: ctx.companyId },
      });
      if (!employee) {
        return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
      }
    }

    const employeeAllowance = await prisma.employeeAllowance.create({
      data: {
        employeeId,
        allowanceTypeId,
        amount: parseFloat(amount),
        frequency: frequency || 'MONTHLY',
        effectiveFrom: new Date(effectiveFrom),
        effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
      },
      include: { allowanceType: true },
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
    if (!session || !['ADMIN', 'HR', 'SUPER_ADMIN'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ctx = await getCompanyContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, amount, frequency, effectiveFrom, effectiveTo, isActive } = body;

    // Verify ownership through employee
    if (ctx.companyId) {
      const existing = await prisma.employeeAllowance.findFirst({
        where: { id, employee: { companyId: ctx.companyId } },
      });
      if (!existing) {
        return NextResponse.json({ error: 'Allowance not found' }, { status: 404 });
      }
    }

    const employeeAllowance = await prisma.employeeAllowance.update({
      where: { id },
      data: {
        amount: parseFloat(amount),
        frequency,
        effectiveFrom: new Date(effectiveFrom),
        effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
        isActive,
      },
      include: { allowanceType: true },
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

    // Verify ownership through employee
    if (ctx.companyId) {
      const existing = await prisma.employeeAllowance.findFirst({
        where: { id, employee: { companyId: ctx.companyId } },
      });
      if (!existing) {
        return NextResponse.json({ error: 'Allowance not found' }, { status: 404 });
      }
    }

    await prisma.employeeAllowance.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting employee allowance:', error);
    return NextResponse.json({ error: 'Failed to delete employee allowance' }, { status: 500 });
  }
}
