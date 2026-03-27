// Utility functions for loan amortization schedule generation

import { format, addDays } from 'date-fns';

export interface CutoffPeriod {
  label: string;
  start: Date;
  end: Date;
}

/**
 * Generate semi-monthly cutoff periods starting from firstAmortizationDate.
 * Default cutoffs: 27th-10th (SECOND_HALF) and 11th-25th (FIRST_HALF)
 * The label format: "26 Dec - 10 Jan 2026"
 */
export function generateAmortizationSchedule(
  totalAmount: number,
  termMonths: number,
  firstAmortizationDate: Date
): { periods: CutoffPeriod[]; perPayAmount: number } {
  const totalPeriods = termMonths * 2; // semi-monthly
  const perPayAmount = Math.round((totalAmount / totalPeriods) * 100) / 100;

  const periods: CutoffPeriod[] = [];
  let currentDate = new Date(firstAmortizationDate);

  for (let i = 0; i < totalPeriods; i++) {
    const { start, end } = getCutoffBounds(currentDate);
    const label = formatCutoffLabel(start, end);
    periods.push({ label, start, end });
    // Move to next cutoff
    currentDate = addDays(end, 1);
  }

  return { periods, perPayAmount };
}

/**
 * Given any date, find which semi-monthly cutoff it falls into.
 * Cutoffs: 26th-10th and 11th-25th
 */
function getCutoffBounds(date: Date): { start: Date; end: Date } {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  if (day >= 26) {
    // 26th of this month to 10th of next month
    const start = new Date(year, month, 26);
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    const end = new Date(nextYear, nextMonth, 10);
    return { start, end };
  } else if (day >= 11) {
    // 11th to 25th of this month
    const start = new Date(year, month, 11);
    const end = new Date(year, month, 25);
    return { start, end };
  } else {
    // 1st-10th: belongs to 26th prev month - 10th this month
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const start = new Date(prevYear, prevMonth, 26);
    const end = new Date(year, month, 10);
    return { start, end };
  }
}

/**
 * Format cutoff label like "26 Dec - 10 Jan 2026"
 */
function formatCutoffLabel(start: Date, end: Date): string {
  const sDay = start.getDate();
  const sMonth = format(start, 'MMM');
  const eDay = end.getDate();
  const eMonth = format(end, 'MMM');
  const eYear = end.getFullYear();

  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${sDay} ${sMonth} - ${eDay} ${eMonth} ${eYear}`;
  }
  return `${sDay} ${sMonth} - ${eDay} ${eMonth} ${eYear}`;
}
