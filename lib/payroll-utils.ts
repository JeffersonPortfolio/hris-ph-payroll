// Philippine Government Contribution Tables and Payroll Calculations
// Updated to match uploaded CSV contribution tables

// ============== SSS CONTRIBUTION TABLE 2025 ==============
// Source: SSS Contribution Table 2025.csv (with Regular SS + MPF + EC)
// Employee Total = Regular SS EE + MPF EE
// Employer Total = Regular SS ER + MPF ER + EC

interface SSSBracket {
  minSalary: number;
  maxSalary: number;
  msc: number;
  employeeRegSS: number;
  employeeMPF: number;
  employeeTotal: number;
  employerRegSS: number;
  employerMPF: number;
  employerEC: number;
  employerTotal: number;
}

const SSS_TABLE_2025: SSSBracket[] = [
  { minSalary: 0, maxSalary: 5249.99, msc: 5000, employeeRegSS: 250, employeeMPF: 0, employeeTotal: 250, employerRegSS: 500, employerMPF: 0, employerEC: 10, employerTotal: 510 },
  { minSalary: 5250, maxSalary: 5749.99, msc: 5500, employeeRegSS: 275, employeeMPF: 0, employeeTotal: 275, employerRegSS: 550, employerMPF: 0, employerEC: 10, employerTotal: 560 },
  { minSalary: 5750, maxSalary: 6249.99, msc: 6000, employeeRegSS: 300, employeeMPF: 0, employeeTotal: 300, employerRegSS: 600, employerMPF: 0, employerEC: 10, employerTotal: 610 },
  { minSalary: 6250, maxSalary: 6749.99, msc: 6500, employeeRegSS: 325, employeeMPF: 0, employeeTotal: 325, employerRegSS: 650, employerMPF: 0, employerEC: 10, employerTotal: 660 },
  { minSalary: 6750, maxSalary: 7249.99, msc: 7000, employeeRegSS: 350, employeeMPF: 0, employeeTotal: 350, employerRegSS: 700, employerMPF: 0, employerEC: 10, employerTotal: 710 },
  { minSalary: 7250, maxSalary: 7749.99, msc: 7500, employeeRegSS: 375, employeeMPF: 0, employeeTotal: 375, employerRegSS: 750, employerMPF: 0, employerEC: 10, employerTotal: 760 },
  { minSalary: 7750, maxSalary: 8249.99, msc: 8000, employeeRegSS: 400, employeeMPF: 0, employeeTotal: 400, employerRegSS: 800, employerMPF: 0, employerEC: 10, employerTotal: 810 },
  { minSalary: 8250, maxSalary: 8749.99, msc: 8500, employeeRegSS: 425, employeeMPF: 0, employeeTotal: 425, employerRegSS: 850, employerMPF: 0, employerEC: 10, employerTotal: 860 },
  { minSalary: 8750, maxSalary: 9249.99, msc: 9000, employeeRegSS: 450, employeeMPF: 0, employeeTotal: 450, employerRegSS: 900, employerMPF: 0, employerEC: 10, employerTotal: 910 },
  { minSalary: 9250, maxSalary: 9749.99, msc: 9500, employeeRegSS: 475, employeeMPF: 0, employeeTotal: 475, employerRegSS: 950, employerMPF: 0, employerEC: 10, employerTotal: 960 },
  { minSalary: 9750, maxSalary: 10249.99, msc: 10000, employeeRegSS: 500, employeeMPF: 0, employeeTotal: 500, employerRegSS: 1000, employerMPF: 0, employerEC: 10, employerTotal: 1010 },
  { minSalary: 10250, maxSalary: 10749.99, msc: 10500, employeeRegSS: 525, employeeMPF: 0, employeeTotal: 525, employerRegSS: 1050, employerMPF: 0, employerEC: 10, employerTotal: 1060 },
  { minSalary: 10750, maxSalary: 11249.99, msc: 11000, employeeRegSS: 550, employeeMPF: 0, employeeTotal: 550, employerRegSS: 1100, employerMPF: 0, employerEC: 10, employerTotal: 1110 },
  { minSalary: 11250, maxSalary: 11749.99, msc: 11500, employeeRegSS: 575, employeeMPF: 0, employeeTotal: 575, employerRegSS: 1150, employerMPF: 0, employerEC: 10, employerTotal: 1160 },
  { minSalary: 11750, maxSalary: 12249.99, msc: 12000, employeeRegSS: 600, employeeMPF: 0, employeeTotal: 600, employerRegSS: 1200, employerMPF: 0, employerEC: 10, employerTotal: 1210 },
  { minSalary: 12250, maxSalary: 12749.99, msc: 12500, employeeRegSS: 625, employeeMPF: 0, employeeTotal: 625, employerRegSS: 1250, employerMPF: 0, employerEC: 10, employerTotal: 1260 },
  { minSalary: 12750, maxSalary: 13249.99, msc: 13000, employeeRegSS: 650, employeeMPF: 0, employeeTotal: 650, employerRegSS: 1300, employerMPF: 0, employerEC: 10, employerTotal: 1310 },
  { minSalary: 13250, maxSalary: 13749.99, msc: 13500, employeeRegSS: 675, employeeMPF: 0, employeeTotal: 675, employerRegSS: 1350, employerMPF: 0, employerEC: 10, employerTotal: 1360 },
  { minSalary: 13750, maxSalary: 14249.99, msc: 14000, employeeRegSS: 700, employeeMPF: 0, employeeTotal: 700, employerRegSS: 1400, employerMPF: 0, employerEC: 10, employerTotal: 1410 },
  { minSalary: 14250, maxSalary: 14749.99, msc: 14500, employeeRegSS: 725, employeeMPF: 0, employeeTotal: 725, employerRegSS: 1450, employerMPF: 0, employerEC: 10, employerTotal: 1460 },
  { minSalary: 14750, maxSalary: 15249.99, msc: 15000, employeeRegSS: 750, employeeMPF: 0, employeeTotal: 750, employerRegSS: 1500, employerMPF: 0, employerEC: 30, employerTotal: 1530 },
  { minSalary: 15250, maxSalary: 15749.99, msc: 15500, employeeRegSS: 775, employeeMPF: 0, employeeTotal: 775, employerRegSS: 1550, employerMPF: 0, employerEC: 30, employerTotal: 1580 },
  { minSalary: 15750, maxSalary: 16249.99, msc: 16000, employeeRegSS: 800, employeeMPF: 0, employeeTotal: 800, employerRegSS: 1600, employerMPF: 0, employerEC: 30, employerTotal: 1630 },
  { minSalary: 16250, maxSalary: 16749.99, msc: 16500, employeeRegSS: 825, employeeMPF: 0, employeeTotal: 825, employerRegSS: 1650, employerMPF: 0, employerEC: 30, employerTotal: 1680 },
  { minSalary: 16750, maxSalary: 17249.99, msc: 17000, employeeRegSS: 850, employeeMPF: 0, employeeTotal: 850, employerRegSS: 1700, employerMPF: 0, employerEC: 30, employerTotal: 1730 },
  { minSalary: 17250, maxSalary: 17749.99, msc: 17500, employeeRegSS: 875, employeeMPF: 0, employeeTotal: 875, employerRegSS: 1750, employerMPF: 0, employerEC: 30, employerTotal: 1780 },
  { minSalary: 17750, maxSalary: 18249.99, msc: 18000, employeeRegSS: 900, employeeMPF: 0, employeeTotal: 900, employerRegSS: 1800, employerMPF: 0, employerEC: 30, employerTotal: 1830 },
  { minSalary: 18250, maxSalary: 18749.99, msc: 18500, employeeRegSS: 925, employeeMPF: 0, employeeTotal: 925, employerRegSS: 1850, employerMPF: 0, employerEC: 30, employerTotal: 1880 },
  { minSalary: 18750, maxSalary: 19249.99, msc: 19000, employeeRegSS: 950, employeeMPF: 0, employeeTotal: 950, employerRegSS: 1900, employerMPF: 0, employerEC: 30, employerTotal: 1930 },
  { minSalary: 19250, maxSalary: 19749.99, msc: 19500, employeeRegSS: 975, employeeMPF: 0, employeeTotal: 975, employerRegSS: 1950, employerMPF: 0, employerEC: 30, employerTotal: 1980 },
  { minSalary: 19750, maxSalary: 20249.99, msc: 20000, employeeRegSS: 1000, employeeMPF: 0, employeeTotal: 1000, employerRegSS: 2000, employerMPF: 0, employerEC: 30, employerTotal: 2030 },
  { minSalary: 20250, maxSalary: 20749.99, msc: 20500, employeeRegSS: 1000, employeeMPF: 25, employeeTotal: 1025, employerRegSS: 2000, employerMPF: 50, employerEC: 30, employerTotal: 2080 },
  { minSalary: 20750, maxSalary: 21249.99, msc: 21000, employeeRegSS: 1000, employeeMPF: 50, employeeTotal: 1050, employerRegSS: 2000, employerMPF: 100, employerEC: 30, employerTotal: 2130 },
  { minSalary: 21250, maxSalary: 21749.99, msc: 21500, employeeRegSS: 1000, employeeMPF: 75, employeeTotal: 1075, employerRegSS: 2000, employerMPF: 150, employerEC: 30, employerTotal: 2180 },
  { minSalary: 21750, maxSalary: 22249.99, msc: 22000, employeeRegSS: 1000, employeeMPF: 100, employeeTotal: 1100, employerRegSS: 2000, employerMPF: 200, employerEC: 30, employerTotal: 2230 },
  { minSalary: 22250, maxSalary: 22749.99, msc: 22500, employeeRegSS: 1000, employeeMPF: 125, employeeTotal: 1125, employerRegSS: 2000, employerMPF: 250, employerEC: 30, employerTotal: 2280 },
  { minSalary: 22750, maxSalary: 23249.99, msc: 23000, employeeRegSS: 1000, employeeMPF: 150, employeeTotal: 1150, employerRegSS: 2000, employerMPF: 300, employerEC: 30, employerTotal: 2330 },
  { minSalary: 23250, maxSalary: 23749.99, msc: 23500, employeeRegSS: 1000, employeeMPF: 175, employeeTotal: 1175, employerRegSS: 2000, employerMPF: 350, employerEC: 30, employerTotal: 2380 },
  { minSalary: 23750, maxSalary: 24249.99, msc: 24000, employeeRegSS: 1000, employeeMPF: 200, employeeTotal: 1200, employerRegSS: 2000, employerMPF: 400, employerEC: 30, employerTotal: 2430 },
  { minSalary: 24250, maxSalary: 24749.99, msc: 24500, employeeRegSS: 1000, employeeMPF: 225, employeeTotal: 1225, employerRegSS: 2000, employerMPF: 450, employerEC: 30, employerTotal: 2480 },
  { minSalary: 24750, maxSalary: 25249.99, msc: 25000, employeeRegSS: 1000, employeeMPF: 250, employeeTotal: 1250, employerRegSS: 2000, employerMPF: 500, employerEC: 30, employerTotal: 2530 },
  { minSalary: 25250, maxSalary: 25749.99, msc: 25500, employeeRegSS: 1000, employeeMPF: 275, employeeTotal: 1275, employerRegSS: 2000, employerMPF: 550, employerEC: 30, employerTotal: 2580 },
  { minSalary: 25750, maxSalary: 26249.99, msc: 26000, employeeRegSS: 1000, employeeMPF: 300, employeeTotal: 1300, employerRegSS: 2000, employerMPF: 600, employerEC: 30, employerTotal: 2630 },
  { minSalary: 26250, maxSalary: 26749.99, msc: 26500, employeeRegSS: 1000, employeeMPF: 325, employeeTotal: 1325, employerRegSS: 2000, employerMPF: 650, employerEC: 30, employerTotal: 2680 },
  { minSalary: 26750, maxSalary: 27249.99, msc: 27000, employeeRegSS: 1000, employeeMPF: 350, employeeTotal: 1350, employerRegSS: 2000, employerMPF: 700, employerEC: 30, employerTotal: 2730 },
  { minSalary: 27250, maxSalary: 27749.99, msc: 27500, employeeRegSS: 1000, employeeMPF: 375, employeeTotal: 1375, employerRegSS: 2000, employerMPF: 750, employerEC: 30, employerTotal: 2780 },
  { minSalary: 27750, maxSalary: 28249.99, msc: 28000, employeeRegSS: 1000, employeeMPF: 400, employeeTotal: 1400, employerRegSS: 2000, employerMPF: 800, employerEC: 30, employerTotal: 2830 },
  { minSalary: 28250, maxSalary: 28749.99, msc: 28500, employeeRegSS: 1000, employeeMPF: 425, employeeTotal: 1425, employerRegSS: 2000, employerMPF: 850, employerEC: 30, employerTotal: 2880 },
  { minSalary: 28750, maxSalary: 29249.99, msc: 29000, employeeRegSS: 1000, employeeMPF: 450, employeeTotal: 1450, employerRegSS: 2000, employerMPF: 900, employerEC: 30, employerTotal: 2930 },
  { minSalary: 29250, maxSalary: 29749.99, msc: 29500, employeeRegSS: 1000, employeeMPF: 475, employeeTotal: 1475, employerRegSS: 2000, employerMPF: 950, employerEC: 30, employerTotal: 2980 },
  { minSalary: 29750, maxSalary: 30249.99, msc: 30000, employeeRegSS: 1000, employeeMPF: 500, employeeTotal: 1500, employerRegSS: 2000, employerMPF: 1000, employerEC: 30, employerTotal: 3030 },
  { minSalary: 30250, maxSalary: 30749.99, msc: 30500, employeeRegSS: 1000, employeeMPF: 525, employeeTotal: 1525, employerRegSS: 2000, employerMPF: 1050, employerEC: 30, employerTotal: 3080 },
  { minSalary: 30750, maxSalary: 31249.99, msc: 31000, employeeRegSS: 1000, employeeMPF: 550, employeeTotal: 1550, employerRegSS: 2000, employerMPF: 1100, employerEC: 30, employerTotal: 3130 },
  { minSalary: 31250, maxSalary: 31749.99, msc: 31500, employeeRegSS: 1000, employeeMPF: 575, employeeTotal: 1575, employerRegSS: 2000, employerMPF: 1150, employerEC: 30, employerTotal: 3180 },
  { minSalary: 31750, maxSalary: 32249.99, msc: 32000, employeeRegSS: 1000, employeeMPF: 600, employeeTotal: 1600, employerRegSS: 2000, employerMPF: 1200, employerEC: 30, employerTotal: 3230 },
  { minSalary: 32250, maxSalary: 32749.99, msc: 32500, employeeRegSS: 1000, employeeMPF: 625, employeeTotal: 1625, employerRegSS: 2000, employerMPF: 1250, employerEC: 30, employerTotal: 3280 },
  { minSalary: 32750, maxSalary: 33249.99, msc: 33000, employeeRegSS: 1000, employeeMPF: 650, employeeTotal: 1650, employerRegSS: 2000, employerMPF: 1300, employerEC: 30, employerTotal: 3330 },
  { minSalary: 33250, maxSalary: 33749.99, msc: 33500, employeeRegSS: 1000, employeeMPF: 675, employeeTotal: 1675, employerRegSS: 2000, employerMPF: 1350, employerEC: 30, employerTotal: 3380 },
  { minSalary: 33750, maxSalary: 34249.99, msc: 34000, employeeRegSS: 1000, employeeMPF: 700, employeeTotal: 1700, employerRegSS: 2000, employerMPF: 1400, employerEC: 30, employerTotal: 3430 },
  { minSalary: 34250, maxSalary: 34749.99, msc: 34500, employeeRegSS: 1000, employeeMPF: 725, employeeTotal: 1725, employerRegSS: 2000, employerMPF: 1450, employerEC: 30, employerTotal: 3480 },
  { minSalary: 34750, maxSalary: 999999999, msc: 35000, employeeRegSS: 1000, employeeMPF: 750, employeeTotal: 1750, employerRegSS: 2000, employerMPF: 1500, employerEC: 30, employerTotal: 3530 },
];

// Calculate SSS contribution
// Employee share is DEDUCTED from salary, employer share is recorded separately
export function calculateSSS(monthlyGross: number): { employee: number; employer: number; employerEC: number } {
  const bracket = SSS_TABLE_2025.find(
    (b) => monthlyGross >= b.minSalary && monthlyGross <= b.maxSalary
  ) || SSS_TABLE_2025[SSS_TABLE_2025.length - 1];

  return {
    employee: bracket.employeeTotal,
    employer: bracket.employerRegSS + bracket.employerMPF, // SS + MPF (without EC)
    employerEC: bracket.employerEC,
  };
}

// ============== PHILHEALTH CONTRIBUTION TABLE 2024 ==============
// Rate: 5% of monthly basic salary, split 50/50 between employee and employer
// Floor: ₱10,000, Ceiling: ₱100,000
const PHILHEALTH_RATE = 0.05;
const PHILHEALTH_FLOOR_SALARY = 10000;
const PHILHEALTH_CEILING_SALARY = 100000;

export function calculatePhilHealth(monthlyGross: number): { employee: number; employer: number } {
  let computationBase = monthlyGross;
  if (computationBase < PHILHEALTH_FLOOR_SALARY) {
    computationBase = PHILHEALTH_FLOOR_SALARY;
  } else if (computationBase > PHILHEALTH_CEILING_SALARY) {
    computationBase = PHILHEALTH_CEILING_SALARY;
  }

  const totalPremium = computationBase * PHILHEALTH_RATE;
  const share = Math.round(totalPremium / 2 * 100) / 100;

  return {
    employee: share,  // Employee share - DEDUCTED from salary
    employer: share,  // Employer share - recorded in Finance
  };
}

