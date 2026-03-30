import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { getCompanyContext } from "@/lib/tenant";

// Singapore Public Holidays 2024-2026
const SINGAPORE_HOLIDAYS = [
  { name: "New Year's Day", date: "2024-01-01", type: "REGULAR" },
  { name: "Chinese New Year", date: "2024-02-10", type: "REGULAR" },
  { name: "Chinese New Year (Day 2)", date: "2024-02-11", type: "REGULAR" },
  { name: "Good Friday", date: "2024-03-29", type: "REGULAR" },
  { name: "Hari Raya Puasa", date: "2024-04-10", type: "REGULAR" },
  { name: "Labour Day", date: "2024-05-01", type: "REGULAR" },
  { name: "Vesak Day", date: "2024-05-22", type: "REGULAR" },
  { name: "Hari Raya Haji", date: "2024-06-17", type: "REGULAR" },
  { name: "National Day", date: "2024-08-09", type: "REGULAR" },
  { name: "Deepavali", date: "2024-11-01", type: "REGULAR" },
  { name: "Christmas Day", date: "2024-12-25", type: "REGULAR" },
  { name: "New Year's Day", date: "2025-01-01", type: "REGULAR" },
  { name: "Chinese New Year", date: "2025-01-29", type: "REGULAR" },
  { name: "Chinese New Year (Day 2)", date: "2025-01-30", type: "REGULAR" },
  { name: "Hari Raya Puasa", date: "2025-03-31", type: "REGULAR" },
  { name: "Good Friday", date: "2025-04-18", type: "REGULAR" },
  { name: "Labour Day", date: "2025-05-01", type: "REGULAR" },
  { name: "Vesak Day", date: "2025-05-12", type: "REGULAR" },
  { name: "Hari Raya Haji", date: "2025-06-07", type: "REGULAR" },
  { name: "National Day", date: "2025-08-09", type: "REGULAR" },
  { name: "Deepavali", date: "2025-10-20", type: "REGULAR" },
  { name: "Christmas Day", date: "2025-12-25", type: "REGULAR" },
  { name: "New Year's Day", date: "2026-01-01", type: "REGULAR" },
  { name: "Chinese New Year", date: "2026-02-17", type: "REGULAR" },
  { name: "Chinese New Year (Day 2)", date: "2026-02-18", type: "REGULAR" },
  { name: "Hari Raya Puasa", date: "2026-03-20", type: "REGULAR" },
  { name: "Good Friday", date: "2026-04-03", type: "REGULAR" },
  { name: "Labour Day", date: "2026-05-01", type: "REGULAR" },
  { name: "Vesak Day", date: "2026-05-31", type: "REGULAR" },
  { name: "Hari Raya Haji", date: "2026-05-27", type: "REGULAR" },
  { name: "National Day", date: "2026-08-09", type: "REGULAR" },
  { name: "Deepavali", date: "2026-11-08", type: "REGULAR" },
  { name: "Christmas Day", date: "2026-12-25", type: "REGULAR" },
];

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ctx = await getCompanyContext();

    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year");
    const month = searchParams.get("month");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    const where: Record<string, unknown> = {};
    
    // Tenant isolation: show company-specific + global holidays
    if (ctx?.companyId) {
      where.OR = [{ companyId: ctx.companyId }, { companyId: null }];
    }

    if (startDateParam && endDateParam) {
      where.date = { gte: new Date(startDateParam), lte: new Date(endDateParam) };
    } else if (year) {
      where.year = parseInt(year);
      if (month) {
        const monthNum = parseInt(month);
        const yearNum = parseInt(year);
        where.date = {
          gte: new Date(yearNum, monthNum - 1, 1),
          lte: new Date(yearNum, monthNum, 0),
        };
      }
    }

    const holidays = await prisma.holiday.findMany({
      where,
      orderBy: { date: "asc" },
    });

    return NextResponse.json(holidays);
  } catch (error) {
    console.error("Error fetching holidays:", error);
    return NextResponse.json({ error: "Failed to fetch holidays" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'HR', 'SUPER_ADMIN'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ctx = await getCompanyContext();
    const body = await request.json();
    const { name, date, type, description, isRecurring, importSingapore, year } = body;

    if (importSingapore && year) {
      const singaporeHolidays = SINGAPORE_HOLIDAYS.filter(h => h.date.startsWith(year.toString()));
      const created = [];
      for (const holiday of singaporeHolidays) {
        try {
          const holidayDate = new Date(holiday.date);
          const existing = await prisma.holiday.findFirst({
            where: { date: holidayDate, name: holiday.name, companyId: ctx?.companyId || null },
          });
          if (!existing) {
            const newHoliday = await prisma.holiday.create({
              data: {
                name: holiday.name,
                date: holidayDate,
                type: holiday.type as "REGULAR" | "SPECIAL",
                year: parseInt(year),
                isRecurring: false,
                companyId: ctx?.companyId || null,
              },
            });
            created.push(newHoliday);
          }
        } catch { /* Skip if already exists */ }
      }
      return NextResponse.json({ message: `Imported ${created.length} Singapore holidays for ${year}`, holidays: created });
    }

    const holidayDate = new Date(date);
    const holiday = await prisma.holiday.create({
      data: {
        name,
        date: holidayDate,
        type: type || "REGULAR",
        description,
        year: holidayDate.getFullYear(),
        isRecurring: isRecurring || false,
        companyId: ctx?.companyId || null,
      },
    });

    return NextResponse.json(holiday);
  } catch (error) {
    console.error("Error creating holiday:", error);
    return NextResponse.json({ error: "Failed to create holiday" }, { status: 500 });
  }
}
