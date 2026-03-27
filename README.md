# HRIS Philippine Payroll System

A comprehensive Human Resource Information System (HRIS) with Philippine payroll calculations, built with Next.js 14, Prisma, and PostgreSQL.

## Features

### Existing Modules (Retained)
- **Dashboard** — Overview with stats, charts, and recent activity
- **Employee Management** — Full employee CRUD with profile, documents, and status tracking
- **Attendance & Timekeeping** — Clock in/out, attendance grid, overtime, night differential
- **Leave Management** — Leave requests, approvals, balances, calendar view
- **Work Schedules** — Flexible scheduling with department and employee assignments
- **Holidays** — Regular and special holiday management
- **Loans** — SSS, Pag-IBIG, company loans with amortization tracking
- **Allowances & Adjustments** — Employee allowances and payroll adjustments
- **Reports** — Department cost and leave reports
- **Office Locations** — Geofenced office location management
- **Notifications** — Real-time notification system
- **User Management** — User accounts with role-based access

### New: Philippine Payroll System
- **Automatic Payroll Calculations** using official contribution tables:
  - **SSS Contribution Table 2025** — Full bracket table with Regular SS, MPF, and EC
  - **PhilHealth Contribution Table 2024** — 5% rate with floor/ceiling
  - **Pag-IBIG Contribution Table 2021** — 1%/2% employee, 2% employer
  - **Withholding Tax Table 2026** — Daily/Weekly/Semi-Monthly/Monthly brackets
  - **Income Tax Table 2026** — Annual TRAIN Law brackets

- **Correct Payroll Logic:**
  - ✅ Employee share of SSS, PhilHealth, Pag-IBIG is **DEDUCTED** from salary
  - ✅ Employer share is **NOT added** to employee salary
  - ✅ Employer share is recorded separately in the **Finance module**
  - ✅ Withholding tax calculated automatically based on taxable compensation
  - ✅ Taxable income = Gross Earnings − Employee Mandatory Contributions

- **Configurable Payroll Periods:**
  - Semi-Monthly (default) — 2 cutoffs per month
  - Monthly — 1 payment per month
  - Bi-Weekly — Every 2 weeks

### New: Finance Module
- **Contribution Tables** — View all SSS, PhilHealth, Pag-IBIG, Withholding Tax, and Income Tax tables
- **Finance Summary** — Total gross, net pay, contributions per period
- **Tax Summary** — Withholding tax totals by month
- **Employer Expenses** — Per-employee employer share tracking
- **Quarterly/Annual Filtering** — Filter reports by Q1-Q4, specific months, or annual

### User Roles
| Role | Access |
|------|--------|
| **ADMIN** | Full access to all modules including system settings and user management |
| **HR** | Employee management, payroll, attendance, leaves, reports |
| **FINANCE** | Finance module (contribution tables, summaries, employer expenses) |
| **EMPLOYEE** | Personal dashboard, payslip, attendance, leave requests |

## Setup Instructions

### Prerequisites
- **Node.js** 18+ (recommended: 20+)
- **PostgreSQL** 14+ database
- **npm** or **yarn** package manager

### 1. Install Dependencies

```bash
cd /path/to/hris_ph_payroll
npm install
```

### 2. Configure Environment

Create/edit the `.env` file:

```env
# PostgreSQL connection string
DATABASE_URL="postgresql://username:password@localhost:5432/hris_payroll?connect_timeout=15"

# NextAuth secret (generate a random string)
NEXTAUTH_SECRET="your-random-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# Optional: AWS S3 for document storage
# AWS_REGION=us-west-2
# AWS_BUCKET_NAME=your-bucket-name
```

### 3. Setup Database

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push

# Seed the database with initial data (no employee records)
npx prisma db seed
```

### 4. Run the Application

```bash
# Development mode
npm run dev

# Or build and run production
npm run build
npm start
```

The app will be available at **http://localhost:3000**

### 5. Login with Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@hris.local | admin123 |
| HR Manager | hr@hris.local | hr123456 |
| Finance | finance@hris.local | finance123 |

### 6. Getting Started After Login

1. **As Admin/HR:** Go to **Settings** → Add employees with basic salary
2. **Create Payroll Period:** Go to **Payroll** → Create a period (Semi-Monthly/Monthly/Bi-Weekly)
3. **Lock Attendance:** Lock the attendance for the period
4. **Generate Payroll:** Click "Generate" — contributions and taxes are auto-calculated
5. **View Finance:** Go to **Finance** to see contribution summaries and employer expenses

## Payroll Calculation Flow

```
Gross Earnings = Basic Pay + OT + Holiday + Night Diff + Bonus + Allowances

Employee Deductions:
  - SSS (Employee Share)         → Deducted from salary
  - PhilHealth (Employee Share)  → Deducted from salary
  - Pag-IBIG (Employee Share)    → Deducted from salary
  - Withholding Tax              → Deducted from salary
  - Loans & Advances             → Deducted from salary

Net Pay = Gross Earnings + Adjustments − Total Deductions

Employer Share (Recorded in Finance, NOT in salary):
  - SSS (Employer)
  - PhilHealth (Employer)
  - Pag-IBIG (Employer)
  - EC (Employees' Compensation)
```

## Tech Stack

- **Frontend:** Next.js 14, React 18, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API Routes, Prisma ORM
- **Database:** PostgreSQL
- **Auth:** NextAuth.js with JWT
- **Charts:** Recharts, Chart.js
- **State:** React Query, Zustand

## Project Structure

```
hris_ph_payroll/
├── app/
│   ├── (auth)/          # Login, forgot password
│   ├── (dashboard)/     # All dashboard pages
│   │   ├── finance/     # NEW: Finance module
│   │   ├── payroll/     # Updated payroll with PH calculations
│   │   ├── settings/    # Updated with payroll period mode
│   │   └── ...          # Other existing modules
│   └── api/
│       ├── finance/     # NEW: Finance API routes
│       │   ├── contribution-tables/
│       │   ├── summary/
│       │   └── employer-expenses/
│       ├── payroll/     # Updated payroll API
│       └── ...          # Other existing APIs
├── lib/
│   ├── payroll-utils.ts # NEW: Complete PH payroll calculations
│   └── ...
├── prisma/
│   └── schema.prisma    # Updated with FINANCE role, new fields
└── scripts/
    └── seed.ts          # Clean seed (no employee data)
```