// ============== PAG-IBIG CONTRIBUTION TABLE 2021 ==============
// ₱1,500 and below: Employee 1%, Employer 2%
// Over ₱1,500: Employee 2%, Employer 2%
// Maximum monthly compensation for computation: ₱5,000
const PAGIBIG_MAX_COMP = 5000;

export function calculatePagIbig(monthlyGross: number): { employee: number; employer: number } {
  const base = Math.min(monthlyGross, PAGIBIG_MAX_COMP);
  let eeRate: number;
  const erRate = 0.02;

  if (monthlyGross <= 1500) {
    eeRate = 0.01;
  } else {
    eeRate = 0.02;
  }

  return {
    employee: Math.round(base * eeRate * 100) / 100,  // DEDUCTED from salary
    employer: Math.round(base * erRate * 100) / 100,   // Recorded in Finance
  };
}

// ============== WITHHOLDING TAX TABLE 2026 ==============
// Based on Withholding Tax Table 2026.csv
// Supports: DAILY, WEEKLY, SEMI-MONTHLY, MONTHLY periods

interface WithholdingTaxBracket {
  minComp: number;
  maxComp: number;
  baseTax: number;
  rate: number;
  excessOver: number;
}

type PayPeriodType = 'DAILY' | 'WEEKLY' | 'SEMI_MONTHLY' | 'MONTHLY';

