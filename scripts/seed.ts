import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting seed (clean - no employee data)...");

  // Create departments
  const departments = await Promise.all([
    prisma.department.upsert({
      where: { name: "Engineering" },
      update: {},
      create: { name: "Engineering", description: "Software development and technical operations" },
    }),
    prisma.department.upsert({
      where: { name: "Human Resources" },
      update: {},
      create: { name: "Human Resources", description: "Employee relations and talent management" },
    }),
    prisma.department.upsert({
      where: { name: "Finance" },
      update: {},
      create: { name: "Finance", description: "Financial planning and accounting" },
    }),
    prisma.department.upsert({
      where: { name: "Operations" },
      update: {},
      create: { name: "Operations", description: "Business operations and administration" },
    }),
  ]);
  console.log("Departments created:", departments.length);

  // Create roles (job titles)
  const roles = await Promise.all([
    prisma.role.upsert({ where: { name: "Software Engineer" }, update: {}, create: { name: "Software Engineer", description: "Develops and maintains software applications" } }),
    prisma.role.upsert({ where: { name: "HR Manager" }, update: {}, create: { name: "HR Manager", description: "Manages human resources operations" } }),
    prisma.role.upsert({ where: { name: "Finance Manager" }, update: {}, create: { name: "Finance Manager", description: "Manages financial operations and reporting" } }),
    prisma.role.upsert({ where: { name: "Operations Manager" }, update: {}, create: { name: "Operations Manager", description: "Manages business operations" } }),
    prisma.role.upsert({ where: { name: "Team Lead" }, update: {}, create: { name: "Team Lead", description: "Leads a team of employees" } }),
    prisma.role.upsert({ where: { name: "Staff" }, update: {}, create: { name: "Staff", description: "General staff member" } }),
  ]);
  console.log("Job roles created:", roles.length);

  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@hris.local" },
    update: {},
    create: {
      email: "admin@hris.local",
      password: adminPassword,
      name: "System Admin",
      role: "ADMIN",
      isActive: true,
    },
  });
  console.log("Admin user created:", admin.email);

  // Create HR user
  const hrPassword = await bcrypt.hash("hr123456", 12);
  const hrUser = await prisma.user.upsert({
    where: { email: "hr@hris.local" },
    update: {},
    create: {
      email: "hr@hris.local",
      password: hrPassword,
      name: "HR Manager",
      role: "HR",
      isActive: true,
    },
  });
  console.log("HR user created:", hrUser.email);

  // Create Finance user
  const finPassword = await bcrypt.hash("finance123", 12);
  const finUser = await prisma.user.upsert({
    where: { email: "finance@hris.local" },
    update: {},
    create: {
      email: "finance@hris.local",
      password: finPassword,
      name: "Finance Manager",
      role: "FINANCE",
      isActive: true,
    },
  });
  console.log("Finance user created:", finUser.email);

  // Create loan types
  await Promise.all([
    prisma.loanType.upsert({ where: { name: "SSS Salary Loan" }, update: {}, create: { name: "SSS Salary Loan", description: "SSS salary loan", maxTermMonths: 24, interestRate: 10 } }),
    prisma.loanType.upsert({ where: { name: "SSS Calamity Loan" }, update: {}, create: { name: "SSS Calamity Loan", description: "SSS calamity loan", maxTermMonths: 24, interestRate: 10 } }),
    prisma.loanType.upsert({ where: { name: "Pag-IBIG Multi-Purpose Loan" }, update: {}, create: { name: "Pag-IBIG Multi-Purpose Loan", description: "Pag-IBIG MPL", maxTermMonths: 24, interestRate: 10.5 } }),
    prisma.loanType.upsert({ where: { name: "Computer/Laptop Loan" }, update: {}, create: { name: "Computer/Laptop Loan", description: "Company equipment loan", maxTermMonths: 12, interestRate: 0 } }),
    prisma.loanType.upsert({ where: { name: "Company Cash Advance" }, update: {}, create: { name: "Company Cash Advance", description: "Cash advance from company", maxTermMonths: 6, interestRate: 0 } }),
  ]);
  console.log("Loan types created");

  // Create allowance types
  await Promise.all([
    prisma.allowanceType.upsert({ where: { name: "Mobile/Load Allowance" }, update: {}, create: { name: "Mobile/Load Allowance", description: "Monthly mobile phone allowance", isTaxable: false } }),
    prisma.allowanceType.upsert({ where: { name: "Meal Allowance" }, update: {}, create: { name: "Meal Allowance", description: "Daily meal allowance", isTaxable: false } }),
    prisma.allowanceType.upsert({ where: { name: "Transportation Allowance" }, update: {}, create: { name: "Transportation Allowance", description: "Monthly transportation allowance", isTaxable: false } }),
    prisma.allowanceType.upsert({ where: { name: "Performance Pay" }, update: {}, create: { name: "Performance Pay", description: "Performance-based bonus", isTaxable: true } }),
    prisma.allowanceType.upsert({ where: { name: "Rice Subsidy" }, update: {}, create: { name: "Rice Subsidy", description: "Monthly rice subsidy", isTaxable: false } }),
  ]);
  console.log("Allowance types created");

  // Create leave type configs
  await Promise.all([
    prisma.leaveTypeConfig.upsert({ where: { code: "ANNUAL" }, update: {}, create: { code: "ANNUAL", name: "Annual Leave", defaultBalance: 15, description: "Vacation/Annual leave" } }),
    prisma.leaveTypeConfig.upsert({ where: { code: "SICK" }, update: {}, create: { code: "SICK", name: "Sick Leave", defaultBalance: 15, description: "Sick leave" } }),
    prisma.leaveTypeConfig.upsert({ where: { code: "EMERGENCY" }, update: {}, create: { code: "EMERGENCY", name: "Emergency Leave", defaultBalance: 5, description: "Emergency leave" } }),
    prisma.leaveTypeConfig.upsert({ where: { code: "WFH" }, update: {}, create: { code: "WFH", name: "Work From Home", defaultBalance: 30, description: "Work from home" } }),
    prisma.leaveTypeConfig.upsert({ where: { code: "COMPASSIONATE" }, update: {}, create: { code: "COMPASSIONATE", name: "Compassionate Leave", defaultBalance: 5, description: "Bereavement/compassionate leave" } }),
  ]);
  console.log("Leave type configs created");

  // Create default system settings
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
    await prisma.systemSettings.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
  console.log("System settings created");

  console.log("\n✅ Seed completed successfully!");
  console.log("\n=== Default Login Credentials ===");
  console.log("Admin:   admin@hris.local / admin123");
  console.log("HR:      hr@hris.local / hr123456");
  console.log("Finance: finance@hris.local / finance123");
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
