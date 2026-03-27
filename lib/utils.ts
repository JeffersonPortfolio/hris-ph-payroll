import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "N/A";
  const d = new Date(date);
  return d.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Manila",
  });
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "N/A";
  const d = new Date(date);
  return d.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  });
}

export function formatTime(date: Date | string | null | undefined): string {
  if (!date) return "--:--";
  const d = new Date(date);
  return d.toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  });
}

export function generateEmployeeId(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `EMP-${year}-${random}`;
}

/**
 * Convert a UTC Date to Philippine Time (UTC+8) components.
 * Returns { year, month, day, hours, minutes, seconds } in PHT.
 */
function toPHT(date: Date): { year: number; month: number; day: number; hours: number; minutes: number; seconds: number } {
  // PHT is UTC+8, so add 8 hours worth of ms
  const phtMs = date.getTime() + (8 * 60 * 60 * 1000);
  const pht = new Date(phtMs);
  return {
    year: pht.getUTCFullYear(),
    month: pht.getUTCMonth(),
    day: pht.getUTCDate(),
    hours: pht.getUTCHours(),
    minutes: pht.getUTCMinutes(),
    seconds: pht.getUTCSeconds(),
  };
}

/**
 * Create a UTC Date from PHT hour/minute on a given PHT date.
 * E.g., 9:00 AM PHT on 2026-03-25 = 2026-03-25T01:00:00Z
 */
function phtTimeToUTC(phtYear: number, phtMonth: number, phtDay: number, phtHour: number, phtMin: number): Date {
  // Create as UTC, then subtract 8 hours to convert PHT -> UTC
  const utcMs = Date.UTC(phtYear, phtMonth, phtDay, phtHour, phtMin, 0, 0) - (8 * 60 * 60 * 1000);
  return new Date(utcMs);
}

/**
 * Calculate countable work hours with Philippine company rules:
 * 
 * RULES:
 * 1. Work window: 9:00 AM - 7:00 PM PHT only
 * 2. Clock-in before 9:00 AM → treated as 9:00 AM (effective start = 9AM)
 * 3. Flexible clock-in: 9:00 AM to 10:00 AM (no late)
 * 4. Late: only if clock-in AFTER 10:00 AM PHT
 * 5. Required hours: FIXED 9 hours — always capped, never more
 * 6. Undertime: if worked < 9 hours (e.g., clock out 5:59 PM when started 9AM)
 * 7. No break deduction (breakMinutes=0 setup)
 * 
 * Returns { totalHours, overtimeMinutes, undertimeMinutes, lateMinutes, rawHours }
 */
export function calculateWorkHoursDetailed(
  clockIn: Date | null, 
  clockOut: Date | null,
  options?: {
    windowStartHour?: number;   // default 9 (9AM PHT) - counting starts here
    windowStartMin?: number;    // default 0
    windowEndHour?: number;     // default 19 (7PM PHT) - counting stops here
    windowEndMin?: number;      // default 0
    lateThresholdHour?: number; // default 10 (10AM PHT) - late only after this
    lateThresholdMin?: number;  // default 0
    breakMinutes?: number;      // default 0
    requiredHours?: number;     // default 9
  }
): { totalHours: number; overtimeMinutes: number; undertimeMinutes: number; lateMinutes: number; rawHours: number } {
  const empty = { totalHours: 0, overtimeMinutes: 0, undertimeMinutes: 0, lateMinutes: 0, rawHours: 0 };
  if (!clockIn || !clockOut) return empty;
  
  const windowStartHour = options?.windowStartHour ?? 9;
  const windowStartMin = options?.windowStartMin ?? 0;
  const windowEndHour = options?.windowEndHour ?? 19; // 7PM
  const windowEndMin = options?.windowEndMin ?? 0;
  const lateThresholdHour = options?.lateThresholdHour ?? 10; // 10AM
  const lateThresholdMin = options?.lateThresholdMin ?? 0;
  const breakMinutes = options?.breakMinutes ?? 0;
  const requiredHours = options?.requiredHours ?? 9;
  
  // Get the PHT date of clock-in to determine window boundaries
  const phtClockIn = toPHT(clockIn);
  
  // Create window boundaries in UTC based on PHT times
  const windowStartUTC = phtTimeToUTC(phtClockIn.year, phtClockIn.month, phtClockIn.day, windowStartHour, windowStartMin);
  const windowEndUTC = phtTimeToUTC(phtClockIn.year, phtClockIn.month, phtClockIn.day, windowEndHour, windowEndMin);
  const lateThresholdUTC = phtTimeToUTC(phtClockIn.year, phtClockIn.month, phtClockIn.day, lateThresholdHour, lateThresholdMin);
  
  // Clamp: effective start = max(clockIn, windowStart)
  // If clock-in is 8:59 AM, effective start becomes 9:00 AM
  const effectiveStart = clockIn.getTime() < windowStartUTC.getTime() ? windowStartUTC : clockIn;
  
  // Clamp: effective end = min(clockOut, windowEnd)
  // If clock-out is after 7PM, stop counting at 7PM
  const effectiveEnd = clockOut.getTime() > windowEndUTC.getTime() ? windowEndUTC : clockOut;
  
  // If effective start is after effective end, no countable hours
  if (effectiveStart.getTime() >= effectiveEnd.getTime()) return empty;
  
  const diffMs = effectiveEnd.getTime() - effectiveStart.getTime();
  let rawHours = diffMs / (1000 * 60 * 60);
  
  // Subtract break time if applicable
  if (breakMinutes > 0) {
    rawHours = Math.max(0, rawHours - (breakMinutes / 60));
  }
  
  rawHours = Math.round(rawHours * 100) / 100;
  
  // Cap at required hours — FIXED 9 hours, no recording beyond that
  const totalHours = Math.min(rawHours, requiredHours);
  
  // Overtime: NOT recorded (always 0) — requirement says "hindi irerecord kahit lagpas ng 9 hours"
  const overtimeMinutes = 0;
  
  // Undertime: if worked less than required hours
  const undertimeMinutes = rawHours < requiredHours ? Math.round((requiredHours - rawHours) * 60) : 0;
  
  // Late: only if clock-in is AFTER 10:00 AM PHT (the lateThreshold)
  let lateMinutes = 0;
  if (clockIn.getTime() > lateThresholdUTC.getTime()) {
    lateMinutes = Math.round((clockIn.getTime() - lateThresholdUTC.getTime()) / (1000 * 60));
  }
  
  return { totalHours, overtimeMinutes, undertimeMinutes, lateMinutes, rawHours };
}

