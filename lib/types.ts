import { UserRole, EmploymentType, EmploymentStatus, LeaveType, LeaveStatus, AttendanceStatus, Gender, CivilStatus, SubscriptionStatus, SubscriptionType } from "@prisma/client";

export type {
  UserRole,
  EmploymentType,
  EmploymentStatus,
  LeaveType,
  LeaveStatus,
  AttendanceStatus,
  Gender,
  CivilStatus,
  SubscriptionStatus,
  SubscriptionType,
};

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  employeeId: string | null;
  companyId: string | null;
  companyName: string | null;
  impersonatedCompanyId: string | null;
  impersonatedCompanyName: string | null;
}

export interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  probationaryEmployees: number;
  regularEmployees: number;
  todayPresent: number;
  todayLate: number;
  todayAbsent: number;
  pendingLeaves: number;
}

export interface AttendanceSummary {
  date: string;
  present: number;
  late: number;
  absent: number;
}

export interface LeaveTypeSummary {
  type: LeaveType;
  count: number;
}

export interface DepartmentSummary {
  name: string;
  count: number;
}
