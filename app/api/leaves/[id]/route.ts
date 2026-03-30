import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { getLeaveTypeLabel, formatDate } from "@/lib/utils";
import {
  sendNotificationEmail,
  getLeaveApprovalEmailTemplate,
} from "@/lib/email";

export const dynamic = "force-dynamic";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any)?.role;
    const sessionEmployeeId = (session.user as any)?.employeeId;
    const { id } = params;
    const body = await request.json();
    const { status, rejectionReason, approverId } = body;

    const existingLeave = await prisma.leave.findUnique({
      where: { id },
      include: {
        employee: {
          select: { firstName: true, lastName: true, email: true },
        },
        approver: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!existingLeave) {
      return NextResponse.json({ message: "Leave not found" }, { status: 404 });
    }

    // If only updating the approver (admin only)
    if (approverId !== undefined && !status) {
      if (role !== "ADMIN" && role !== "HR" && role !== "SUPER_ADMIN") {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
      }

      const leave = await prisma.leave.update({
        where: { id },
        data: { approverId: approverId || null },
        include: {
          approver: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });

      return NextResponse.json({ leave });
    }

    // Check if user can approve/reject
    const isAdminOrHR = role === "ADMIN" || role === "HR" || role === "SUPER_ADMIN";
    const isAssignedApprover = existingLeave.approverId === sessionEmployeeId;

    if (!isAdminOrHR && !isAssignedApprover) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    if (!status || !["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json({ message: "Invalid status" }, { status: 400 });
    }

    if (existingLeave.status !== "PENDING") {
      return NextResponse.json({ message: "Leave already processed" }, { status: 400 });
    }

    const leave = await prisma.leave.update({
      where: { id },
      data: {
        status,
        rejectionReason: status === "REJECTED" ? rejectionReason : null,
        approvedById: (session.user as any)?.id,
        approvedAt: new Date(),
      },
    });

    // Update leave balance if approved
    if (status === "APPROVED") {
      const currentYear = new Date().getFullYear();
      await prisma.leaveBalance.update({
        where: {
          employeeId_leaveType_year: {
            employeeId: leave.employeeId,
            leaveType: leave.leaveType,
            year: currentYear,
          },
        },
        data: { used: { increment: leave.totalDays } },
      });
    }

    // Notify employee
    if (existingLeave.employee?.email) {
      const employeeName = `${existingLeave.employee.firstName ?? ""} ${existingLeave.employee.lastName ?? ""}`;

      await sendNotificationEmail({
        to: existingLeave.employee.email,
        subject: `Leave Request ${status} - HRIS`,
        body: getLeaveApprovalEmailTemplate(
          employeeName,
          getLeaveTypeLabel(existingLeave.leaveType),
          formatDate(existingLeave.startDate),
          formatDate(existingLeave.endDate),
          status as "APPROVED" | "REJECTED",
          rejectionReason
        ),
      });

      const employee = await prisma.employee.findFirst({
        where: { email: existingLeave.employee.email },
        select: { userId: true },
      });

      if (employee?.userId) {
        await prisma.notification.create({
          data: {
            userId: employee.userId,
            title: `Leave ${status}`,
            message: `Your ${getLeaveTypeLabel(existingLeave.leaveType)} leave request has been ${status.toLowerCase()}.`,
            type: "leave",
            link: "/leaves",
          },
        });
      }
    }

    return NextResponse.json({ leave });
  } catch (error) {
    console.error("Update leave error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
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

    const { id } = params;
    const sessionEmployeeId = (session.user as any)?.employeeId;
    const role = (session.user as any)?.role;

    const leave = await prisma.leave.findUnique({ where: { id } });

    if (!leave) {
      return NextResponse.json({ message: "Leave not found" }, { status: 404 });
    }

    if (leave.status !== "PENDING") {
      return NextResponse.json({ message: "Can only cancel pending leaves" }, { status: 400 });
    }

    if (role === "EMPLOYEE" && leave.employeeId !== sessionEmployeeId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await prisma.leave.delete({ where: { id } });

    return NextResponse.json({ message: "Leave cancelled successfully" });
  } catch (error) {
    console.error("Delete leave error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