const WITHHOLDING_TAX_TABLE: Record<PayPeriodType, WithholdingTaxBracket[]> = {
  DAILY: [
    { minComp: 0, maxComp: 685, baseTax: 0, rate: 0, excessOver: 0 },
    { minComp: 685.01, maxComp: 1095, baseTax: 0, rate: 0.15, excessOver: 685 },
    { minComp: 1095.01, maxComp: 2191, baseTax: 61.65, rate: 0.20, excessOver: 1096 },
    { minComp: 2191.01, maxComp: 5478, baseTax: 280.85, rate: 0.25, excessOver: 2192 },
    { minComp: 5478.01, maxComp: 21917, baseTax: 1102.60, rate: 0.30, excessOver: 5479 },
    { minComp: 21917.01, maxComp: 999999999, baseTax: 6034.30, rate: 0.35, excessOver: 21918 },
  ],
  WEEKLY: [
    { minComp: 0, maxComp: 4808, baseTax: 0, rate: 0, excessOver: 0 },
    { minComp: 4808.01, maxComp: 7691, baseTax: 0, rate: 0.15, excessOver: 4808 },
    { minComp: 7691.01, maxComp: 15384, baseTax: 432.60, rate: 0.20, excessOver: 7692 },
    { minComp: 15384.01, maxComp: 38461, baseTax: 1971.20, rate: 0.25, excessOver: 15385 },
    { minComp: 38461.01, maxComp: 153845, baseTax: 7740.45, rate: 0.30, excessOver: 38462 },
    { minComp: 153845.01, maxComp: 999999999, baseTax: 42355.65, rate: 0.35, excessOver: 153846 },
  ],
  SEMI_MONTHLY: [
    { minComp: 0, maxComp: 10417, baseTax: 0, rate: 0, excessOver: 0 },
    { minComp: 10417.01, maxComp: 16666, baseTax: 0, rate: 0.15, excessOver: 10417 },
    { minComp: 16666.01, maxComp: 33332, baseTax: 937.50, rate: 0.20, excessOver: 16667 },
    { minComp: 33332.01, maxComp: 83332, baseTax: 4270.70, rate: 0.25, excessOver: 33333 },
    { minComp: 83332.01, maxComp: 333332, baseTax: 16770.70, rate: 0.30, excessOver: 83333 },
    { minComp: 333332.01, maxComp: 999999999, baseTax: 91770.70, rate: 0.35, excessOver: 333333 },
  ],
  MONTHLY: [
    { minComp: 0, maxComp: 20833, baseTax: 0, rate: 0, excessOver: 0 },
    { minComp: 20833.01, maxComp: 33332, baseTax: 0, rate: 0.15, excessOver: 20833 },
    { minComp: 33332.01, maxComp: 66666, baseTax: 1875, rate: 0.20, excessOver: 33333 },
    { minComp: 66666.01, maxComp: 166666, baseTax: 8541.80, rate: 0.25, excessOver: 66667 },
    { minComp: 166666.01, maxComp: 666666, baseTax: 33541.80, rate: 0.30, excessOver: 166667 },
    { minComp: 666666.01, maxComp: 999999999, baseTax: 183541.80, rate: 0.35, excessOver: 666667 },
  ],
};

