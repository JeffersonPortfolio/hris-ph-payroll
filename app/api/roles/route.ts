import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const roles = await prisma.role.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { employees: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ roles });
  } catch (error) {
    console.error("Get roles error:", error);
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

    const userRole = (session.user as any)?.role;
    if (userRole !== "ADMIN" && userRole !== "HR") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { name, description } = await request.json();

    if (!name) {
      return NextResponse.json(
        { message: "Role name is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.role.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json(
        { message: "Role already exists" },
        { status: 400 }
      );
    }

    const role = await prisma.role.create({
      data: { name, description },
    });

    return NextResponse.json({ role }, { status: 201 });
  } catch (error) {
    console.error("Create role error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}