/**
 * Simple version - returns just the capped total hours.
 */
export function calculateWorkHours(
  clockIn: Date | null, 
  clockOut: Date | null,
  options?: {
    windowStartHour?: number;
    windowStartMin?: number;
    windowEndHour?: number;
    windowEndMin?: number;
    lateThresholdHour?: number;
    lateThresholdMin?: number;
    breakMinutes?: number;
    requiredHours?: number;
  }
): number {
  return calculateWorkHoursDetailed(clockIn, clockOut, options).totalHours;
}

/**
 * Calculate late minutes based on 10AM PHT threshold.
 * Flexible clock-in: 9AM-10AM is NOT late. Late only AFTER 10:00 AM.
 */
export function calculateLateMinutes(clockIn: Date, lateThresholdHour?: number, lateThresholdMin?: number): number {
  const phtIn = toPHT(clockIn);
  const thresholdHour = lateThresholdHour ?? 10; // 10AM PHT — flexible until 10AM
  const thresholdMin = lateThresholdMin ?? 0;
  
  const clockInMinutes = phtIn.hours * 60 + phtIn.minutes;
  const thresholdMinutes = thresholdHour * 60 + thresholdMin;
  
  if (clockInMinutes > thresholdMinutes) {
    return clockInMinutes - thresholdMinutes;
  }
  return 0;
}

export function calculateLeaveDays(startDate: Date, endDate: Date, isHalfDay: boolean): number {
  if (isHalfDay) return 0.5;
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
}

export function getLeaveTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    ANNUAL: "Annual Leave",
    SICK: "Sick Leave",
    EMERGENCY: "Emergency Leave",
    WFH: "Work From Home",
    COMPASSIONATE: "Compassionate Leave",
  };
  return labels[type] || type;
}

export function getFilingTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    ADVANCE: "3+ Days Filing",
    URGENT: "Urgent Filing",
  };
  return labels[type] || type;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PRESENT: "bg-green-100 text-green-800",
    LATE: "bg-yellow-100 text-yellow-800",
    ABSENT: "bg-red-100 text-red-800",
    HALF_DAY: "bg-orange-100 text-orange-800",
    PENDING: "bg-yellow-100 text-yellow-800",
    APPROVED: "bg-green-100 text-green-800",
    REJECTED: "bg-red-100 text-red-800",
    PROBATIONARY: "bg-blue-100 text-blue-800",
    REGULAR: "bg-green-100 text-green-800",
    RESIGNED: "bg-gray-100 text-gray-800",
    INACTIVE: "bg-gray-100 text-gray-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
}

export function getManilaDate(): Date {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
}

export function getManilaDateString(): string {
  return getManilaDate().toISOString().split("T")[0];
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "₱0.00";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount);
}