// Calculate withholding tax based on taxable compensation and pay period
export function calculateWithholdingTax(taxableCompensation: number, payPeriod: PayPeriodType): number {
  const brackets = WITHHOLDING_TAX_TABLE[payPeriod];
  if (!brackets) return 0;

  const bracket = brackets.find(
    (b) => taxableCompensation >= b.minComp && taxableCompensation <= b.maxComp
  );
  if (!bracket || bracket.rate === 0) return 0;

  const excess = taxableCompensation - bracket.excessOver;
  const tax = bracket.baseTax + (excess * bracket.rate);
  return Math.round(tax * 100) / 100;
}

// ============== INCOME TAX TABLE 2026 (ANNUAL) ==============
// Based on Income Tax Table 2026.csv (TRAIN Law)

interface IncomeTaxBracket {
  minIncome: number;
  maxIncome: number;
  baseTax: number;
  rate: number;
  excessOver: number;
}

const INCOME_TAX_TABLE_ANNUAL: IncomeTaxBracket[] = [
  { minIncome: 0, maxIncome: 250000, baseTax: 0, rate: 0, excessOver: 0 },
  { minIncome: 250000.01, maxIncome: 400000, baseTax: 0, rate: 0.15, excessOver: 250000 },
  { minIncome: 400000.01, maxIncome: 800000, baseTax: 22500, rate: 0.20, excessOver: 400000 },
  { minIncome: 800000.01, maxIncome: 2000000, baseTax: 102500, rate: 0.25, excessOver: 800000 },
  { minIncome: 2000000.01, maxIncome: 8000000, baseTax: 402500, rate: 0.30, excessOver: 2000000 },
  { minIncome: 8000000.01, maxIncome: 999999999999, baseTax: 2202500, rate: 0.35, excessOver: 8000000 },
];

