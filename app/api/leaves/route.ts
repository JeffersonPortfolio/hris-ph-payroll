import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { calculateLeaveDays, getLeaveTypeLabel, formatDate } from "@/lib/utils";
import { getCompanyContext } from "@/lib/tenant";
import {
  sendNotificationEmail,
  getLeaveSubmittedEmailTemplate,
} from "@/lib/email";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const ctx = await getCompanyContext();
    if (!ctx) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const status = searchParams.get("status");
    const leaveType = searchParams.get("leaveType");
    const forApproval = searchParams.get("forApproval");
    const limit = parseInt(searchParams.get("limit") || "20");
    const page = parseInt(searchParams.get("page") || "1");

    const where: any = {};

    // Tenant isolation: filter by company employees
    if (ctx.companyId) {
      where.employee = { companyId: ctx.companyId };
    }

    // Employees can only see their own leaves
    if (ctx.role === "EMPLOYEE") {
      if (forApproval === "true" && ctx.employeeId) {
        where.approverId = ctx.employeeId;
        where.status = "PENDING";
      } else {
        where.employeeId = ctx.employeeId;
      }
    } else if (employeeId) {
      where.employeeId = employeeId;
    }

    if (status && status !== "all") {
      where.status = status;
    }
    if (leaveType) {
      where.leaveType = leaveType;
    }

    const [leaves, total] = await Promise.all([
      prisma.leave.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeId: true,
              department: { select: { id: true, name: true } },
            },
          },
          approver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeId: true,
            },
          },
          approvedBy: {
            select: { name: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.leave.count({ where }),
    ]);

    return NextResponse.json({
      leaves,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get leaves error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const ctx = await getCompanyContext();

    const {
      employeeId, leaveType, filingType, startDate, endDate,
      reason, isHalfDay, documentUrl, documentName, isPublicDoc,
    } = await request.json();

    if (!employeeId || !leaveType || !startDate || !endDate || !reason) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    if (leaveType === "SICK" && !documentUrl) {
      return NextResponse.json(
        { message: "Sick leave requires a supporting document/medical certificate" },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = calculateLeaveDays(start, end, isHalfDay);

    // Check for overlapping leaves
    const overlapping = await prisma.leave.findFirst({
      where: {
        employeeId,
        status: "APPROVED",
        OR: [{ startDate: { lte: end }, endDate: { gte: start } }],
      },
    });

    if (overlapping) {
      return NextResponse.json(
        { message: "Leave dates overlap with existing approved leave" },
        { status: 400 }
      );
    }

    // Check leave balance
    const currentYear = new Date().getFullYear();
    const balance = await prisma.leaveBalance.findUnique({
      where: {
        employeeId_leaveType_year: { employeeId, leaveType, year: currentYear },
      },
    });

    const available = (balance?.balance ?? 0) - (balance?.used ?? 0);
    if (available < totalDays) {
      return NextResponse.json(
        { message: `Insufficient leave balance. Available: ${available} days` },
        { status: 400 }
      );
    }

    // Get employee with department to find the department head (approver)
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        department: {
          include: {
            head: {
              include: { user: { select: { email: true } } },
            },
          },
        },
      },
    });

    const approverId = employee?.department?.headId ?? null;

    const leave = await prisma.leave.create({
      data: {
        employeeId,
        leaveType,
        filingType: filingType || "ADVANCE",
        startDate: start,
        endDate: end,
        totalDays,
        isHalfDay: isHalfDay || false,
        reason,
        documentUrl,
        documentName,
        isPublicDoc: isPublicDoc || false,
        status: "PENDING",
        approverId,
      },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            department: { select: { name: true } },
          },
        },
        approver: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    const employeeName = `${leave.employee?.firstName ?? ""} ${leave.employee?.lastName ?? ""}`;

    // Create notification for approver (department head)
    if (approverId && employee?.department?.head?.user?.email) {
      const approverEmail = employee.department.head.user.email;
      
      await sendNotificationEmail({
        to: approverEmail,
        subject: `Leave Request Pending Your Approval - ${employeeName}`,
        body: getLeaveSubmittedEmailTemplate(
          employeeName,
          getLeaveTypeLabel(leaveType),
          formatDate(start),
          formatDate(end),
          reason
        ),
      });

      if (employee.department.head.userId) {
        await prisma.notification.create({
          data: {
            userId: employee.department.head.userId,
            title: "Leave Request Pending Approval",
            message: `${employeeName} has submitted a ${getLeaveTypeLabel(leaveType)} request from ${formatDate(start)} to ${formatDate(end)}`,
            type: "LEAVE",
          },
        });
      }
    }

    // Also notify HR/Admin about new leave request - filtered by company
    const hrWhere: any = {
      role: { in: ["ADMIN", "HR"] },
      isActive: true,
    };
    if (ctx?.companyId) {
      hrWhere.companyId = ctx.companyId;
    }

    const hrUsers = await prisma.user.findMany({
      where: hrWhere,
      select: { id: true, email: true },
    });

    for (const hr of hrUsers) {
      await sendNotificationEmail({
        to: hr.email,
        subject: "New Leave Request Submitted - HRIS",
        body: getLeaveSubmittedEmailTemplate(
          employeeName,
          getLeaveTypeLabel(leaveType),
          formatDate(start),
          formatDate(end),
          reason
        ),
      });

      await prisma.notification.create({
        data: {
          userId: hr.id,
          title: "New Leave Request",
          message: `${employeeName} has submitted a ${getLeaveTypeLabel(leaveType)} request from ${formatDate(start)} to ${formatDate(end)}`,
          type: "LEAVE",
        },
      });
    }

    return NextResponse.json({ leave }, { status: 201 });
  } catch (error) {
    console.error("Create leave error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
