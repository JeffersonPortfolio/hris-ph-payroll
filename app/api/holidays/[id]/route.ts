import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const holiday = await prisma.holiday.findUnique({
      where: { id },
    });

    if (!holiday) {
      return NextResponse.json({ error: "Holiday not found" }, { status: 404 });
    }

    return NextResponse.json(holiday);
  } catch (error) {
    console.error("Error fetching holiday:", error);
    return NextResponse.json({ error: "Failed to fetch holiday" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || ((session.user as any)?.role !== "ADMIN" && (session.user as any)?.role !== "HR")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, date, type, description, isRecurring } = body;

    const holidayDate = date ? new Date(date) : undefined;
    const holiday = await prisma.holiday.update({
      where: { id },
      data: {
        name,
        date: holidayDate,
        type,
        description,
        year: holidayDate ? holidayDate.getFullYear() : undefined,
        isRecurring,
      },
    });

    return NextResponse.json(holiday);
  } catch (error) {
    console.error("Error updating holiday:", error);
    return NextResponse.json({ error: "Failed to update holiday" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || ((session.user as any)?.role !== "ADMIN" && (session.user as any)?.role !== "HR")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await prisma.holiday.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Holiday deleted successfully" });
  } catch (error) {
    console.error("Error deleting holiday:", error);
    return NextResponse.json({ error: "Failed to delete holiday" }, { status: 500 });
  }
}
