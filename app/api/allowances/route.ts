import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { getCompanyContext } from '@/lib/tenant';

// GET all allowance types
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

    // Show company-specific + global allowance types
    const where: any = {};
    if (ctx.companyId) {
      where.OR = [
        { companyId: ctx.companyId },
        { companyId: null },
      ];
    }

    const allowanceTypes = await prisma.allowanceType.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { employeeAllowances: true }
        }
      }
    });

    return NextResponse.json(allowanceTypes);
  } catch (error) {
    console.error('Error fetching allowance types:', error);
    return NextResponse.json({ error: 'Failed to fetch allowance types' }, { status: 500 });
  }
}

// POST create new allowance type
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
    const { name, description, isTaxable } = body;

    const allowanceType = await prisma.allowanceType.create({
      data: {
        name,
        description,
        isTaxable: isTaxable ?? true,
        companyId: ctx.companyId || null,
      },
    });

    return NextResponse.json(allowanceType, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Allowance type already exists' }, { status: 400 });
    }
    console.error('Error creating allowance type:', error);
    return NextResponse.json({ error: 'Failed to create allowance type' }, { status: 500 });
  }
}

// PUT update allowance type
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
    const { id, name, description, isTaxable, isActive } = body;

    // Verify ownership
    if (ctx.companyId) {
      const existing = await prisma.allowanceType.findFirst({
        where: { id, OR: [{ companyId: ctx.companyId }, { companyId: null }] },
      });
      if (!existing) {
        return NextResponse.json({ error: 'Allowance type not found' }, { status: 404 });
      }
    }

    const allowanceType = await prisma.allowanceType.update({
      where: { id },
      data: { name, description, isTaxable, isActive },
    });

    return NextResponse.json(allowanceType);
  } catch (error) {
    console.error('Error updating allowance type:', error);
    return NextResponse.json({ error: 'Failed to update allowance type' }, { status: 500 });
  }
}

// DELETE allowance type
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

    // Verify ownership
    if (ctx.companyId) {
      const existing = await prisma.allowanceType.findFirst({
        where: { id, companyId: ctx.companyId },
      });
      if (!existing) {
        return NextResponse.json({ error: 'Allowance type not found' }, { status: 404 });
      }
    }

    await prisma.allowanceType.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting allowance type:', error);
    return NextResponse.json({ error: 'Failed to delete allowance type' }, { status: 500 });
  }
}
