import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/super-admin/companies/[id] - Get company details
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const company = await prisma.company.findUnique({
      where: { id: params.id },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
          },
        },
        _count: {
          select: {
            employees: true,
            departments: true,
            roles: true,
          },
        },
      },
    });

    if (!company) {
      return NextResponse.json(
        { message: "Company not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ company });
  } catch (error) {
    console.error("Get company error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/super-admin/companies/[id] - Update company
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      contactEmail,
      contactPhone,
      employeeLimit,
      subscriptionStatus,
      subscriptionType,
    } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (contactEmail !== undefined) updateData.contactEmail = contactEmail;
    if (contactPhone !== undefined) updateData.contactPhone = contactPhone;
    if (employeeLimit !== undefined) updateData.employeeLimit = employeeLimit;
    if (subscriptionStatus !== undefined) updateData.subscriptionStatus = subscriptionStatus;
    if (subscriptionType !== undefined) updateData.subscriptionType = subscriptionType;

    const company = await prisma.company.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({ company, message: "Company updated successfully" });
  } catch (error) {
    console.error("Update company error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/super-admin/companies/[id] - Toggle company status (activate/deactivate)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    if (!action || !['activate', 'deactivate'].includes(action)) {
      return NextResponse.json(
        { message: "Invalid action. Use 'activate' or 'deactivate'" },
        { status: 400 }
      );
    }

    const company = await prisma.company.findUnique({
      where: { id: params.id },
    });

    if (!company) {
      return NextResponse.json(
        { message: "Company not found" },
        { status: 404 }
      );
    }

    const newStatus = action === "activate" ? "ACTIVE" : "INACTIVE";

    const updated = await prisma.company.update({
      where: { id: params.id },
      data: { subscriptionStatus: newStatus as any },
    });

    return NextResponse.json({
      company: updated,
      message: `Company ${action}d successfully`,
    });
  } catch (error) {
    console.error("Toggle company status error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