// Calculate annual income tax
export function calculateIncomeTax(annualTaxableIncome: number): number {
  const bracket = INCOME_TAX_TABLE_ANNUAL.find(
    (b) => annualTaxableIncome >= b.minIncome && annualTaxableIncome <= b.maxIncome
  );
  if (!bracket || bracket.rate === 0) return 0;

  const excess = annualTaxableIncome - bracket.excessOver;
  const tax = bracket.baseTax + (excess * bracket.rate);
  return Math.round(tax * 100) / 100;
}

// ============== OVERTIME, HOLIDAY, NIGHT DIFFERENTIAL RATES ==============

export const OT_RATES = {
  REGULAR_OT: 1.25,
  REST_DAY_OT: 1.30,
  SPECIAL_HOLIDAY: 1.30,
  SPECIAL_HOLIDAY_OT: 1.69,
  REGULAR_HOLIDAY: 2.00,
  REGULAR_HOLIDAY_OT: 2.60,
  DOUBLE_HOLIDAY: 3.00,
};

export const NIGHT_DIFF_RATE = 0.10;

// ============== PAYROLL CALCULATION ==============

export type PayrollPeriodMode = 'SEMI_MONTHLY' | 'MONTHLY' | 'BI_WEEKLY';

export interface PayrollInput {
  basicMonthlySalary: number;
  workDaysPerMonth: number;
  hoursWorked: number;
  regularOTHours: number;
  restDayOTHours: number;
  holidayHours: number;
  holidayType: 'REGULAR' | 'SPECIAL' | null;
  nightDiffHours: number;
  nightDiffOTHours: number;
  bonusPay: number;
  mobileAllowance: number;
  performancePay: number;
  otherAllowances: number;
  salaryLoanDeduction: number;
  computerLoanDeduction: number;
  otherLoanDeductions: number;
  advancesDeduction: number;
  otherDeductions: number;
  periodMode: PayrollPeriodMode;
  isFirstHalf: boolean;
}

