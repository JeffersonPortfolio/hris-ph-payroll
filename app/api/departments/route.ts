import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { getCompanyContext } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const ctx = await getCompanyContext();
    if (!ctx) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const where: any = { isActive: true };
    if (ctx.companyId) {
      where.companyId = ctx.companyId;
    }

    const departments = await prisma.department.findMany({
      where,
      include: {
        head: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: { employees: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ departments });
  } catch (error) {
    console.error("Get departments error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any)?.role;
    if (role !== "ADMIN" && role !== "HR" && role !== "SUPER_ADMIN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const ctx = await getCompanyContext();
    if (!ctx) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { name, description, headId } = await request.json();

    if (!name) {
      return NextResponse.json(
        { message: "Department name is required" },
        { status: 400 }
      );
    }

    // Check for existing department within the same company
    const existingWhere: any = { name };
    if (ctx.companyId) {
      existingWhere.companyId = ctx.companyId;
    }
    const existing = await prisma.department.findFirst({ where: existingWhere });
    if (existing) {
      return NextResponse.json(
        { message: "Department already exists" },
        { status: 400 }
      );
    }

    const department = await prisma.department.create({
      data: {
        name,
        description,
        headId: headId || null,
        companyId: ctx.companyId || null,
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

    return NextResponse.json({ department }, { status: 201 });
  } catch (error) {
    console.error("Create department error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
