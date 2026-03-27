import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting seed...");

  // Create departments
  const departments = await Promise.all([
    prisma.department.upsert({
      where: { name: "Engineering" },
      update: {},
      create: {
        name: "Engineering",
        description: "Software development and technical operations",
      },
    }),
    prisma.department.upsert({
      where: { name: "Human Resources" },
      update: {},
      create: {
        name: "Human Resources",
        description: "Employee relations and talent management",
      },
    }),
    prisma.department.upsert({
      where: { name: "Finance" },
      update: {},
      create: {
        name: "Finance",
        description: "Financial planning and accounting",
      },
    }),
    prisma.department.upsert({
      where: { name: "Operations" },
      update: {},
      create: {
        name: "Operations",
        description: "Business operations and administration",
      },
    }),
  ]);

  console.log("Departments created:", departments.length);

  // Create roles
  const roles = await Promise.all([
    prisma.role.upsert({
      where: { name: "Software Engineer" },
      update: {},
      create: {
        name: "Software Engineer",
        description: "Develops and maintains software applications",
      },
    }),
    prisma.role.upsert({
      where: { name: "HR Manager" },
      update: {},
      create: {
        name: "HR Manager",
        description: "Manages HR operations and employee relations",
      },
    }),
    prisma.role.upsert({
      where: { name: "Accountant" },
      update: {},
      create: {
        name: "Accountant",
        description: "Handles financial records and reporting",
      },
    }),
    prisma.role.upsert({
      where: { name: "Project Manager" },
      update: {},
      create: {
        name: "Project Manager",
        description: "Coordinates project delivery and team resources",
      },
    }),
    prisma.role.upsert({
      where: { name: "Admin Assistant" },
      update: {},
      create: {
        name: "Admin Assistant",
        description: "Provides administrative support",
      },
    }),
  ]);

  console.log("Roles created:", roles.length);

  // Create admin user
  const adminPassword = await bcrypt.hash("johndoe123", 10);
  const adminUser = await prisma.user.upsert({
    where: { email: "john@doe.com" },
    update: {},
    create: {
      email: "john@doe.com",
      password: adminPassword,
      name: "John Doe",
      role: "ADMIN",
    },
  });

  console.log("Admin user created:", adminUser.email);

  // Create admin employee record
  const adminEmployee = await prisma.employee.upsert({
    where: { employeeId: "EMP-2024-0000" },
    update: {
      departmentId: departments[3].id, // Operations
      roleId: roles[3].id, // Project Manager
    },
    create: {
      employeeId: "EMP-2024-0000",
      userId: adminUser.id,
      firstName: "John",
      lastName: "Doe",
      email: "john@doe.com",
      mobileNumber: "+63 917 000 0000",
      dateOfBirth: new Date("1980-01-01"),
      gender: "MALE" as const,
      civilStatus: "SINGLE" as const,
      nationality: "Filipino",
      currentAddress: "Admin Office, Makati City, Metro Manila",
      departmentId: departments[3].id, // Operations
      roleId: roles[3].id, // Project Manager
      employmentType: "FULL_TIME",
      employmentStatus: "REGULAR" as const,
      dateHired: new Date("2019-01-01"),
      regularizationDate: new Date("2019-07-01"),
      sssNumber: "00-0000000-0",
      philHealthNumber: "00-000000000-0",
      pagIbigNumber: "0000-0000-0000",
      tinNumber: "000-000-000-000",
    },
  });

  console.log("Admin employee created:", adminEmployee.employeeId);

  // Create HR user
  const hrPassword = await bcrypt.hash("hrmanager123", 10);
  const hrUser = await prisma.user.upsert({
    where: { email: "hr@company.com" },
    update: {},
    create: {
      email: "hr@company.com",
      password: hrPassword,
      name: "Maria Santos",
      role: "HR",
    },
  });

  // Create HR employee
  const hrEmployee = await prisma.employee.upsert({
    where: { employeeId: "EMP-2024-0001" },
    update: {},
    create: {
      employeeId: "EMP-2024-0001",
      userId: hrUser.id,
      firstName: "Maria",
      lastName: "Santos",
      email: "hr@company.com",
      mobileNumber: "+63 917 123 4567",
      dateOfBirth: new Date("1985-05-15"),
      gender: "FEMALE" as const,
      civilStatus: "MARRIED" as const,
      nationality: "Filipino",
      currentAddress: "123 HR Street, Makati City, Metro Manila",
      departmentId: departments[1].id, // HR
      roleId: roles[1].id, // HR Manager
      employmentType: "FULL_TIME",
      employmentStatus: "REGULAR" as const,
      dateHired: new Date("2020-01-15"),
      regularizationDate: new Date("2020-07-15"),
      sssNumber: "12-3456789-0",
      philHealthNumber: "12-345678901-2",
      pagIbigNumber: "1234-5678-9012",
      tinNumber: "123-456-789-000",
    },
  });

  console.log("HR employee created:", hrEmployee.employeeId);

  // Create sample employees
  const sampleEmployees = [
    {
      employeeId: "EMP-2024-0002",
      firstName: "Juan",
      lastName: "Dela Cruz",
      email: "juan.delacruz@company.com",
      gender: "MALE" as const,
      civilStatus: "SINGLE" as const,
      departmentId: departments[0].id, // Engineering
      roleId: roles[0].id, // Software Engineer
      employmentStatus: "REGULAR" as const,
      dateHired: new Date("2021-03-01"),
      regularizationDate: new Date("2021-09-01"),
    },
    {
      employeeId: "EMP-2024-0003",
      firstName: "Ana",
      lastName: "Reyes",
      email: "ana.reyes@company.com",
      gender: "FEMALE" as const,
      civilStatus: "SINGLE" as const,
      departmentId: departments[2].id, // Finance
      roleId: roles[2].id, // Accountant
      employmentStatus: "REGULAR" as const,
      dateHired: new Date("2022-01-10"),
      regularizationDate: new Date("2022-07-10"),
    },
    {
      employeeId: "EMP-2024-0004",
      firstName: "Carlos",
      lastName: "Garcia",
      email: "carlos.garcia@company.com",
      gender: "MALE" as const,
      civilStatus: "MARRIED" as const,
      departmentId: departments[0].id, // Engineering
      roleId: roles[3].id, // Project Manager
      employmentStatus: "REGULAR" as const,
      dateHired: new Date("2019-06-15"),
      regularizationDate: new Date("2019-12-15"),
    },
    {
      employeeId: "EMP-2024-0005",
      firstName: "Patricia",
      lastName: "Lim",
      email: "patricia.lim@company.com",
      gender: "FEMALE" as const,
      civilStatus: "SINGLE" as const,
      departmentId: departments[3].id, // Operations
      roleId: roles[4].id, // Admin Assistant
      employmentStatus: "PROBATIONARY" as const,
      dateHired: new Date("2025-10-01"),
    },
    {
      employeeId: "EMP-2024-0006",
      firstName: "Miguel",
      lastName: "Torres",
      email: "miguel.torres@company.com",
      gender: "MALE" as const,
      civilStatus: "SINGLE" as const,
      departmentId: departments[0].id, // Engineering
      roleId: roles[0].id, // Software Engineer
      employmentStatus: "PROBATIONARY" as const,
      dateHired: new Date("2025-11-15"),
    },
  ];

  for (const emp of sampleEmployees) {
    const password = await bcrypt.hash("employee123", 10);
    const user = await prisma.user.upsert({
      where: { email: emp.email },
      update: {},
      create: {
        email: emp.email,
        password,
        name: `${emp.firstName} ${emp.lastName}`,
        role: "EMPLOYEE",
      },
    });

    await prisma.employee.upsert({
      where: { employeeId: emp.employeeId },
      update: {},
      create: {
        ...emp,
        userId: user.id,
        nationality: "Filipino",
        employmentType: "FULL_TIME",
      },
    });
  }

  console.log("Sample employees created:", sampleEmployees.length);

  // Create leave balances for all employees
  const currentYear = new Date().getFullYear();
  const allEmployees = await prisma.employee.findMany();
  const leaveTypes = ["ANNUAL", "SICK", "EMERGENCY", "WFH", "COMPASSIONATE"];
  const defaultBalances: Record<string, number> = {
    ANNUAL: 13,
    SICK: 5,
    EMERGENCY: 3,
    WFH: 12,
    COMPASSIONATE: 5,
  };

  for (const employee of allEmployees) {
    for (const leaveType of leaveTypes) {
      await prisma.leaveBalance.upsert({
        where: {
          employeeId_leaveType_year: {
            employeeId: employee.id,
            leaveType: leaveType as any,
            year: currentYear,
          },
        },
        update: {},
        create: {
          employeeId: employee.id,
          leaveType: leaveType as any,
          balance: defaultBalances[leaveType],
          used: 0,
          year: currentYear,
        },
      });
    }
  }

  console.log("Leave balances created for all employees");

  // Create sample attendance records (last 7 days)
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    for (const employee of allEmployees) {
      // Random clock-in between 8:30 and 10:30 PHT
      // PHT = UTC+8, so we subtract 8 hours to store in UTC
      const clockInHourPHT = Math.random() > 0.2 ? (Math.random() > 0.5 ? 8 : 9) : 10;
      const clockInMinutePHT = Math.floor(Math.random() * 60);
      // Create the date in UTC representing the PHT time
      const clockIn = new Date(Date.UTC(
        date.getFullYear(), date.getMonth(), date.getDate(),
        clockInHourPHT - 8, clockInMinutePHT, 0, 0
      ));

      // Clock out between 17:00 and 19:00 PHT
      const clockOutHourPHT = 17 + Math.floor(Math.random() * 2);
      const clockOutMinutePHT = Math.floor(Math.random() * 60);
      const clockOut = new Date(Date.UTC(
        date.getFullYear(), date.getMonth(), date.getDate(),
        clockOutHourPHT - 8, clockOutMinutePHT, 0, 0
      ));

      // Late threshold: 10:00 AM PHT (flexible window 9-10AM is NOT late)
      const isLate = clockInHourPHT > 10 || (clockInHourPHT === 10 && clockInMinutePHT > 0);
      const lateMinutes = isLate
        ? (clockInHourPHT * 60 + clockInMinutePHT) - (10 * 60)
        : 0;
      
      // Calculate total hours within 9AM-7PM PHT window, capped at 9 required hours
      const windowStartUTC = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 1, 0, 0, 0)); // 9AM PHT
      const windowEndUTC = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 11, 0, 0, 0)); // 7PM PHT
      const effectiveStart = clockIn.getTime() < windowStartUTC.getTime() ? windowStartUTC : clockIn;
      const effectiveEnd = clockOut.getTime() > windowEndUTC.getTime() ? windowEndUTC : clockOut;
      const rawHours = effectiveStart.getTime() >= effectiveEnd.getTime() ? 0 :
        (effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60);
      const requiredHours = 9;
      const totalHours = Math.min(rawHours, requiredHours);
      // No overtime recording - always 0
      const overtimeMinutes = 0;
      // Undertime: if worked less than 9 hours
      const undertimeMinutes = rawHours < requiredHours ? Math.round((requiredHours - rawHours) * 60) : 0;

      await prisma.attendance.upsert({
        where: {
          employeeId_date: {
            employeeId: employee.id,
            date,
          },
        },
        update: {},
        create: {
          employeeId: employee.id,
          date,
          clockIn,
          clockOut,
          totalHours: Math.round(totalHours * 100) / 100,
          overtimeMinutes,
          undertimeMinutes,
          status: isLate ? "LATE" : "PRESENT",
          lateMinutes,
        },
      });
    }
  }

  console.log("Sample attendance records created");

  // Create sample leave requests
  const leaveRequests = [
    {
      employeeId: allEmployees[0]?.id,
      leaveType: "ANNUAL",
      startDate: new Date("2026-02-01"),
      endDate: new Date("2026-02-03"),
      totalDays: 3,
      reason: "Family vacation",
      status: "APPROVED",
    },
    {
      employeeId: allEmployees[1]?.id,
      leaveType: "SICK",
      startDate: new Date("2026-01-20"),
      endDate: new Date("2026-01-20"),
      totalDays: 1,
      reason: "Not feeling well",
      status: "PENDING",
    },
    {
      employeeId: allEmployees[2]?.id,
      leaveType: "WFH",
      startDate: new Date("2026-01-15"),
      endDate: new Date("2026-01-15"),
      totalDays: 1,
      reason: "Waiting for delivery",
      status: "APPROVED",
    },
  ];

  for (const leave of leaveRequests) {
    if (!leave.employeeId) continue;
    await prisma.leave.create({
      data: {
        employeeId: leave.employeeId,
        leaveType: leave.leaveType as any,
        startDate: leave.startDate,
        endDate: leave.endDate,
        totalDays: leave.totalDays,
        reason: leave.reason,
        status: leave.status as any,
      },
    });
  }

  console.log("Sample leave requests created");

  // Create default work schedule
  const defaultSchedule = await prisma.workSchedule.upsert({
    where: { name: "Regular Shift" },
    update: {},
    create: {
      name: "Regular Shift",
      description: "Standard 9 AM to 6 PM work schedule, Monday to Friday",
      mondayStart: "09:00",
      mondayEnd: "18:00",
      tuesdayStart: "09:00",
      tuesdayEnd: "18:00",
      wednesdayStart: "09:00",
      wednesdayEnd: "18:00",
      thursdayStart: "09:00",
      thursdayEnd: "18:00",
      fridayStart: "09:00",
      fridayEnd: "18:00",
      saturdayStart: null,
      saturdayEnd: null,
      sundayStart: null,
      sundayEnd: null,
      breakMinutes: 60,
      lateGracePeriod: 15,
      isDefault: true,
    },
  });

  await prisma.workSchedule.upsert({
    where: { name: "Flexible Shift" },
    update: {},
    create: {
      name: "Flexible Shift",
      description: "Flexible work hours with core hours 10 AM to 4 PM",
      mondayStart: "08:00",
      mondayEnd: "17:00",
      tuesdayStart: "08:00",
      tuesdayEnd: "17:00",
      wednesdayStart: "08:00",
      wednesdayEnd: "17:00",
      thursdayStart: "08:00",
      thursdayEnd: "17:00",
      fridayStart: "08:00",
      fridayEnd: "17:00",
      saturdayStart: null,
      saturdayEnd: null,
      sundayStart: null,
      sundayEnd: null,
      breakMinutes: 60,
      lateGracePeriod: 30,
      isDefault: false,
    },
  });

  console.log("Work schedules created");

  // Create Singapore holidays for 2026
  const singaporeHolidays2026 = [
    { name: "New Year's Day", date: "2026-01-01", type: "REGULAR" },
    { name: "Chinese New Year", date: "2026-02-17", type: "REGULAR" },
    { name: "Chinese New Year (Day 2)", date: "2026-02-18", type: "REGULAR" },
    { name: "Hari Raya Puasa", date: "2026-03-20", type: "REGULAR" },
    { name: "Good Friday", date: "2026-04-03", type: "REGULAR" },
    { name: "Labour Day", date: "2026-05-01", type: "REGULAR" },
    { name: "Hari Raya Haji", date: "2026-05-27", type: "REGULAR" },
    { name: "Vesak Day", date: "2026-05-31", type: "REGULAR" },
    { name: "National Day", date: "2026-08-09", type: "REGULAR" },
    { name: "Deepavali", date: "2026-11-08", type: "REGULAR" },
    { name: "Christmas Day", date: "2026-12-25", type: "REGULAR" },
  ];

  for (const holiday of singaporeHolidays2026) {
    const holidayDate = new Date(holiday.date);
    try {
      await prisma.holiday.upsert({
        where: {
          date_name: {
            date: holidayDate,
            name: holiday.name,
          },
        },
        update: {},
        create: {
          name: holiday.name,
          date: holidayDate,
          type: holiday.type as "REGULAR" | "SPECIAL",
          year: holidayDate.getFullYear(),
          isRecurring: false,
        },
      });
    } catch (e) {
      // Skip if already exists
    }
  }

  console.log("Singapore holidays 2026 created");

  // Create default allowance types
  const allowanceTypes = [
    { name: "Mobile/Load Allowance", description: "Monthly mobile phone and data allowance", isTaxable: false },
    { name: "Performance Pay", description: "Performance-based incentive pay", isTaxable: true },
    { name: "Transportation Allowance", description: "Daily transportation allowance", isTaxable: false },
    { name: "Meal Allowance", description: "Daily meal allowance", isTaxable: false },
    { name: "Rice Allowance", description: "Monthly rice subsidy", isTaxable: false },
  ];

  for (const allowance of allowanceTypes) {
    await prisma.allowanceType.upsert({
      where: { name: allowance.name },
      update: {},
      create: allowance,
    });
  }

  console.log("Allowance types created:", allowanceTypes.length);

  // Create default loan types
  const loanTypes = [
    { name: "Salary Loan", description: "General purpose salary loan", maxAmount: 50000, maxTermMonths: 24, interestRate: 6 },
    { name: "Computer/Laptop Loan", description: "Loan for computer or laptop purchase", maxAmount: 80000, maxTermMonths: 24, interestRate: 0 },
    { name: "Emergency Loan", description: "Emergency financial assistance", maxAmount: 20000, maxTermMonths: 12, interestRate: 3 },
  ];

  for (const loan of loanTypes) {
    await prisma.loanType.upsert({
      where: { name: loan.name },
      update: {},
      create: loan,
    });
  }

  console.log("Loan types created:", loanTypes.length);

  // Create sample office location
  await prisma.officeLocation.upsert({
    where: { name: "Main Office" },
    update: {},
    create: {
      name: "Main Office",
      address: "123 Business Park, Singapore 123456",
      latitude: 1.3521,
      longitude: 103.8198,
      radiusMeters: 100,
      isActive: true,
    },
  });

  console.log("Sample office location created");

  // Seed leave type configurations
  const leaveTypeConfigs = [
    { code: "ANNUAL", name: "Annual Leave", defaultBalance: 13, description: "Vacation / annual leave" },
    { code: "SICK", name: "Sick Leave", defaultBalance: 5, description: "Sick leave" },
    { code: "EMERGENCY", name: "Emergency Leave", defaultBalance: 3, description: "Emergency leave" },
    { code: "WFH", name: "Work From Home", defaultBalance: 12, description: "Work from home days" },
    { code: "COMPASSIONATE", name: "Compassionate Leave", defaultBalance: 5, description: "Bereavement / compassionate leave" },
  ];

  for (const ltc of leaveTypeConfigs) {
    await prisma.leaveTypeConfig.upsert({
      where: { code: ltc.code },
      update: { name: ltc.name, defaultBalance: ltc.defaultBalance, description: ltc.description },
      create: ltc,
    });
  }
  console.log("Leave type configs seeded");

  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });