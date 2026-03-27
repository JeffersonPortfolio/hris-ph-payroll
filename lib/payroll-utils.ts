// Philippine Government Contribution Tables and Payroll Calculations

// ============== SSS CONTRIBUTION TABLE 2025 (with EC) ==============
// Based on SSS Circular 2024-006 - Effective January 2025
// Employer SS rate: 10% of MSC, EC: ₱10 (MSC < ₱15,000) or ₱30 (MSC >= ₱15,000)
const SSS_TABLE_2025 = [
  { minSalary: 0, maxSalary: 4249.99, msc: 4000, ee: 180, erSS: 400, ec: 10 },
  { minSalary: 4250, maxSalary: 4749.99, msc: 4500, ee: 202.50, erSS: 450, ec: 10 },
  { minSalary: 4750, maxSalary: 5249.99, msc: 5000, ee: 225, erSS: 500, ec: 10 },
  { minSalary: 5250, maxSalary: 5749.99, msc: 5500, ee: 247.50, erSS: 550, ec: 10 },
  { minSalary: 5750, maxSalary: 6249.99, msc: 6000, ee: 270, erSS: 600, ec: 10 },
  { minSalary: 6250, maxSalary: 6749.99, msc: 6500, ee: 292.50, erSS: 650, ec: 10 },
  { minSalary: 6750, maxSalary: 7249.99, msc: 7000, ee: 315, erSS: 700, ec: 10 },
  { minSalary: 7250, maxSalary: 7749.99, msc: 7500, ee: 337.50, erSS: 750, ec: 10 },
  { minSalary: 7750, maxSalary: 8249.99, msc: 8000, ee: 360, erSS: 800, ec: 10 },
  { minSalary: 8250, maxSalary: 8749.99, msc: 8500, ee: 382.50, erSS: 850, ec: 10 },
  { minSalary: 8750, maxSalary: 9249.99, msc: 9000, ee: 405, erSS: 900, ec: 10 },
  { minSalary: 9250, maxSalary: 9749.99, msc: 9500, ee: 427.50, erSS: 950, ec: 10 },
  { minSalary: 9750, maxSalary: 10249.99, msc: 10000, ee: 450, erSS: 1000, ec: 10 },
  { minSalary: 10250, maxSalary: 10749.99, msc: 10500, ee: 472.50, erSS: 1050, ec: 10 },
  { minSalary: 10750, maxSalary: 11249.99, msc: 11000, ee: 495, erSS: 1100, ec: 10 },
  { minSalary: 11250, maxSalary: 11749.99, msc: 11500, ee: 517.50, erSS: 1150, ec: 10 },
  { minSalary: 11750, maxSalary: 12249.99, msc: 12000, ee: 540, erSS: 1200, ec: 10 },
  { minSalary: 12250, maxSalary: 12749.99, msc: 12500, ee: 562.50, erSS: 1250, ec: 10 },
  { minSalary: 12750, maxSalary: 13249.99, msc: 13000, ee: 585, erSS: 1300, ec: 10 },
  { minSalary: 13250, maxSalary: 13749.99, msc: 13500, ee: 607.50, erSS: 1350, ec: 10 },
  { minSalary: 13750, maxSalary: 14249.99, msc: 14000, ee: 630, erSS: 1400, ec: 10 },
  { minSalary: 14250, maxSalary: 14749.99, msc: 14500, ee: 652.50, erSS: 1450, ec: 10 },
  { minSalary: 14750, maxSalary: 15249.99, msc: 15000, ee: 675, erSS: 1500, ec: 30 },
  { minSalary: 15250, maxSalary: 15749.99, msc: 15500, ee: 697.50, erSS: 1550, ec: 30 },
  { minSalary: 15750, maxSalary: 16249.99, msc: 16000, ee: 720, erSS: 1600, ec: 30 },
  { minSalary: 16250, maxSalary: 16749.99, msc: 16500, ee: 742.50, erSS: 1650, ec: 30 },
  { minSalary: 16750, maxSalary: 17249.99, msc: 17000, ee: 765, erSS: 1700, ec: 30 },
  { minSalary: 17250, maxSalary: 17749.99, msc: 17500, ee: 787.50, erSS: 1750, ec: 30 },
  { minSalary: 17750, maxSalary: 18249.99, msc: 18000, ee: 810, erSS: 1800, ec: 30 },
  { minSalary: 18250, maxSalary: 18749.99, msc: 18500, ee: 832.50, erSS: 1850, ec: 30 },
  { minSalary: 18750, maxSalary: 19249.99, msc: 19000, ee: 855, erSS: 1900, ec: 30 },
  { minSalary: 19250, maxSalary: 19749.99, msc: 19500, ee: 877.50, erSS: 1950, ec: 30 },
  { minSalary: 19750, maxSalary: 20249.99, msc: 20000, ee: 900, erSS: 2000, ec: 30 },
  { minSalary: 20250, maxSalary: 20749.99, msc: 20500, ee: 922.50, erSS: 2050, ec: 30 },
  { minSalary: 20750, maxSalary: 21249.99, msc: 21000, ee: 945, erSS: 2100, ec: 30 },
  { minSalary: 21250, maxSalary: 21749.99, msc: 21500, ee: 967.50, erSS: 2150, ec: 30 },
  { minSalary: 21750, maxSalary: 22249.99, msc: 22000, ee: 990, erSS: 2200, ec: 30 },
  { minSalary: 22250, maxSalary: 22749.99, msc: 22500, ee: 1012.50, erSS: 2250, ec: 30 },
  { minSalary: 22750, maxSalary: 23249.99, msc: 23000, ee: 1035, erSS: 2300, ec: 30 },
  { minSalary: 23250, maxSalary: 23749.99, msc: 23500, ee: 1057.50, erSS: 2350, ec: 30 },
  { minSalary: 23750, maxSalary: 24249.99, msc: 24000, ee: 1080, erSS: 2400, ec: 30 },
  { minSalary: 24250, maxSalary: 24749.99, msc: 24500, ee: 1102.50, erSS: 2450, ec: 30 },
  { minSalary: 24750, maxSalary: 25249.99, msc: 25000, ee: 1125, erSS: 2500, ec: 30 },
  { minSalary: 25250, maxSalary: 25749.99, msc: 25500, ee: 1147.50, erSS: 2550, ec: 30 },
  { minSalary: 25750, maxSalary: 26249.99, msc: 26000, ee: 1170, erSS: 2600, ec: 30 },
  { minSalary: 26250, maxSalary: 26749.99, msc: 26500, ee: 1192.50, erSS: 2650, ec: 30 },
  { minSalary: 26750, maxSalary: 27249.99, msc: 27000, ee: 1215, erSS: 2700, ec: 30 },
  { minSalary: 27250, maxSalary: 27749.99, msc: 27500, ee: 1237.50, erSS: 2750, ec: 30 },
  { minSalary: 27750, maxSalary: 28249.99, msc: 28000, ee: 1260, erSS: 2800, ec: 30 },
  { minSalary: 28250, maxSalary: 28749.99, msc: 28500, ee: 1282.50, erSS: 2850, ec: 30 },
  { minSalary: 28750, maxSalary: 29249.99, msc: 29000, ee: 1305, erSS: 2900, ec: 30 },
  { minSalary: 29250, maxSalary: 29749.99, msc: 29500, ee: 1327.50, erSS: 2950, ec: 30 },
  { minSalary: 29750, maxSalary: 34749.99, msc: 30000, ee: 1350, erSS: 3000, ec: 30 },
  { minSalary: 34750, maxSalary: 999999999, msc: 35000, ee: 1575, erSS: 3500, ec: 30 },
];

// Calculate SSS contribution (employer = Regular SS + EC)
// NOTE: SSS uses a bracket table based on Monthly Salary Credit (MSC)
// The monthlyGross is used to determine the bracket
export function calculateSSS(monthlyGross: number): { employee: number; employer: number } {
  const bracket = SSS_TABLE_2025.find(
    (b) => monthlyGross >= b.minSalary && monthlyGross <= b.maxSalary
  ) || SSS_TABLE_2025[SSS_TABLE_2025.length - 1];
  
  return {
    employee: 0, // No employee deduction
    employer: bracket.erSS + bracket.ec, // Regular SS + EC
  };
}

// ============== PHILHEALTH CONTRIBUTION 2024 ==============
// Based on PhilHealth Circular No. 2023-0007
// Rate: 5% of monthly gross (employer pays 2.5%)
// Floor: ₱10,000 monthly gross, Ceiling: ₱100,000 monthly gross
const PHILHEALTH_RATE = 0.05;
const PHILHEALTH_FLOOR_SALARY = 10000;
const PHILHEALTH_CEILING_SALARY = 100000;

export function calculatePhilHealth(monthlyGross: number): { employee: number; employer: number } {
  // Apply salary floor and ceiling for computation
  let computationBase = monthlyGross;
  if (computationBase < PHILHEALTH_FLOOR_SALARY) {
    computationBase = PHILHEALTH_FLOOR_SALARY;
  } else if (computationBase > PHILHEALTH_CEILING_SALARY) {
    computationBase = PHILHEALTH_CEILING_SALARY;
  }
  
  const totalContribution = computationBase * PHILHEALTH_RATE;
  const employerShare = totalContribution / 2; // Employer pays half (2.5%)
  
  return {
    employee: 0, // No employee deduction
    employer: Math.round(employerShare * 100) / 100,
  };
}

