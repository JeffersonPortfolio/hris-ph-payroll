import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting seed (multi-tenant)...");

  // ==================== SUPER ADMIN ====================
  const superAdminPassword = await bcrypt.hash("superadmin123", 12);
  const superAdmin = await prisma.user.upsert({
    where: { email: "superadmin@hris.local" },
    update: { role: "SUPER_ADMIN" },
    create: {
      email: "superadmin@hris.local",
      password: superAdminPassword,
      name: "Super Admin",
      role: "SUPER_ADMIN",
      isActive: true,
      // Super admin has no companyId
    },
  });
  console.log("Super admin created:", superAdmin.email);

  // ==================== SAMPLE COMPANY 1: Active ====================
  let company1 = await prisma.company.findFirst({ where: { name: "Acme Corporation" } });
  if (!company1) {
    company1 = await prisma.company.create({
      data: {
        name: "Acme Corporation",
        contactEmail: "admin@acme.ph",
        contactPhone: "+63 917 123 4567",
        employeeLimit: 100,
        subscriptionStatus: "ACTIVE",
        subscriptionType: "PREMIUM",
        isDemo: false,
      },
    });
  }
  console.log("Company 1 created:", company1.name);

  // ==================== SAMPLE COMPANY 2: Trial ====================
  const trialExpiry = new Date();
  trialExpiry.setDate(trialExpiry.getDate() + 7);

  let company2 = await prisma.company.findFirst({ where: { name: "StartupPH Inc." } });
  if (!company2) {
    company2 = await prisma.company.create({
      data: {
        name: "StartupPH Inc.",
        contactEmail: "hello@startupph.com",
        contactPhone: "+63 918 765 4321",
        employeeLimit: 25,
        subscriptionStatus: "TRIAL",
        subscriptionType: "TRIAL",
        isDemo: true,
        demoExpiresAt: trialExpiry,
      },
    });
  }
  console.log("Company 2 created:", company2.name);

  // ==================== DEPARTMENTS (per company) ====================
  const deptData = [
    { name: "Engineering", description: "Software development and technical operations" },
    { name: "Human Resources", description: "Employee relations and talent management" },
    { name: "Finance", description: "Financial planning and accounting" },
    { name: "Operations", description: "Business operations and administration" },
  ];

  for (const company of [company1, company2]) {
    for (const dept of deptData) {
      await prisma.department.upsert({
        where: { name_companyId: { name: dept.name, companyId: company.id } },
        update: {},
        create: { ...dept, companyId: company.id },
      });
    }
  }

  // Also create legacy departments (no companyId) for backward compatibility
  for (const dept of deptData) {
    const existing = await prisma.department.findFirst({
      where: { name: dept.name, companyId: null },
    });
    if (!existing) {
      await prisma.department.create({ data: dept });
    }
  }
  console.log("Departments created");

  // ==================== ROLES (per company) ====================
  const roleData = [
    { name: "Software Engineer", description: "Develops and maintains software applications" },
    { name: "HR Manager", description: "Manages human resources operations" },
    { name: "Finance Manager", description: "Manages financial operations and reporting" },
    { name: "Operations Manager", description: "Manages business operations" },
    { name: "Team Lead", description: "Leads a team of employees" },
    { name: "Staff", description: "General staff member" },
  ];

  for (const company of [company1, company2]) {
    for (const role of roleData) {
      await prisma.role.upsert({
        where: { name_companyId: { name: role.name, companyId: company.id } },
        update: {},
        create: { ...role, companyId: company.id },
      });
    }
  }

  // Also create legacy roles (no companyId) for backward compatibility
  for (const role of roleData) {
    const existing = await prisma.role.findFirst({
      where: { name: role.name, companyId: null },
    });
    if (!existing) {
      await prisma.role.create({ data: role });
    }
  }
  console.log("Job roles created");

  // ==================== USERS (assigned to company 1) ====================
  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@hris.local" },
    update: { companyId: company1.id },
    create: {
      email: "admin@hris.local",
      password: adminPassword,
      name: "System Admin",
      role: "ADMIN",
      isActive: true,
      companyId: company1.id,
    },
  });
  console.log("Admin user created:", admin.email, "-> Company:", company1.name);

  const hrPassword = await bcrypt.hash("hr123456", 12);
  const hrUser = await prisma.user.upsert({
    where: { email: "hr@hris.local" },
    update: { companyId: company1.id },
    create: {
      email: "hr@hris.local",
      password: hrPassword,
      name: "HR Manager",
      role: "HR",
      isActive: true,
      companyId: company1.id,
    },
  });
  console.log("HR user created:", hrUser.email, "-> Company:", company1.name);

  const finPassword = await bcrypt.hash("finance123", 12);
  const finUser = await prisma.user.upsert({
    where: { email: "finance@hris.local" },
    update: { companyId: company1.id },
    create: {
      email: "finance@hris.local",
      password: finPassword,
      name: "Finance Manager",
      role: "FINANCE",
      isActive: true,
      companyId: company1.id,
    },
  });
  console.log("Finance user created:", finUser.email, "-> Company:", company1.name);

  // Create admin for company 2
  const company2AdminPassword = await bcrypt.hash("startup123", 12);
  const company2Admin = await prisma.user.upsert({
    where: { email: "admin@startupph.com" },
    update: { companyId: company2.id },
    create: {
      email: "admin@startupph.com",
      password: company2AdminPassword,
      name: "StartupPH Admin",
      role: "ADMIN",
      isActive: true,
      companyId: company2.id,
    },
  });
  console.log("Company 2 admin created:", company2Admin.email, "-> Company:", company2.name);

  // ==================== SHARED DATA (loan types, allowance types, etc.) ====================
  // Global (companyId: null) shared data - use compound unique keys
  const loanTypes = [
    { name: "SSS Salary Loan", description: "SSS salary loan", maxTermMonths: 24, interestRate: 10 },
    { name: "SSS Calamity Loan", description: "SSS calamity loan", maxTermMonths: 24, interestRate: 10 },
    { name: "Pag-IBIG Multi-Purpose Loan", description: "Pag-IBIG MPL", maxTermMonths: 24, interestRate: 10.5 },
    { name: "Computer/Laptop Loan", description: "Company equipment loan", maxTermMonths: 12, interestRate: 0 },
    { name: "Company Cash Advance", description: "Cash advance from company", maxTermMonths: 6, interestRate: 0 },
  ];
  for (const lt of loanTypes) {
    const existing = await prisma.loanType.findFirst({ where: { name: lt.name, companyId: null } });
    if (!existing) {
      await prisma.loanType.create({ data: lt });
    }
  }
  console.log("Loan types created");

  const allowanceTypes = [
    { name: "Mobile/Load Allowance", description: "Monthly mobile phone allowance", isTaxable: false },
    { name: "Meal Allowance", description: "Daily meal allowance", isTaxable: false },
    { name: "Transportation Allowance", description: "Monthly transportation allowance", isTaxable: false },
    { name: "Performance Pay", description: "Performance-based bonus", isTaxable: true },
    { name: "Rice Subsidy", description: "Monthly rice subsidy", isTaxable: false },
  ];
  for (const at of allowanceTypes) {
    const existing = await prisma.allowanceType.findFirst({ where: { name: at.name, companyId: null } });
    if (!existing) {
      await prisma.allowanceType.create({ data: at });
    }
  }
  console.log("Allowance types created");

  const leaveConfigs = [
    { code: "ANNUAL", name: "Annual Leave", defaultBalance: 15, description: "Vacation/Annual leave" },
    { code: "SICK", name: "Sick Leave", defaultBalance: 15, description: "Sick leave" },
    { code: "EMERGENCY", name: "Emergency Leave", defaultBalance: 5, description: "Emergency leave" },
    { code: "WFH", name: "Work From Home", defaultBalance: 30, description: "Work from home" },
    { code: "COMPASSIONATE", name: "Compassionate Leave", defaultBalance: 5, description: "Bereavement/compassionate leave" },
  ];
  for (const lc of leaveConfigs) {
    const existing = await prisma.leaveTypeConfig.findFirst({ where: { code: lc.code, companyId: null } });
    if (!existing) {
      await prisma.leaveTypeConfig.create({ data: lc });
    }
  }
  console.log("Leave type configs created");

  const defaultSettings = [
    { key: "company_name", value: "Your Company Name", description: "Company name for payslips and reports" },
    { key: "company_address", value: "Company Address", description: "Company address for payslips" },
    { key: "payroll_period_mode", value: "SEMI_MONTHLY", description: "Payroll period: SEMI_MONTHLY, MONTHLY, BI_WEEKLY" },
    { key: "payroll_cutoff_1_start", value: "27", description: "1st cutoff start day (of previous month)" },
    { key: "payroll_cutoff_1_end", value: "10", description: "1st cutoff end day" },
    { key: "payroll_cutoff_2_start", value: "11", description: "2nd cutoff start day" },
    { key: "payroll_cutoff_2_end", value: "25", description: "2nd cutoff end day" },
    { key: "work_days_per_month", value: "22", description: "Working days per month for daily rate calculation" },
  ];

  for (const setting of defaultSettings) {
    const existing = await prisma.systemSettings.findFirst({ where: { key: setting.key, companyId: null } });
    if (!existing) {
      await prisma.systemSettings.create({ data: setting });
    }
  }
  console.log("System settings created");

  console.log("\n✅ Seed completed successfully!");
  console.log("\n=== Default Login Credentials ===");
  console.log("Super Admin: superadmin@hris.local / superadmin123");
  console.log("Admin:       admin@hris.local / admin123       -> Acme Corporation");
  console.log("HR:          hr@hris.local / hr123456          -> Acme Corporation");
  console.log("Finance:     finance@hris.local / finance123   -> Acme Corporation");
  console.log("StartupPH:   admin@startupph.com / startup123  -> StartupPH Inc.");
  console.log("=================================\n");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
