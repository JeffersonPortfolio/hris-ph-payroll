import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { deleteFile, getFileUrl } from "@/lib/s3";
import { getCompanyContext } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const ctx = await getCompanyContext();
    if (!ctx) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Verify employee belongs to company
    if (ctx.companyId) {
      const employee = await prisma.employee.findFirst({
        where: { id: params.id, companyId: ctx.companyId },
      });
      if (!employee) {
        return NextResponse.json({ message: "Employee not found" }, { status: 404 });
      }
    }

    const { name, type, cloudStoragePath, size } = await request.json();

    if (!name || !cloudStoragePath) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    const document = await prisma.document.create({
      data: {
        employeeId: params.id,
        name,
        type: type || "other",
        cloudStoragePath,
        size: size || 0,
      },
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    console.error("Create document error:", error);
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
    if (!['ADMIN', 'HR', 'SUPER_ADMIN'].includes(role)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const ctx = await getCompanyContext();
    if (!ctx) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Verify employee belongs to company
    if (ctx.companyId) {
      const employee = await prisma.employee.findFirst({
        where: { id: params.id, companyId: ctx.companyId },
      });
      if (!employee) {
        return NextResponse.json({ message: "Employee not found" }, { status: 404 });
      }
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("documentId");

    if (!documentId) {
      return NextResponse.json(
        { message: "Document ID required" },
        { status: 400 }
      );
    }

    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return NextResponse.json(
        { message: "Document not found" },
        { status: 404 }
      );
    }

    await deleteFile(document.cloudStoragePath);
    await prisma.document.delete({ where: { id: documentId } });

    return NextResponse.json({ message: "Document deleted successfully" });
  } catch (error) {
    console.error("Delete document error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