// ============== PAG-IBIG CONTRIBUTION 2024 ==============
// Employer contribution: 2% of monthly gross salary (no cap)
// Company shoulders the full contribution — no employee deduction
const PAGIBIG_RATE_ER = 0.02;

export function calculatePagIbig(monthlyGross: number): { employee: number; employer: number } {
  return {
    employee: 0, // No employee deduction (company shoulders)
    employer: Math.round(monthlyGross * PAGIBIG_RATE_ER * 100) / 100,
  };
}

// ============== OVERTIME, HOLIDAY, NIGHT DIFFERENTIAL RATES ==============

// Overtime rates (based on Labor Code of the Philippines)
export const OT_RATES = {
  REGULAR_OT: 1.25,           // 125% of hourly rate
  REST_DAY_OT: 1.30,          // 130% of hourly rate
  SPECIAL_HOLIDAY: 1.30,      // 130% of daily rate
  SPECIAL_HOLIDAY_OT: 1.69,   // 130% x 130% of hourly rate
  REGULAR_HOLIDAY: 2.00,      // 200% of daily rate
  REGULAR_HOLIDAY_OT: 2.60,   // 200% x 130% of hourly rate
  DOUBLE_HOLIDAY: 3.00,       // 300% of daily rate
};

// Night differential rate (10PM to 6AM)
export const NIGHT_DIFF_RATE = 0.10; // Additional 10%

// ============== PAYROLL CALCULATION HELPERS ==============

export interface PayrollInput {
  basicMonthlySalary: number;
  workDaysPerMonth: number; // Usually 22 days
  hoursWorked: number;
  regularOTHours: number;
  restDayOTHours: number;
  holidayHours: number;
  holidayType: 'REGULAR' | 'SPECIAL' | null;
  nightDiffHours: number;
  nightDiffOTHours: number;
  mobileAllowance: number;
  performancePay: number;
  otherAllowances: number;
  salaryLoanDeduction: number;
  computerLoanDeduction: number;
  otherLoanDeductions: number;
  otherDeductions: number;
  isFirstHalf: boolean; // 1st-15th or 16th-end
  otherHalfGross?: number; // Actual gross from the other cutoff for monthly contribution basis
}

export interface PayrollResult {
  // Rates
  dailyRate: number;
  hourlyRate: number;
  
  // Earnings
  basicPay: number;
  overtimePay: number;
  holidayPay: number;
  nightDiffPay: number;
  restDayPay: number;
  
  // Allowances
  mobileAllowance: number;
  performancePay: number;
  otherAllowances: number;
  
  // Employer contributions (added to gross)
  employerSSS: number;
  employerPhilHealth: number;
  employerPagIbig: number;
  
  // Deductions - Government
  sssContribution: number;
  philHealthContribution: number;
  pagIbigContribution: number;
  
  // Deductions - Loans
  salaryLoanDeduction: number;
  computerLoanDeduction: number;
  otherLoanDeductions: number;
  
  // Other
  otherDeductions: number;
  
  // Totals
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
}

