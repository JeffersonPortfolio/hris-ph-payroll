import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const department = await prisma.department.findUnique({
      where: { id: params.id },
      include: {
        head: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        employees: {
          where: { isActive: true },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
            role: { select: { name: true } },
          },
        },
      },
    });

    if (!department) {
      return NextResponse.json(
        { message: "Department not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ department });
  } catch (error) {
    console.error("Get department error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any)?.role;
    if (role !== "ADMIN" && role !== "HR") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { name, description, headId } = await request.json();

    const department = await prisma.department.update({
      where: { id: params.id },
      data: {
        name,
        description,
        headId: headId || null,
      },
      include: {
        head: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return NextResponse.json({ department });
  } catch (error) {
    console.error("Update department error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any)?.role;
    if (role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await prisma.department.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({ message: "Department deleted successfully" });
  } catch (error) {
    console.error("Delete department error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}