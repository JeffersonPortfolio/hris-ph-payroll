import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { formatDate, formatTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any)?.role;
    if (role !== "ADMIN" && role !== "HR") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: any = {};

    if (startDate) {
      where.date = {
        ...where.date,
        gte: new Date(startDate),
      };
    }

    if (endDate) {
      where.date = {
        ...where.date,
        lte: new Date(endDate),
      };
    }

    const attendance = await prisma.attendance.findMany({
      where,
      include: {
        employee: {
          select: {
            employeeId: true,
            firstName: true,
            lastName: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: [{ date: "desc" }, { employee: { lastName: "asc" } }],
    });

    // Generate CSV
    const headers = [
      "Employee ID",
      "Name",
      "Department",
      "Date",
      "Clock In",
      "Clock Out",
      "Total Hours",
      "Status",
      "Late Minutes",
    ];

    const rows = attendance.map((a) => [
      a.employee?.employeeId ?? "",
      `${a.employee?.firstName ?? ""} ${a.employee?.lastName ?? ""}`,
      a.employee?.department?.name ?? "",
      formatDate(a.date),
      a.clockIn ? formatTime(a.clockIn) : "",
      a.clockOut ? formatTime(a.clockOut) : "",
      a.totalHours?.toFixed(2) ?? "",
      a.status,
      a.lateMinutes.toString(),
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="attendance-report-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export attendance error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}