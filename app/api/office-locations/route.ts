import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { getCompanyContext } from '@/lib/tenant';

// GET all office locations
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ctx = await getCompanyContext();

    const where: any = {};
    if (ctx?.companyId) {
      where.OR = [{ companyId: ctx.companyId }, { companyId: null }];
    }

    const locations = await prisma.officeLocation.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { departmentLocations: true },
    });

    return NextResponse.json(locations);
  } catch (error) {
    console.error('Error fetching office locations:', error);
    return NextResponse.json({ error: 'Failed to fetch office locations' }, { status: 500 });
  }
}

// POST create office location
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'HR', 'SUPER_ADMIN'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ctx = await getCompanyContext();
    const body = await request.json();
    const { name, address, latitude, longitude, radiusMeters } = body;

    const location = await prisma.officeLocation.create({
      data: {
        name, address,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radiusMeters: Math.round(parseFloat(radiusMeters)) || 100,
        companyId: ctx?.companyId || null,
      },
    });

    return NextResponse.json(location, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Location name already exists' }, { status: 400 });
    }
    console.error('Error creating office location:', error);
    return NextResponse.json({ error: 'Failed to create office location' }, { status: 500 });
  }
}

// PUT update office location
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'HR', 'SUPER_ADMIN'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, address, latitude, longitude, radiusMeters, isActive } = body;

    const location = await prisma.officeLocation.update({
      where: { id },
      data: {
        name, address,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        radiusMeters: radiusMeters ? Math.round(parseFloat(radiusMeters)) : undefined,
        isActive,
      },
    });

    return NextResponse.json(location);
  } catch (error) {
    console.error('Error updating office location:', error);
    return NextResponse.json({ error: 'Failed to update office location' }, { status: 500 });
  }
}

// DELETE office location
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

    await prisma.officeLocation.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting office location:', error);
    return NextResponse.json({ error: 'Failed to delete office location' }, { status: 500 });
  }
}

// PATCH assign departments to location
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'HR', 'SUPER_ADMIN'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { locationId, departmentIds, isDefault } = body;

    await prisma.departmentLocation.deleteMany({
      where: { officeLocationId: locationId },
    });

    if (departmentIds && departmentIds.length > 0) {
      await prisma.departmentLocation.createMany({
        data: departmentIds.map((deptId: string) => ({
          departmentId: deptId,
          officeLocationId: locationId,
          isDefault: isDefault || false,
        })),
      });
    }

    const location = await prisma.officeLocation.findUnique({
      where: { id: locationId },
      include: { departmentLocations: true },
    });

    return NextResponse.json(location);
  } catch (error) {
    console.error('Error assigning departments:', error);
    return NextResponse.json({ error: 'Failed to assign departments' }, { status: 500 });
  }
}
