/**
 * Ad-hoc test for the employee creation logic (multi-tenant + orphaned user).
 * Simulates the core DB logic of the POST /api/employees route directly
 * against the database to verify the fixes without needing HTTP/auth.
 */
import { prisma } from "../lib/db";
import bcrypt from "bcryptjs";

function genId() {
  return "EMP-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

/** Mirrors the fixed route logic. */
async function createEmployee(opts: {
  companyId: string | null;
  email: string;
  firstName: string;
  lastName: string;
  createUserAccount: boolean;
}) {
  const normalizedEmail = opts.email.trim().toLowerCase();

  const existingEmployee = await prisma.employee.findFirst({
    where: {
      email: normalizedEmail,
      ...(opts.companyId ? { companyId: opts.companyId } : {}),
    },
    select: { id: true, isActive: true },
  });
  if (existingEmployee) {
    return { status: 409, message: "Employee email exists in company" };
  }

  let orphanUser: { id: string } | null = null;
  if (opts.createUserAccount) {
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { employee: { select: { id: true } } },
    });
    if (existingUser) {
      if (existingUser.employee) {
        return { status: 409, message: "User linked to another employee" };
      }
      orphanUser = { id: existingUser.id };
    }
  }

  let hashed = "";
  if (opts.createUserAccount) hashed = await bcrypt.hash("Temp123!A1!", 10);

  const result = await prisma.$transaction(async (tx) => {
    let userId: string | null = null;
    if (opts.createUserAccount) {
      if (orphanUser) {
        const u = await tx.user.update({
          where: { id: orphanUser.id },
          data: { password: hashed, name: `${opts.firstName} ${opts.lastName}`, role: "EMPLOYEE", isActive: true, companyId: opts.companyId },
        });
        userId = u.id;
      } else {
        const u = await tx.user.create({
          data: { email: normalizedEmail, password: hashed, name: `${opts.firstName} ${opts.lastName}`, role: "EMPLOYEE", companyId: opts.companyId },
        });
        userId = u.id;
      }
    }
    let employeeId = genId();
    while (await tx.employee.findUnique({ where: { employeeId } })) employeeId = genId();
    const employee = await tx.employee.create({
      data: {
        employeeId,
        userId,
        firstName: opts.firstName,
        lastName: opts.lastName,
        email: normalizedEmail,
        dateHired: new Date(),
        companyId: opts.companyId,
      },
    });
    return { employee, userId };
  });
  return { status: 201, employeeId: result.employee.id, userId: result.userId };
}

async function main() {
  const companies = await prisma.company.findMany({ select: { id: true, name: true } });
  const [coA, coB] = companies;
  console.log("Companies:", coA?.name, "/", coB?.name);

  const uniq = Date.now();
  const emailA = `test.${uniq}@coa.test`;
  const emailCross = `shared.${uniq}@both.test`;
  const emailOrphan = `orphan.${uniq}@coa.test`;

  const pass = (n: string) => console.log(`  \u2713 PASS: ${n}`);
  const fail = (n: string, d?: any) => { console.log(`  \u2717 FAIL: ${n}`, d ?? ""); process.exitCode = 1; };

  // TEST 1: create a brand-new employee with user account
  console.log("\n[TEST 1] New employee + user account");
  const r1 = await createEmployee({ companyId: coA.id, email: emailA, firstName: "Alice", lastName: "A", createUserAccount: true });
  r1.status === 201 && r1.userId ? pass("created with user") : fail("create new", r1);

  // TEST 2: duplicate email in same company -> rejected
  console.log("\n[TEST 2] Duplicate email in same company");
  const r2 = await createEmployee({ companyId: coA.id, email: emailA, firstName: "Alice", lastName: "Dup", createUserAccount: false });
  r2.status === 409 ? pass("duplicate rejected") : fail("should reject duplicate", r2);

  // TEST 3: SAME employee email in a DIFFERENT company -> allowed (no user acct to avoid global unique)
  console.log("\n[TEST 3] Same email, different company (employee only)");
  const r3 = await createEmployee({ companyId: coB.id, email: emailCross, firstName: "Bob", lastName: "B", createUserAccount: false });
  const r3b = await createEmployee({ companyId: coA.id, email: emailCross, firstName: "Bob", lastName: "B", createUserAccount: false });
  r3.status === 201 && r3b.status === 201 ? pass("same email allowed across companies") : fail("cross-company employee", { r3, r3b });

  // TEST 4: orphaned user reuse (simulate prior failed creation)
  console.log("\n[TEST 4] Orphaned user gets reused (not blocked)");
  await prisma.user.create({ data: { email: emailOrphan, password: await bcrypt.hash("x", 10), name: "Orphan", role: "EMPLOYEE", companyId: coA.id } });
  const orphanBefore = await prisma.user.findUnique({ where: { email: emailOrphan }, include: { employee: true } });
  const r4 = await createEmployee({ companyId: coA.id, email: emailOrphan, firstName: "Carol", lastName: "C", createUserAccount: true });
  const orphanAfter = await prisma.user.findUnique({ where: { email: emailOrphan }, include: { employee: true } });
  const allUsersWithEmail = await prisma.user.findMany({ where: { email: emailOrphan } });
  if (r4.status === 201 && orphanAfter?.employee && allUsersWithEmail.length === 1 && orphanBefore?.id === orphanAfter?.id) {
    pass("orphaned user reused & linked (no duplicate user)");
  } else {
    fail("orphan reuse", { r4, orphanReused: orphanBefore?.id === orphanAfter?.id, userCount: allUsersWithEmail.length });
  }

  // TEST 5: genuine duplicate user (already linked) -> rejected
  console.log("\n[TEST 5] User already linked to an employee -> rejected");
  const r5 = await createEmployee({ companyId: coA.id, email: emailOrphan, firstName: "Carol", lastName: "Dup", createUserAccount: true });
  r5.status === 409 ? pass("linked user duplicate rejected") : fail("should reject linked user", r5);

  // Cleanup test data
  console.log("\n[CLEANUP]");
  const emails = [emailA, emailCross, emailOrphan];
  await prisma.employee.deleteMany({ where: { email: { in: emails } } });
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
  console.log("  cleaned up test rows");

  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
