import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
    const month = searchParams.get("month");
    const departmentId = searchParams.get("departmentId");

    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31);

    let startDate = startOfYear;
    let endDate = endOfYear;

    if (month) {
      const m = parseInt(month) - 1;
      startDate = new Date(year, m, 1);
      endDate = new Date(year, m + 1, 0);
    }

    const where: any = {
      status: "APPROVED",
      OR: [
        {
          startDate: { lte: endDate },
          endDate: { gte: startDate },
        },
      ],
    };

    if (departmentId) {
      where.employee = {
        departmentId,
      };
    }

    const leaves = await prisma.leave.findMany({
      where,
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: { startDate: "asc" },
    });

    // Transform to calendar events
    const events = leaves.map((leave) => ({
      id: leave.id,
      title: `${leave.employee?.firstName ?? ""} ${leave.employee?.lastName ?? ""} - ${leave.leaveType}`,
      start: leave.startDate,
      end: leave.endDate,
      leaveType: leave.leaveType,
      employeeName: `${leave.employee?.firstName ?? ""} ${leave.employee?.lastName ?? ""}`,
      department: leave.employee?.department?.name ?? "",
    }));

    return NextResponse.json({ events });
  } catch (error) {
    console.error("Get leave calendar error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}