export interface PayrollResult {
  dailyRate: number;
  hourlyRate: number;
  basicPay: number;
  overtimePay: number;
  holidayPay: number;
  nightDiffPay: number;
  restDayPay: number;
  bonusPay: number;
  mobileAllowance: number;
  performancePay: number;
  otherAllowances: number;
  // Employee share (DEDUCTED from salary)
  sssContribution: number;
  philHealthContribution: number;
  pagIbigContribution: number;
  withholdingTax: number;
  // Employer share (NOT added to salary, recorded in Finance)
  employerSSS: number;
  employerPhilHealth: number;
  employerPagIbig: number;
  employerEC: number;
  // Loan & other deductions
  salaryLoanDeduction: number;
  computerLoanDeduction: number;
  otherLoanDeductions: number;
  advancesDeduction: number;
  otherDeductions: number;
  // Totals
  grossEarnings: number;
  taxableIncome: number;
  totalDeductions: number;
  netPay: number;
}

export function calculatePayroll(input: PayrollInput): PayrollResult {
  const dailyRate = input.basicMonthlySalary / input.workDaysPerMonth;
  const hourlyRate = dailyRate / 8;

  // Determine pay divisor based on period mode
  let payDivisor = 2; // semi-monthly default
  if (input.periodMode === 'MONTHLY') payDivisor = 1;
  else if (input.periodMode === 'BI_WEEKLY') payDivisor = 2; // approximately

  const basicPay = input.basicMonthlySalary / payDivisor;

  // Overtime
  const regularOTPay = input.regularOTHours * hourlyRate * OT_RATES.REGULAR_OT;
  const restDayOTPay = input.restDayOTHours * hourlyRate * OT_RATES.REST_DAY_OT;
  const overtimePay = regularOTPay + restDayOTPay;

  // Holiday pay
  let holidayPay = 0;
  if (input.holidayType === 'REGULAR') {
    holidayPay = (input.holidayHours / 8) * dailyRate * (OT_RATES.REGULAR_HOLIDAY - 1);
  } else if (input.holidayType === 'SPECIAL') {
    holidayPay = (input.holidayHours / 8) * dailyRate * (OT_RATES.SPECIAL_HOLIDAY - 1);
  }

  // Night differential
  const nightDiffPay = input.nightDiffHours * hourlyRate * NIGHT_DIFF_RATE;
  const nightDiffOTPay = input.nightDiffOTHours * hourlyRate * NIGHT_DIFF_RATE * OT_RATES.REGULAR_OT;
  const totalNightDiffPay = nightDiffPay + nightDiffOTPay;

  const restDayPay = 0;

  // Total Gross Earnings for this period
  const grossEarnings = basicPay + overtimePay + holidayPay + totalNightDiffPay + restDayPay +
    input.bonusPay + input.mobileAllowance + input.performancePay + input.otherAllowances;

  // Calculate monthly gross for contribution basis
  const monthlyGross = grossEarnings * payDivisor;

  // Government contributions (monthly basis)
  const sss = calculateSSS(monthlyGross);
  const philHealth = calculatePhilHealth(monthlyGross);
  const pagIbig = calculatePagIbig(monthlyGross);

  // Employee share per period (split by payDivisor)
  const sssContribution = Math.round(sss.employee / payDivisor * 100) / 100;
  const philHealthContribution = Math.round(philHealth.employee / payDivisor * 100) / 100;
  const pagIbigContribution = Math.round(pagIbig.employee / payDivisor * 100) / 100;

  // Employer share per period (recorded in Finance, NOT deducted from or added to employee salary)
  const employerSSS = Math.round(sss.employer / payDivisor * 100) / 100;
  const employerPhilHealth = Math.round(philHealth.employer / payDivisor * 100) / 100;
  const employerPagIbig = Math.round(pagIbig.employer / payDivisor * 100) / 100;
  const employerEC = Math.round(sss.employerEC / payDivisor * 100) / 100;

  // Taxable income = Gross - Employee SSS - Employee PhilHealth - Employee PagIbig
  const taxableIncome = grossEarnings - sssContribution - philHealthContribution - pagIbigContribution;

  // Determine withholding tax period type
  let wtPeriod: PayPeriodType = 'SEMI_MONTHLY';
  if (input.periodMode === 'MONTHLY') wtPeriod = 'MONTHLY';
  else if (input.periodMode === 'BI_WEEKLY') wtPeriod = 'SEMI_MONTHLY'; // use semi-monthly rates for bi-weekly

  const withholdingTax = calculateWithholdingTax(taxableIncome, wtPeriod);

  // Total deductions from employee salary
  const totalDeductions = sssContribution + philHealthContribution + pagIbigContribution +
    withholdingTax +
    input.salaryLoanDeduction + input.computerLoanDeduction +
    input.otherLoanDeductions + input.advancesDeduction + input.otherDeductions;

  // Net Pay = Gross Earnings - Total Deductions (employer share NOT included)
  const netPay = grossEarnings - totalDeductions;

  const r = (v: number) => Math.round(v * 100) / 100;

  return {
    dailyRate: r(dailyRate),
    hourlyRate: r(hourlyRate),
    basicPay: r(basicPay),
    overtimePay: r(overtimePay),
    holidayPay: r(holidayPay),
    nightDiffPay: r(totalNightDiffPay),
    restDayPay: r(restDayPay),
    bonusPay: r(input.bonusPay),
    mobileAllowance: r(input.mobileAllowance),
    performancePay: r(input.performancePay),
    otherAllowances: r(input.otherAllowances),
    sssContribution: r(sssContribution),
    philHealthContribution: r(philHealthContribution),
    pagIbigContribution: r(pagIbigContribution),
    withholdingTax: r(withholdingTax),
    employerSSS: r(employerSSS),
    employerPhilHealth: r(employerPhilHealth),
    employerPagIbig: r(employerPagIbig),
    employerEC: r(employerEC),
    salaryLoanDeduction: r(input.salaryLoanDeduction),
    computerLoanDeduction: r(input.computerLoanDeduction),
    otherLoanDeductions: r(input.otherLoanDeductions),
    advancesDeduction: r(input.advancesDeduction),
    otherDeductions: r(input.otherDeductions),
    grossEarnings: r(grossEarnings),
    taxableIncome: r(taxableIncome),
    totalDeductions: r(totalDeductions),
    netPay: r(netPay),
  };
}