export function calculatePayroll(input: PayrollInput): PayrollResult {
  // Calculate rates
  const dailyRate = input.basicMonthlySalary / input.workDaysPerMonth;
  const hourlyRate = dailyRate / 8;
  
  // Semi-monthly basic - FIXED at half of monthly salary
  const basicPay = input.basicMonthlySalary / 2;
  
  // Calculate overtime pay
  const regularOTPay = input.regularOTHours * hourlyRate * OT_RATES.REGULAR_OT;
  const restDayOTPay = input.restDayOTHours * hourlyRate * OT_RATES.REST_DAY_OT;
  const overtimePay = regularOTPay + restDayOTPay;
  
  // Calculate holiday pay
  let holidayPay = 0;
  if (input.holidayType === 'REGULAR') {
    holidayPay = (input.holidayHours / 8) * dailyRate * (OT_RATES.REGULAR_HOLIDAY - 1); // Additional pay only
  } else if (input.holidayType === 'SPECIAL') {
    holidayPay = (input.holidayHours / 8) * dailyRate * (OT_RATES.SPECIAL_HOLIDAY - 1);
  }
  
  // Calculate night differential pay
  const nightDiffPay = input.nightDiffHours * hourlyRate * NIGHT_DIFF_RATE;
  const nightDiffOTPay = input.nightDiffOTHours * hourlyRate * NIGHT_DIFF_RATE * OT_RATES.REGULAR_OT;
  const totalNightDiffPay = nightDiffPay + nightDiffOTPay;
  
  // Rest day pay (if worked on rest day without OT)
  const restDayPay = 0; // Calculated separately if needed
  
  // Allowances (split by semi-monthly frequency)
  const mobileAllowance = input.mobileAllowance;
  const performancePay = input.performancePay;
  const otherAllowances = input.otherAllowances;
  
  // Total Gross Pay for this cutoff (before adjustments/employer share)
  const thisHalfGross = basicPay + overtimePay + holidayPay + totalNightDiffPay + restDayPay +
    mobileAllowance + performancePay + otherAllowances;

  // Monthly gross = actual total gross of BOTH cutoffs (if other half provided), otherwise estimate by doubling
  const monthlyGross = input.otherHalfGross != null
    ? thisHalfGross + input.otherHalfGross
    : thisHalfGross * 2;

  // Calculate government contributions (based on monthly gross)
  const sss = calculateSSS(monthlyGross);
  const philHealth = calculatePhilHealth(monthlyGross);
  const pagIbig = calculatePagIbig(monthlyGross);
  
  // NO employee deductions - company handles all contributions
  const sssContribution = 0;
  const philHealthContribution = 0;
  const pagIbigContribution = 0;
  
  // Employer share - added to gross on 2nd cutoff ONLY
  let employerSSS = 0;
  let employerPhilHealth = 0;
  let employerPagIbig = 0;
  
  if (!input.isFirstHalf) {
    // Employer contributions added on 2nd cutoff
    employerSSS = sss.employer;
    employerPhilHealth = philHealth.employer;
    employerPagIbig = pagIbig.employer;
  }
  
  // Loan deductions
  const salaryLoanDeduction = input.salaryLoanDeduction;
  const computerLoanDeduction = input.computerLoanDeduction;
  const otherLoanDeductions = input.otherLoanDeductions;
  
  // Calculate totals
  // Total Gross Pay = Basic Pay + Allowances + OT/Holiday/NightDiff (NO adjustments, NO employer share)
  const grossEarnings = basicPay + overtimePay + holidayPay + totalNightDiffPay + restDayPay +
                        mobileAllowance + performancePay + otherAllowances;
  
  const totalDeductions = sssContribution + philHealthContribution + pagIbigContribution +
                          salaryLoanDeduction + computerLoanDeduction +
                          otherLoanDeductions + input.otherDeductions;
  
  // Net Pay = Total Gross + Adjustments + Employer Share - Deductions
  const netPay = grossEarnings - totalDeductions +
                 employerSSS + employerPhilHealth + employerPagIbig;
  
  return {
    dailyRate: Math.round(dailyRate * 100) / 100,
    hourlyRate: Math.round(hourlyRate * 100) / 100,
    basicPay: Math.round(basicPay * 100) / 100,
    overtimePay: Math.round(overtimePay * 100) / 100,
    holidayPay: Math.round(holidayPay * 100) / 100,
    nightDiffPay: Math.round(totalNightDiffPay * 100) / 100,
    restDayPay: Math.round(restDayPay * 100) / 100,
    mobileAllowance: Math.round(mobileAllowance * 100) / 100,
    performancePay: Math.round(performancePay * 100) / 100,
    otherAllowances: Math.round(otherAllowances * 100) / 100,
    employerSSS: Math.round(employerSSS * 100) / 100,
    employerPhilHealth: Math.round(employerPhilHealth * 100) / 100,
    employerPagIbig: Math.round(employerPagIbig * 100) / 100,
    sssContribution: Math.round(sssContribution * 100) / 100,
    philHealthContribution: Math.round(philHealthContribution * 100) / 100,
    pagIbigContribution: Math.round(pagIbigContribution * 100) / 100,
    salaryLoanDeduction: Math.round(salaryLoanDeduction * 100) / 100,
    computerLoanDeduction: Math.round(computerLoanDeduction * 100) / 100,
    otherLoanDeductions: Math.round(otherLoanDeductions * 100) / 100,
    otherDeductions: Math.round(input.otherDeductions * 100) / 100,
    grossEarnings: Math.round(grossEarnings * 100) / 100,
    totalDeductions: Math.round(totalDeductions * 100) / 100,
    netPay: Math.round(netPay * 100) / 100,
  };
}

// Helper to get days in a period
export function getDaysInPeriod(year: number, month: number, isFirstHalf: boolean): number {
  if (isFirstHalf) {
    return 15; // 1st to 15th
  } else {
    const lastDay = new Date(year, month, 0).getDate();
    return lastDay - 15; // 16th to end of month
  }
}

// Get period dates
export function getPeriodDates(year: number, month: number, isFirstHalf: boolean): { start: Date; end: Date } {
  if (isFirstHalf) {
    return {
      start: new Date(year, month - 1, 1),
      end: new Date(year, month - 1, 15),
    };
  } else {
    const lastDay = new Date(year, month, 0).getDate();
    return {
      start: new Date(year, month - 1, 16),
      end: new Date(year, month - 1, lastDay),
    };
  }
}

// Format currency (Philippine Peso)
export function formatPeso(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
}
