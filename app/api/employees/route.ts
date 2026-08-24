import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { generateEmployeeId } from "@/lib/utils";
import bcrypt from "bcryptjs";
import { sendNotificationEmail, getWelcomeEmailTemplate } from "@/lib/email";
import { getCompanyContext } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Get company context for tenant filtering
    const ctx = await getCompanyContext();
    if (!ctx) {
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

    // Apply company filter (tenant isolation)
    if (ctx.companyId) {
      where.companyId = ctx.companyId;
    }

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
    if (role !== "ADMIN" && role !== "HR" && role !== "SUPER_ADMIN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    // Get company context
    const ctx = await getCompanyContext();
    if (!ctx) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
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
        { message: "First name, last name, email and date hired are required." },
        { status: 400 }
      );
    }

    // Normalize the email so duplicate detection is case-insensitive and
    // whitespace-tolerant (a common source of "already exists" confusion).
    const normalizedEmail = String(email).trim().toLowerCase();

    // --- Duplicate detection (tenant-aware) ---------------------------------
    // Employee emails only need to be unique WITHIN a company. Checking
    // globally previously blocked creation when another company happened to
    // use the same email, even though that employee was invisible in this
    // company's (tenant-filtered) list.
    // Case-insensitive match catches legacy rows that were stored with mixed
    // casing before email normalization was introduced.
    const existingEmployee = await prisma.employee.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: "insensitive" },
        ...(ctx.companyId ? { companyId: ctx.companyId } : {}),
      },
      select: { id: true, isActive: true, firstName: true, lastName: true },
    });

    if (existingEmployee) {
      const message = existingEmployee.isActive
        ? `An active employee (${existingEmployee.firstName} ${existingEmployee.lastName}) with this email already exists in your company.`
        : `An inactive/archived employee (${existingEmployee.firstName} ${existingEmployee.lastName}) with this email already exists in your company. Please reactivate that record instead of creating a new one.`;
      return NextResponse.json({ message }, { status: 409 });
    }

    // If a user account is requested, inspect the User table. User.email is
    // GLOBALLY unique because NextAuth authenticates by email alone (there is
    // no company scoping at login), so the same email can never own two login
    // accounts. We therefore handle three cases explicitly so the admin gets
    // an ACTIONABLE message instead of a generic "already exists":
    //   1. Orphaned user (no linked employee) -> reclaim/relink it. This was
    //      the root cause of "account already exists" errors where nothing
    //      showed up in the employee list (a previous creation half-failed).
    //   2. User linked to an employee in ANOTHER company -> the record is
    //      invisible in this company's tenant-filtered list; say so clearly.
    //   3. User linked to an employee in THIS company -> genuine duplicate.
    let orphanUser: { id: string } | null = null;
    if (createUserAccount) {
      const existingUser = await prisma.user.findFirst({
        where: { email: { equals: normalizedEmail, mode: "insensitive" } },
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyId: true,
              isActive: true,
            },
          },
        },
      });

      if (existingUser) {
        const linked = existingUser.employee;
        if (linked) {
          const sameCompany =
            !ctx.companyId || linked.companyId === ctx.companyId;
          const message = sameCompany
            ? `A login account for this email already belongs to employee ${linked.firstName} ${linked.lastName} in your company.`
            : "This email is already registered as a login account under a different company. Login emails must be unique across the whole system — please use a different email address for this employee.";
          console.warn(
            `[EMPLOYEE] Blocked create for ${normalizedEmail}: user already linked to employee ${linked.id} (sameCompany=${sameCompany})`
          );
          return NextResponse.json({ message }, { status: 409 });
        }
        // Orphaned user - we'll re-link it inside the transaction.
        orphanUser = { id: existingUser.id };
        console.warn(
          `[EMPLOYEE] Reclaiming orphaned user account for ${normalizedEmail} (id=${existingUser.id})`
        );
      }
    }

    // Prepare credentials (hashing is CPU work - do it outside the transaction
    // to keep the DB transaction short).
    let tempPassword = "";
    let hashedPassword = "";
    if (createUserAccount) {
      tempPassword = Math.random().toString(36).slice(-8) + "A1!";
      hashedPassword = await bcrypt.hash(tempPassword, 10);
    }

    const currentYear = new Date().getFullYear();
    const validLeaveTypes = ["ANNUAL", "SICK", "EMERGENCY", "WFH", "COMPASSIONATE"];

    // --- Atomic creation ----------------------------------------------------
    // User + Employee + leave balances are created in a single transaction so
    // that a failure at any step never leaves an orphaned user behind.
    let result;
    try {
      result = await prisma.$transaction(async (tx) => {
        let userId: string | null = null;

        if (createUserAccount) {
          if (orphanUser) {
            const user = await tx.user.update({
              where: { id: orphanUser.id },
              data: {
                password: hashedPassword,
                name: `${firstName} ${lastName}`,
                role: "EMPLOYEE",
                isActive: true,
                companyId: ctx.companyId || null,
              },
            });
            userId = user.id;
          } else {
            const user = await tx.user.create({
              data: {
                email: normalizedEmail,
                password: hashedPassword,
                name: `${firstName} ${lastName}`,
                role: "EMPLOYEE",
                companyId: ctx.companyId || null,
              },
            });
            userId = user.id;
          }
        }

        // Generate a unique employee ID.
        let employeeId = generateEmployeeId();
        while (await tx.employee.findUnique({ where: { employeeId } })) {
          employeeId = generateEmployeeId();
        }

        const employee = await tx.employee.create({
          data: {
            employeeId,
            userId,
            firstName,
            lastName,
            middleName,
            email: normalizedEmail,
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
            regularizationDate: regularizationDate
              ? new Date(regularizationDate)
              : null,
            sssNumber,
            philHealthNumber,
            pagIbigNumber,
            tinNumber,
            bankName,
            bankAccountNumber,
            companyId: ctx.companyId || null,
          },
          include: {
            department: true,
            role: true,
          },
        });

        // Auto-assign leave balances from active leave type configs. Scope to
        // the company's own configs plus global (companyId: null) defaults.
        const activeConfigs = await tx.leaveTypeConfig.findMany({
          where: {
            isActive: true,
            OR: [{ companyId: ctx.companyId || null }, { companyId: null }],
          },
        });

        // De-duplicate by leave code (a company override should win over the
        // global default) and keep only supported leave types.
        const configByCode = new Map<string, (typeof activeConfigs)[number]>();
        for (const c of activeConfigs) {
          if (!validLeaveTypes.includes(c.code)) continue;
          const existing = configByCode.get(c.code);
          // Prefer the company-specific config over the global one.
          if (!existing || (c.companyId && !existing.companyId)) {
            configByCode.set(c.code, c);
          }
        }
        const validConfigs = Array.from(configByCode.values());

        if (validConfigs.length > 0) {
          await tx.leaveBalance.createMany({
            data: validConfigs.map((config) => ({
              employeeId: employee.id,
              leaveType: config.code as any,
              balance: config.defaultBalance,
              used: 0,
              year: currentYear,
            })),
            skipDuplicates: true,
          });
        }

        return { employee, userId };
      });
    } catch (txError: any) {
      console.error("[EMPLOYEE] Transaction failed:", txError);
      // Surface Prisma unique-constraint violations with a clear message.
      if (txError?.code === "P2002") {
        return NextResponse.json(
          {
            message:
              "A record with this email or employee ID already exists. Please try again.",
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { message: "Failed to create employee. Please try again." },
        { status: 500 }
      );
    }

    // --- Send welcome email (after the transaction has committed) -----------
    // Email failures never roll back the created account; the temp password is
    // always returned so the admin can share it manually.
    let emailSent = false;
    let emailError = "";
    if (createUserAccount && result.userId) {
      try {
        const emailResult = await sendNotificationEmail({
          to: normalizedEmail,
          subject: "Welcome to HRIS - Your Account Details",
          body: getWelcomeEmailTemplate(
            `${firstName} ${lastName}`,
            normalizedEmail,
            tempPassword
          ),
        });
        emailSent = emailResult.success;
        if (!emailResult.success) {
          emailError = emailResult.message || "Unknown error";
          console.error(
            `[EMPLOYEE] Failed to send welcome email to ${normalizedEmail}:`,
            emailError
          );
        }
      } catch (err: any) {
        console.error(
          `[EMPLOYEE] Exception sending welcome email to ${normalizedEmail}:`,
          err?.message || err
        );
        emailError = "Email service error";
      }
    }

    return NextResponse.json(
      {
        employee: result.employee,
        userAccountCreated: !!result.userId,
        tempPassword,
        emailSent,
        emailError: emailError || undefined,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create employee error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}