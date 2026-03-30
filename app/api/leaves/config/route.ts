import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { getCompanyContext } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET: Fetch all leave type configurations
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const ctx = await getCompanyContext();

    const where: any = {};
    if (ctx?.companyId) {
      where.OR = [{ companyId: ctx.companyId }, { companyId: null }];
    }

    const configs = await prisma.leaveTypeConfig.findMany({
      where,
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ configs });
  } catch (error) {
    console.error("Leave config fetch error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

// POST: Create a new leave type config
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
    const body = await request.json();
    const { code, name, defaultBalance, description } = body;

    if (!code || !name) {
      return NextResponse.json({ message: "Code and name are required" }, { status: 400 });
    }

    // Check if code already exists for this company
    const existingWhere: any = { code: code.toUpperCase() };
    if (ctx?.companyId) {
      existingWhere.companyId = ctx.companyId;
    }
    const existing = await prisma.leaveTypeConfig.findFirst({ where: existingWhere });
    if (existing) {
      return NextResponse.json({ message: "Leave type code already exists" }, { status: 409 });
    }

    const config = await prisma.leaveTypeConfig.create({
      data: {
        code: code.toUpperCase(),
        name,
        defaultBalance: parseFloat(defaultBalance) || 0,
        description: description || null,
        companyId: ctx?.companyId || null,
      },
    });

    return NextResponse.json({ config }, { status: 201 });
  } catch (error) {
    console.error("Leave config create error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

// PUT: Update a leave type config
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any)?.role;
    if (role !== "ADMIN" && role !== "HR" && role !== "SUPER_ADMIN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, defaultBalance, description, isActive } = body;

    if (!id) {
      return NextResponse.json({ message: "ID is required" }, { status: 400 });
    }

    const config = await prisma.leaveTypeConfig.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(defaultBalance !== undefined && { defaultBalance: parseFloat(defaultBalance) || 0 }),
        ...(description !== undefined && { description: description || null }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({ config });
  } catch (error) {
    console.error("Leave config update error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

// DELETE: Delete a leave type config
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any)?.role;
    if (role !== "ADMIN" && role !== "HR" && role !== "SUPER_ADMIN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ message: "ID is required" }, { status: 400 });
    }

    await prisma.leaveTypeConfig.delete({ where: { id } });

    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    console.error("Leave config delete error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
