import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Toggle employee/user account status (activate/deactivate)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any)?.role;
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return NextResponse.json({ message: "Only admins can change account status" }, { status: 403 });
    }

    const { id } = params;
    const { isActive } = await request.json();

    // Get employee with user info
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!employee) {
      return NextResponse.json({ message: "Employee not found" }, { status: 404 });
    }

    // Update employee isActive status
    await prisma.employee.update({
      where: { id },
      data: { isActive },
    });

    // Also update associated user account if exists
    if (employee.userId) {
      await prisma.user.update({
        where: { id: employee.userId },
        data: { isActive },
      });
    }

    return NextResponse.json({ 
      message: isActive ? "Account activated successfully" : "Account deactivated successfully",
      isActive 
    });
  } catch (error) {
    console.error("Toggle account status error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// Hard delete employee (Admin only)
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
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return NextResponse.json({ message: "Only admins can delete accounts" }, { status: 403 });
    }

    const { id } = params;

    // Get employee with all related data
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!employee) {
      return NextResponse.json({ message: "Employee not found" }, { status: 404 });
    }

    // Delete related records first (in order of dependencies)
    await prisma.$transaction(async (tx) => {
      // Get loan IDs for this employee first
      const loans = await tx.employeeLoan.findMany({
        where: { employeeId: id },
        select: { id: true },
      });
      const loanIds = loans.map(l => l.id);
      
      // Delete employee loan payments
      if (loanIds.length > 0) {
        await tx.loanPayment.deleteMany({
          where: { employeeLoanId: { in: loanIds } },
        });
      }
      await tx.employeeLoan.deleteMany({ where: { employeeId: id } });

      // Delete allowances
      await tx.employeeAllowance.deleteMany({ where: { employeeId: id } });

      // Delete adjustments
      await tx.payrollAdjustment.deleteMany({ where: { employeeId: id } });

      // Delete payroll records
      await tx.payroll.deleteMany({ where: { employeeId: id } });

      // Delete attendance records
      await tx.attendance.deleteMany({ where: { employeeId: id } });

      // Delete leave records and balances
      await tx.leave.deleteMany({ where: { employeeId: id } });
      await tx.leaveBalance.deleteMany({ where: { employeeId: id } });

      // Delete employee schedules
      await tx.employeeSchedule.deleteMany({ where: { employeeId: id } });

      // Delete documents
      await tx.document.deleteMany({ where: { employeeId: id } });

      // Clear approvedBy references in leaves and loans before deleting user
      if (employee.userId) {
        await tx.leave.updateMany({
          where: { approvedById: employee.userId },
          data: { approvedById: null },
        });
        await tx.employeeLoan.updateMany({
          where: { approvedById: employee.userId },
          data: { approvedById: null },
        });
        await tx.notification.deleteMany({ where: { userId: employee.userId } });
      }

      // Delete the employee record
      await tx.employee.delete({ where: { id } });

      // Delete the associated user account if exists
      if (employee.userId) {
        await tx.user.delete({ where: { id: employee.userId } });
      }
    });

    return NextResponse.json({ message: "Employee permanently deleted" });
  } catch (error: any) {
    console.error("Delete employee error:", error);
    return NextResponse.json(
      { message: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
