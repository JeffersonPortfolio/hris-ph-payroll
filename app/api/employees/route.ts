import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { generateEmployeeId } from "@/lib/utils";
import bcrypt from "bcryptjs";
import { sendNotificationEmail, getWelcomeEmailTemplate } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const department = searchParams.get("department") || "";
    const status = searchParams.get("status") || "";
    const accountStatus = searchParams.get("accountStatus") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const minimal = searchParams.get("minimal") === "true";

    const where: any = {};

    // Filter by account status (active/inactive)
    if (accountStatus === "active") {
      where.isActive = true;
    } else if (accountStatus === "inactive") {
      where.isActive = false;
    }
    // If accountStatus is empty or "all", don't filter by isActive - show all employees

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { employeeId: { contains: search, mode: "insensitive" } },
      ];
    }

    if (department && department !== "all") {
      where.departmentId = department;
    }

    if (status && status !== "all") {
      where.employmentStatus = status;
    }

    // Minimal mode for attendance grid - faster query with only essential fields
    if (minimal) {
      const employees = await prisma.employee.findMany({
        where: { ...where, isActive: true },
        select: {
          id: true,
          employeeId: true,
          firstName: true,
          lastName: true,
          departmentId: true,
          department: { select: { name: true } },
        },
        orderBy: { lastName: "asc" },
        take: limit,
      });
      return NextResponse.json({ employees });
    }

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        include: {
          department: { select: { id: true, name: true } },
          role: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.employee.count({ where }),
    ]);

    return NextResponse.json({
      employees,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get employees error:", error);
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

    const role = (session.user as any)?.role;
    if (role !== "ADMIN" && role !== "HR") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const data = await request.json();
    const {
      firstName,
      lastName,
      middleName,
      email,
      mobileNumber,
      dateOfBirth,
      gender,
      civilStatus,
      nationality,
      placeOfBirth,
      currentAddress,
      permanentAddress,
      emergencyContactName,
      emergencyContactRelation,
      emergencyContactNumber,
      departmentId,
      roleId,
      employmentType,
      employmentStatus,
      dateHired,
      regularizationDate,
      sssNumber,
      philHealthNumber,
      pagIbigNumber,
      tinNumber,
      bankName,
      bankAccountNumber,
      createUserAccount,
    } = data;

    if (!firstName || !lastName || !email || !dateHired) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingEmail = await prisma.employee.findFirst({
      where: { email },
    });

    if (existingEmail) {
      return NextResponse.json(
        { message: "Email already exists" },
        { status: 400 }
      );
    }

    let userId = null;
    let tempPassword = "";

    let emailSent = false;
    let emailError = "";

    // Create user account if requested
    if (createUserAccount) {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return NextResponse.json(
          { message: "User account already exists with this email" },
          { status: 400 }
        );
      }

      tempPassword = Math.random().toString(36).slice(-8) + "A1!";
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name: `${firstName} ${lastName}`,
          role: "EMPLOYEE",
        },
      });
      userId = user.id;

      // Send welcome email
      try {
        const emailResult = await sendNotificationEmail({
          to: email,
          subject: "Welcome to HRIS - Your Account Details",
          body: getWelcomeEmailTemplate(`${firstName} ${lastName}`, email, tempPassword),
        });
        emailSent = emailResult.success;
        if (!emailResult.success) {
          emailError = emailResult.message || "Unknown error";
          console.error(`Failed to send welcome email to ${email}:`, emailError);
        }
      } catch (err) {
        console.error(`Exception sending welcome email to ${email}:`, err);
        emailError = "Email service error";
      }
    }

    // Generate unique employee ID
    let employeeId = generateEmployeeId();
    let idExists = await prisma.employee.findUnique({ where: { employeeId } });
    while (idExists) {
      employeeId = generateEmployeeId();
      idExists = await prisma.employee.findUnique({ where: { employeeId } });
    }

    const employee = await prisma.employee.create({
      data: {
        employeeId,
        userId,
        firstName,
        lastName,
        middleName,
        email,
        mobileNumber,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender,
        civilStatus,
        nationality,
        placeOfBirth,
        currentAddress,
        permanentAddress,
        emergencyContactName,
        emergencyContactRelation,
        emergencyContactNumber,
        departmentId: departmentId || null,
        roleId: roleId || null,
        employmentType: employmentType || "FULL_TIME",
        employmentStatus: employmentStatus || "PROBATIONARY",
        dateHired: new Date(dateHired),
        regularizationDate: regularizationDate ? new Date(regularizationDate) : null,
        sssNumber,
        philHealthNumber,
        pagIbigNumber,
        tinNumber,
        bankName,
        bankAccountNumber,
      },
      include: {
        department: true,
        role: true,
      },
    });

    // Auto-assign leave balances from active leave type configs
    const currentYear = new Date().getFullYear();
    const activeConfigs = await prisma.leaveTypeConfig.findMany({
      where: { isActive: true },
    });
    const validLeaveTypes = ["ANNUAL", "SICK", "EMERGENCY", "WFH", "COMPASSIONATE"];
    const validConfigs = activeConfigs.filter((c) => validLeaveTypes.includes(c.code));

    if (validConfigs.length > 0) {
      await prisma.leaveBalance.createMany({
        data: validConfigs.map((config) => ({
          employeeId: employee.id,
          leaveType: config.code as any,
          balance: config.defaultBalance,
          used: 0,
          year: currentYear,
        })),
      });
    }

    return NextResponse.json({ 
      employee, 
      tempPassword,
      emailSent,
      emailError: emailError || undefined,
    }, { status: 201 });
  } catch (error) {
    console.error("Create employee error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}