// ============== HELPER FUNCTIONS ==============

export function getDaysInPeriod(year: number, month: number, isFirstHalf: boolean): number {
  if (isFirstHalf) return 15;
  const lastDay = new Date(year, month, 0).getDate();
  return lastDay - 15;
}

export function getPeriodDates(year: number, month: number, isFirstHalf: boolean): { start: Date; end: Date } {
  if (isFirstHalf) {
    return {
      start: new Date(year, month - 1, 1),
      end: new Date(year, month - 1, 15),
    };
  }
  const lastDay = new Date(year, month, 0).getDate();
  return {
    start: new Date(year, month - 1, 16),
    end: new Date(year, month - 1, lastDay),
  };
}

export function formatPeso(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
}

// Export the tables for Finance module display
export function getSSSTable() { return SSS_TABLE_2025; }
export function getPhilHealthRates() {
  return { rate: PHILHEALTH_RATE, floor: PHILHEALTH_FLOOR_SALARY, ceiling: PHILHEALTH_CEILING_SALARY };
}
export function getPagIbigRates() {
  return { maxComp: PAGIBIG_MAX_COMP, eeRateLow: 0.01, eeRateHigh: 0.02, erRate: 0.02, threshold: 1500 };
}
export function getWithholdingTaxTable() { return WITHHOLDING_TAX_TABLE; }
export function getIncomeTaxTable() { return INCOME_TAX_TABLE_ANNUAL; }
