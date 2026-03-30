import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

// GET /api/super-admin/companies - List all companies
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const companies = await prisma.company.findMany({
      include: {
        _count: {
          select: {
            users: true,
            employees: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ companies });
  } catch (error) {
    console.error("Get companies error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/super-admin/companies - Create a new company
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      contactEmail,
      contactPhone,
      employeeLimit = 50,
      subscriptionType = "TRIAL",
      isDemo = false,
      demoDays = 7,
      // Admin user for the company
      adminName,
      adminEmail,
      adminPassword,
    } = body;

    if (!name) {
      return NextResponse.json(
        { message: "Company name is required" },
        { status: 400 }
      );
    }

    // Determine subscription status based on type
    let subscriptionStatus = "ACTIVE";
    let demoExpiresAt = null;
    if (subscriptionType === "TRIAL" || isDemo) {
      subscriptionStatus = "TRIAL";
      demoExpiresAt = new Date();
      demoExpiresAt.setDate(demoExpiresAt.getDate() + demoDays);
    }

    // Create company
    const company = await prisma.company.create({
      data: {
        name,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
        employeeLimit,
        subscriptionType: subscriptionType as any,
        subscriptionStatus: subscriptionStatus as any,
        isDemo: isDemo || subscriptionType === "TRIAL",
        demoExpiresAt,
      },
    });

    // Create admin user for the company if provided
    let adminUser = null;
    if (adminEmail && adminPassword) {
      // Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: adminEmail },
      });

      if (existingUser) {
        return NextResponse.json(
          { message: `User with email ${adminEmail} already exists` },
          { status: 400 }
        );
      }

      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      adminUser = await prisma.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: adminName || `${name} Admin`,
          role: "ADMIN",
          companyId: company.id,
          isActive: true,
        },
      });
    }

    // Create default departments for the company
    const defaultDepts = [
      { name: "Engineering", description: "Software development and technical operations" },
      { name: "Human Resources", description: "Employee relations and talent management" },
      { name: "Finance", description: "Financial planning and accounting" },
      { name: "Operations", description: "Business operations and administration" },
    ];

    for (const dept of defaultDepts) {
      await prisma.department.create({
        data: { ...dept, companyId: company.id },
      });
    }

    // Create default roles for the company
    const defaultRoles = [
      { name: "Software Engineer", description: "Develops and maintains software applications" },
      { name: "HR Manager", description: "Manages human resources operations" },
      { name: "Finance Manager", description: "Manages financial operations and reporting" },
      { name: "Operations Manager", description: "Manages business operations" },
      { name: "Team Lead", description: "Leads a team of employees" },
      { name: "Staff", description: "General staff member" },
    ];

    for (const role of defaultRoles) {
      await prisma.role.create({
        data: { ...role, companyId: company.id },
      });
    }

    return NextResponse.json(
      {
        company,
        adminUser: adminUser
          ? { id: adminUser.id, email: adminUser.email, name: adminUser.name }
          : null,
        message: "Company created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create company error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
