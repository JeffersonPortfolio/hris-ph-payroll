import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST: Assign leave balances from configs to employees
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any)?.role;
    if (role !== "ADMIN" && role !== "HR") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { employeeIds, leaveTypeConfigIds, year, overwrite } = body;

    if (!employeeIds?.length || !leaveTypeConfigIds?.length) {
      return NextResponse.json(
        { message: "Employee IDs and leave type config IDs are required" },
        { status: 400 }
      );
    }

    const currentYear = year || new Date().getFullYear();

    // Fetch selected leave type configs
    const configs = await prisma.leaveTypeConfig.findMany({
      where: { id: { in: leaveTypeConfigIds }, isActive: true },
    });

    if (configs.length === 0) {
      return NextResponse.json({ message: "No active leave type configs found" }, { status: 400 });
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const empId of employeeIds) {
      for (const config of configs) {
        // Check if LeaveType enum has this code
        const validLeaveTypes = ["ANNUAL", "SICK", "EMERGENCY", "WFH", "COMPASSIONATE"];
        if (!validLeaveTypes.includes(config.code)) {
          skipped++;
          continue;
        }

        const existing = await prisma.leaveBalance.findUnique({
          where: {
            employeeId_leaveType_year: {
              employeeId: empId,
              leaveType: config.code as any,
              year: currentYear,
            },
          },
        });

        if (existing) {
          if (overwrite) {
            await prisma.leaveBalance.update({
              where: { id: existing.id },
              data: { balance: config.defaultBalance },
            });
            updated++;
          } else {
            skipped++;
          }
        } else {
          await prisma.leaveBalance.create({
            data: {
              employeeId: empId,
              leaveType: config.code as any,
              balance: config.defaultBalance,
              used: 0,
              year: currentYear,
            },
          });
          created++;
        }
      }
    }

    return NextResponse.json({
      message: `Assigned leave balances: ${created} created, ${updated} updated, ${skipped} skipped`,
      created,
      updated,
      skipped,
    });
  } catch (error) {
    console.error("Leave assign error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
