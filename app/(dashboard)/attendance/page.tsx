"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Download, Search, Filter, Edit, Calendar, RefreshCw, Lock, Unlock, CheckCircle, AlertCircle, Play, UserCheck } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameDay, getDay, parseISO, isWithinInterval } from "date-fns";
import { toast } from "sonner";

interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  department?: { name: string };
}

interface Attendance {
  id: string;
  employeeId: string;
  date: string;
  clockIn?: string;
  clockOut?: string;
  totalHours?: number;
  status: string;
  lateMinutes: number;
  undertimeMinutes: number;
  overtimeMinutes: number;
  nightDiffMinutes: number;
  nightDiffOTMinutes: number;
  isHoliday: boolean;
  holidayType?: string;
  holidayMultiplier: number;
  notes?: string;
  isManualAdjust: boolean;
}

interface Holiday {
  id: string;
  name: string;
  date: string;
  type: string;
}

interface PayrollPeriod {
  id: string;
  periodType: 'FIRST_HALF' | 'SECOND_HALF';
  month: number;
  year: number;
  startDate: string;
  endDate: string;
  cutoffDate: string;
  payDate: string;
  status: 'DRAFT' | 'PROCESSING' | 'APPROVED' | 'PAID';
  isLocked: boolean;
  _count?: { payrolls: number };
}

interface AttendanceSummary {
  totalHours: number;
  totalLoggedHours: number;
  lateMinutes: number;
  undertimeMinutes: number;
  overtimeMinutes: number;
  absentDays: number;
  nightDiffMinutes: number;
  nightDiffOTMinutes: number;
  leaveDays: number;
  ctoMinutes: number;
  workDays: number;
}

interface CutoffSettings {
  cutoff1Start: number;
  cutoff1End: number;
  cutoff2Start: number;
  cutoff2End: number;
}

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function AttendancePage() {
  const { data: session } = useSession() || {};
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceData, setAttendanceData] = useState<Record<string, Attendance[]>>({});
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{ employee: Employee; date: Date; attendance?: Attendance } | null>(null);
  const [editForm, setEditForm] = useState({
    clockIn: "",
    clockOut: "",
    status: "PRESENT",
    lateMinutes: 0,
    undertimeMinutes: 0,
    overtimeMinutes: 0,
    notes: "",
  });
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  
  // Cutoff Period State
  const [payrollPeriods, setPayrollPeriods] = useState<PayrollPeriod[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null);
  const [viewMode, setViewMode] = useState<'cutoff' | 'monthly'>('cutoff');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  
  // Cutoff Settings from System Settings
  const [cutoffSettings, setCutoffSettings] = useState<CutoffSettings>({
    cutoff1Start: 27,
    cutoff1End: 10,
    cutoff2Start: 11,
    cutoff2End: 25,
  });
  
  // Bulk Mark as Present
  const [markPresentDialogOpen, setMarkPresentDialogOpen] = useState(false);
  const [markPresentDate, setMarkPresentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [markPresentClockIn, setMarkPresentClockIn] = useState('09:00');
  const [markPresentClockOut, setMarkPresentClockOut] = useState('18:00');
  const [markPresentSkipExisting, setMarkPresentSkipExisting] = useState(true);
  const [markPresentLoading, setMarkPresentLoading] = useState(false);

  // Track fetch state to prevent multiple loads
  const fetchingRef = useRef(false);
  const lastFetchKey = useRef<string>("");
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [autoCreatingPeriod, setAutoCreatingPeriod] = useState(false);
  const initializedRef = useRef(false);
  
  // Create Period Dialog State
  const [createPeriodDialogOpen, setCreatePeriodDialogOpen] = useState(false);
  const [newPeriodForm, setNewPeriodForm] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    periodType: 'FIRST_HALF' as 'FIRST_HALF' | 'SECOND_HALF',
  });
  const [creatingPeriod, setCreatingPeriod] = useState(false);

  const isAdmin = (session?.user as any)?.role === "ADMIN" || (session?.user as any)?.role === "HR";
  const isEmployee = (session?.user as any)?.role === "EMPLOYEE";

  // Memoize date range to prevent unnecessary recalculations
  const dateRange = useMemo(() => {
    if (viewMode === 'cutoff' && selectedPeriod) {
      return {
        start: parseISO(selectedPeriod.startDate),
        end: parseISO(selectedPeriod.endDate),
      };
    }
    return {
      start: startOfMonth(currentDate),
      end: endOfMonth(currentDate),
    };
  }, [viewMode, selectedPeriod?.startDate, selectedPeriod?.endDate, currentDate]);

  const { start: startDate, end: endDate } = dateRange;
  const daysInRange = useMemo(() => eachDayOfInterval({ start: startDate, end: endDate }), [startDate, endDate]);

  // Get current period info based on cutoff settings
  const getCurrentPeriodInfo = useCallback((settings: CutoffSettings) => {
    const now = new Date();
    const day = now.getDate();
    let periodType: 'FIRST_HALF' | 'SECOND_HALF';
    let month = now.getMonth() + 1;
    let year = now.getFullYear();
    
    if (day >= settings.cutoff1Start) {
      periodType = 'FIRST_HALF';
      month = month === 12 ? 1 : month + 1;
      year = month === 1 ? year + 1 : year;
    } else if (day <= settings.cutoff1End) {
      periodType = 'FIRST_HALF';
    } else if (day >= settings.cutoff2Start && day <= settings.cutoff2End) {
      periodType = 'SECOND_HALF';
    } else {
      periodType = 'SECOND_HALF';
    }
    
    return { periodType, month, year };
  }, []);

  // Fetch attendance data for the grid
  const fetchAttendanceData = useCallback(async (startStr: string, endStr: string, deptId: string) => {
    const deptParam = deptId !== "all" ? `&departmentId=${deptId}` : "";
    const [gridRes, deptRes] = await Promise.all([
      fetch(`/api/attendance/grid?startDate=${startStr}&endDate=${endStr}${deptParam}`),
      fetch("/api/departments"),
    ]);

    const [gridData, deptData] = await Promise.all([
      gridRes.ok ? gridRes.json() : null,
      deptRes.ok ? deptRes.json() : null,
    ]);

    if (gridData) {
      setEmployees(gridData.employees || []);
      setAttendanceData(gridData.attendanceByEmployee || {});
      setHolidays(gridData.holidays || []);
    }

    if (deptData) {
      setDepartments(deptData.departments || deptData || []);
    }
  }, []);

  // Single consolidated initial load effect - runs ONCE
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    
    const initializeData = async () => {
      try {
        // Step 1: Fetch settings
        let settings = cutoffSettings;
        try {
          const settingsRes = await fetch('/api/settings');
          if (settingsRes.ok) {
            const data = await settingsRes.json();
            settings = {
              cutoff1Start: parseInt(data.payroll_cutoff_1_start || '27'),
              cutoff1End: parseInt(data.payroll_cutoff_1_end || '10'),
              cutoff2Start: parseInt(data.payroll_cutoff_2_start || '11'),
              cutoff2End: parseInt(data.payroll_cutoff_2_end || '25'),
            };
            setCutoffSettings(settings);
            setSettingsLoaded(true);
          }
        } catch (e) {
          console.error("Error fetching settings:", e);
          setSettingsLoaded(true);
        }

        // Step 2: Fetch payroll periods and auto-select
        let period: PayrollPeriod | null = null;
        const year = new Date().getFullYear();
        try {
          // Fetch periods for current year, previous year, and next year to handle year transitions
          const periodsRes = await fetch(`/api/payroll/periods`);
          if (periodsRes.ok) {
            const periodsData = await periodsRes.json();
            setPayrollPeriods(periodsData);
            
            // Auto-select current period
            const { periodType, month, year: periodYear } = getCurrentPeriodInfo(settings);
            period = periodsData.find(
              (p: PayrollPeriod) => p.month === month && p.year === periodYear && p.periodType === periodType
            ) || periodsData.find((p: PayrollPeriod) => !p.isLocked && p.status === 'DRAFT') || null;
            
            // Auto-create period if needed (admin only)
            const role = (session?.user as any)?.role;
            const canCreate = role === "ADMIN" || role === "HR";
            if (canCreate && !period) {
              const existingPeriod = periodsData.find(
                (p: PayrollPeriod) => p.month === month && p.year === periodYear && p.periodType === periodType
              );
              if (!existingPeriod) {
                setAutoCreatingPeriod(true);
                const createRes = await fetch('/api/payroll/periods', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ month, year: periodYear, periodType }),
                });
                if (createRes.ok) {
                  const newPeriod = await createRes.json();
                  setPayrollPeriods(prev => [...prev, newPeriod]);
                  period = newPeriod;
                  toast.success(`Created cutoff period: ${MONTH_NAMES[month - 1]} ${periodYear} - ${periodType === 'FIRST_HALF' ? '1st' : '2nd'} Cutoff`);
                }
                setAutoCreatingPeriod(false);
              }
            }
          }
        } catch (e) {
          console.error("Error fetching periods:", e);
        }

        // Step 3: Fetch attendance data using the determined period
        const now = new Date();
        const rangeStart = period ? parseISO(period.startDate) : startOfMonth(now);
        const rangeEnd = period ? parseISO(period.endDate) : endOfMonth(now);
        const startStr = format(rangeStart, "yyyy-MM-dd");
        const endStr = format(rangeEnd, "yyyy-MM-dd");
        
        // Set the period AFTER calculating dates to prevent re-render cascade
        if (period) setSelectedPeriod(period);
        lastFetchKey.current = `${startStr}-${endStr}-all`;
        
        await fetchAttendanceData(startStr, endStr, "all");
        
        setLoading(false);
        setInitialLoading(false);
      } catch (error) {
        console.error("Error initializing data:", error);
        setLoading(false);
        setInitialLoading(false);
      }
    };

    initializeData();
  }, []);

  // Handle user-initiated changes (department filter, period selection changes)
  const loadAttendanceForPeriod = useCallback(async (period: PayrollPeriod | null, dept: string) => {
    if (initialLoading) return;
    
    const now = new Date();
    const rangeStart = period ? parseISO(period.startDate) : startOfMonth(now);
    const rangeEnd = period ? parseISO(period.endDate) : endOfMonth(now);
    const startStr = format(rangeStart, "yyyy-MM-dd");
    const endStr = format(rangeEnd, "yyyy-MM-dd");
    
    const fetchKey = `${startStr}-${endStr}-${dept}`;
    if (fetchKey === lastFetchKey.current) return;
    lastFetchKey.current = fetchKey;
    
    setLoading(true);
    try {
      await fetchAttendanceData(startStr, endStr, dept);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, [initialLoading, fetchAttendanceData]);

  // Handle year change for payroll periods
  const handleYearChange = useCallback(async (year: number) => {
    setSelectedYear(year);
    try {
      const res = await fetch(`/api/payroll/periods?year=${year}`);
      if (res.ok) {
        const data = await res.json();
        setPayrollPeriods(data);
      }
    } catch (error) {
      console.error("Error fetching periods:", error);
    }
  }, []);

  // Refresh function for manual refresh button
  const handleRefresh = useCallback(async () => {
    const now = new Date();
    const rangeStart = selectedPeriod ? parseISO(selectedPeriod.startDate) : startOfMonth(now);
    const rangeEnd = selectedPeriod ? parseISO(selectedPeriod.endDate) : endOfMonth(now);
    
    setLoading(true);
    lastFetchKey.current = ""; // Force refresh
    try {
      await fetchAttendanceData(
        format(rangeStart, "yyyy-MM-dd"),
        format(rangeEnd, "yyyy-MM-dd"),
        selectedDepartment
      );
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast.error("Failed to refresh data");
    } finally {
      setLoading(false);
    }
  }, [fetchAttendanceData, selectedPeriod, selectedDepartment]);

  const getAttendanceForDay = (employeeId: string, date: Date): Attendance | undefined => {
    const empAttendance = attendanceData[employeeId] || [];
    return empAttendance.find((att) => isSameDay(parseISO(att.date), date));
  };

  const isHoliday = (date: Date): Holiday | undefined => {
    return holidays.find((h) => isSameDay(parseISO(h.date), date));
  };

  const getCellDisplay = (attendance?: Attendance, date?: Date): string => {
    const holiday = date ? isHoliday(date) : undefined;
    const dayOfWeek = date ? getDay(date) : -1;
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    if (holiday) return "H";
    if (isWeekend && !attendance) return "--";
    if (!attendance) return "--";
    if (attendance.status === "ABSENT") return "A";
    if (attendance.status === "ON_LEAVE") return "LV";
    if (attendance.status === "HALF_DAY") return "½";
    
    // Check for clock-in without clock-out (incomplete - no logout yet)
    if (attendance.clockIn && !attendance.clockOut) {
      return "P?"; // Present but no clock out yet - needs attention
    }
    
    if (attendance.status === "LATE") return "L";
    if (attendance.status === "PRESENT" || attendance.clockIn) return "P";
    return "--";
  };

  const getCellStyle = (attendance?: Attendance, date?: Date): string => {
    const holiday = date ? isHoliday(date) : undefined;
    const dayOfWeek = date ? getDay(date) : -1;
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    let baseStyle = "text-center text-xs p-1 min-w-[40px] border-r border-gray-200 font-medium ";
    
    if (holiday) return baseStyle + "bg-red-200 text-red-700";
    if (isWeekend && !attendance) return baseStyle + "bg-gray-100 text-gray-400";
    if (!attendance) return baseStyle + "text-gray-400";
    if (attendance.status === "ABSENT") return baseStyle + "bg-red-100 text-red-600";
    if (attendance.status === "ON_LEAVE") return baseStyle + "bg-purple-100 text-purple-600";
    if (attendance.status === "HALF_DAY") return baseStyle + "bg-orange-100 text-orange-600";
    
    // Highlight incomplete attendance (clock-in but no clock-out) in yellow/warning
    if (attendance.clockIn && !attendance.clockOut) {
      return baseStyle + "bg-yellow-100 text-yellow-700";
    }
    
    if (attendance.status === "LATE") return baseStyle + "bg-amber-100 text-amber-700";
    if (attendance.status === "PRESENT" || attendance.clockIn) return baseStyle + "bg-cyan-100 text-cyan-700";
    return baseStyle + "text-gray-400";
  };

  const calculateSummary = (employeeId: string): AttendanceSummary => {
    const empAttendance = attendanceData[employeeId] || [];
    // Only count hours from complete attendance records (with both clock in AND clock out)
    const completeRecords = empAttendance.filter(a => a.clockIn && a.clockOut);
    const incompleteRecords = empAttendance.filter(a => a.clockIn && !a.clockOut);
    
    return {
      // Total hours only from COMPLETE records (both in and out)
      totalHours: completeRecords.reduce((sum, a) => sum + (a.totalHours || 0), 0),
      // Same as totalHours now - keeping for compatibility
      totalLoggedHours: completeRecords.reduce((sum, a) => sum + (a.totalHours || 0), 0),
      lateMinutes: empAttendance.reduce((sum, a) => sum + (a.lateMinutes || 0), 0),
      undertimeMinutes: empAttendance.reduce((sum, a) => sum + (a.undertimeMinutes || 0), 0),
      overtimeMinutes: empAttendance.reduce((sum, a) => sum + (a.overtimeMinutes || 0), 0),
      absentDays: empAttendance.filter(a => a.status === "ABSENT").length,
      nightDiffMinutes: empAttendance.reduce((sum, a) => sum + (a.nightDiffMinutes || 0), 0),
      nightDiffOTMinutes: empAttendance.reduce((sum, a) => sum + (a.nightDiffOTMinutes || 0), 0),
      leaveDays: 0,
      ctoMinutes: incompleteRecords.length, // Repurpose CTO to show "No Logout" count
      workDays: empAttendance.filter(a => a.status === "PRESENT" || a.status === "LATE").length,
    };
  };

  const handleCellClick = (employee: Employee, date: Date) => {
    if (!isAdmin) return;
    if (selectedPeriod?.isLocked) {
      toast.error("Cannot edit. This cutoff period is locked.");
      return;
    }
    const attendance = getAttendanceForDay(employee.id, date);
    setSelectedCell({ employee, date, attendance });
    setEditForm({
      clockIn: attendance?.clockIn ? format(new Date(attendance.clockIn), "HH:mm") : "",
      clockOut: attendance?.clockOut ? format(new Date(attendance.clockOut), "HH:mm") : "",
      status: attendance?.status || "PRESENT",
      lateMinutes: attendance?.lateMinutes || 0,
      undertimeMinutes: attendance?.undertimeMinutes || 0,
      overtimeMinutes: attendance?.overtimeMinutes || 0,
      notes: attendance?.notes || "",
    });
    setEditDialogOpen(true);
  };

  const handleSaveAttendance = async () => {
    if (!selectedCell) return;
    try {
      const dateStr = format(selectedCell.date, "yyyy-MM-dd");
      const method = selectedCell.attendance ? "PUT" : "POST";
      const url = selectedCell.attendance 
        ? `/api/attendance/${selectedCell.attendance.id}` 
        : "/api/attendance";
      
      // Create proper Date objects from local time input
      // This ensures the time is correctly converted to UTC when sent to server
      let clockInTime: string | null = null;
      let clockOutTime: string | null = null;
      
      if (editForm.clockIn) {
        const [hours, minutes] = editForm.clockIn.split(':').map(Number);
        const clockInDate = new Date(selectedCell.date);
        clockInDate.setHours(hours, minutes, 0, 0);
        clockInTime = clockInDate.toISOString();
      }
      
      if (editForm.clockOut) {
        const [hours, minutes] = editForm.clockOut.split(':').map(Number);
        const clockOutDate = new Date(selectedCell.date);
        clockOutDate.setHours(hours, minutes, 0, 0);
        clockOutTime = clockOutDate.toISOString();
      }

      const body = {
        employeeId: selectedCell.employee.id,
        date: dateStr,
        clockIn: clockInTime,
        clockOut: clockOutTime,
        status: editForm.status,
        lateMinutes: editForm.lateMinutes,
        undertimeMinutes: editForm.undertimeMinutes,
        overtimeMinutes: editForm.overtimeMinutes,
        notes: editForm.notes,
        isManualAdjust: true,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success("Attendance updated");
        setEditDialogOpen(false);
        handleRefresh();
      } else {
        toast.error("Failed to update attendance");
      }
    } catch (error) {
      console.error("Error saving attendance:", error);
      toast.error("Failed to save attendance");
    }
  };

  const handleBulkMarkPresent = async () => {
    if (!markPresentDate) {
      toast.error('Please select a date');
      return;
    }
    setMarkPresentLoading(true);
    try {
      const res = await fetch('/api/attendance/bulk-present', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: markPresentDate,
          clockIn: markPresentClockIn,
          clockOut: markPresentClockOut,
          skipExisting: markPresentSkipExisting,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Marked present: ${data.created} created, ${data.updated} updated, ${data.skipped} skipped`);
        setMarkPresentDialogOpen(false);
        handleRefresh();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to mark attendance');
      }
    } catch (error) {
      console.error('Error marking present:', error);
      toast.error('Failed to mark attendance');
    } finally {
      setMarkPresentLoading(false);
    }
  };

  const handleLockPeriod = async (periodId: string, lock: boolean) => {
    const confirmMsg = lock 
      ? "Lock this cutoff period? Attendance records cannot be edited after locking. You can then generate payroll."
      : "Unlock this cutoff period?";
    
    if (!confirm(confirmMsg)) return;
    
    try {
      const res = await fetch('/api/payroll/periods', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: periodId, isLocked: lock }),
      });

      if (res.ok) {
        toast.success(lock ? 'Cutoff period locked - Ready for payroll generation' : 'Cutoff period unlocked');
        // Refresh periods and update selected period
        const periodsRes = await fetch(`/api/payroll/periods?year=${selectedYear}`);
        if (periodsRes.ok) {
          const data = await periodsRes.json();
          setPayrollPeriods(data);
          const updatedPeriod = data.find((p: PayrollPeriod) => p.id === periodId);
          if (updatedPeriod) setSelectedPeriod(updatedPeriod);
        }
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update');
      }
    } catch (error) {
      toast.error('Failed to update lock status');
    }
  };

  const handleGeneratePayroll = async (periodId: string) => {
    if (!confirm('Generate payroll for this cutoff period? This will compute salaries based on attendance records.')) return;
    
    try {
      const res = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodId }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Payroll generated for ${data.count} employees. Go to Payroll page to review and approve.`);
        // Refresh periods and update selected period
        const periodsRes = await fetch(`/api/payroll/periods?year=${selectedYear}`);
        if (periodsRes.ok) {
          const periodsData = await periodsRes.json();
          setPayrollPeriods(periodsData);
          const updatedPeriod = periodsData.find((p: PayrollPeriod) => p.id === periodId);
          if (updatedPeriod) setSelectedPeriod(updatedPeriod);
        }
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to generate payroll');
      }
    } catch (error) {
      toast.error('Failed to generate payroll');
    }
  };

  const handleCreatePeriod = async () => {
    setCreatingPeriod(true);
    try {
      const res = await fetch('/api/payroll/periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPeriodForm),
      });

      if (res.ok) {
        const newPeriod = await res.json();
        setPayrollPeriods(prev => [...prev, newPeriod].sort((a, b) => {
          if (a.year !== b.year) return b.year - a.year;
          if (a.month !== b.month) return b.month - a.month;
          return a.periodType === 'SECOND_HALF' ? -1 : 1;
        }));
        setSelectedPeriod(newPeriod);
        loadAttendanceForPeriod(newPeriod, selectedDepartment);
        toast.success(`Created: ${MONTH_NAMES[newPeriodForm.month - 1]} ${newPeriodForm.year} - ${newPeriodForm.periodType === 'FIRST_HALF' ? '1st' : '2nd'} Cutoff`);
        setCreatePeriodDialogOpen(false);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to create period');
      }
    } catch (error) {
      toast.error('Failed to create period');
    } finally {
      setCreatingPeriod(false);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch = 
      emp.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDepartment === "all" || emp.department?.name === selectedDepartment;
    return matchesSearch && matchesDept;
  });

  const exportToCSV = () => {
    const headers = ["Employee ID", "Employee Name", ...daysInRange.map(d => format(d, "MMM d")), "Total Hours", "No Logout (days)", "Late (min)", "OT (min)", "Absent", "Work Days"];
    const rows = filteredEmployees.map((emp) => {
      const summary = calculateSummary(emp.id);
      return [
        emp.employeeId,
        `${emp.firstName} ${emp.lastName}`,
        ...daysInRange.map(d => getCellDisplay(getAttendanceForDay(emp.id, d), d)),
        summary.totalHours.toFixed(1),
        summary.ctoMinutes, // No Logout count
        summary.lateMinutes,
        summary.overtimeMinutes,
        summary.absentDays,
        summary.workDays,
      ];
    });
    
    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const periodLabel = selectedPeriod 
      ? `${selectedPeriod.periodType}_${selectedPeriod.month}_${selectedPeriod.year}` 
      : format(currentDate, "yyyy-MM");
    a.download = `attendance_${periodLabel}.csv`;
    a.click();
  };

  const getPeriodLabel = (period: PayrollPeriod) => {
    const startDate = parseISO(period.startDate);
    const endDate = parseISO(period.endDate);
    return `${format(startDate, "MMM d")} - ${format(endDate, "MMM d, yyyy")}`;
  };

  const getStatusBadge = (period: PayrollPeriod) => {
    if (period.status === 'PAID') return <Badge className="bg-green-500">PAID</Badge>;
    if (period.status === 'APPROVED') return <Badge className="bg-blue-500">APPROVED</Badge>;
    if (period.status === 'PROCESSING') return <Badge className="bg-amber-500">PROCESSING</Badge>;
    if (period.isLocked) return <Badge variant="secondary"><Lock className="h-3 w-3 mr-1" /> LOCKED</Badge>;
    return <Badge variant="outline">OPEN</Badge>;
  };

  // Get cutoff label from settings
  const getCutoffLabel = (periodType: string) => {
    if (periodType === 'FIRST_HALF') {
      return `1st Cutoff (${cutoffSettings.cutoff1Start}-${cutoffSettings.cutoff1End})`;
    }
    return `2nd Cutoff (${cutoffSettings.cutoff2Start}-${cutoffSettings.cutoff2End})`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold tracking-tight">ATTENDANCE</h1>
          <p className="text-sm text-gray-500 mt-1">
            {viewMode === 'cutoff' && selectedPeriod ? (
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {MONTH_NAMES[selectedPeriod.month - 1]} {selectedPeriod.year} - {getCutoffLabel(selectedPeriod.periodType)}
                {getStatusBadge(selectedPeriod)}
              </span>
            ) : (
              <span>Monthly View: {format(currentDate, "MMMM yyyy")}</span>
            )}
          </p>
        </div>
        
        {/* Current Cutoff Info */}
        {settingsLoaded && (
          <div className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
            <span className="font-medium">Cutoff Schedule:</span>
            <span className="ml-2">1st: {cutoffSettings.cutoff1Start}th-{cutoffSettings.cutoff1End}th</span>
            <span className="mx-2">|</span>
            <span>2nd: {cutoffSettings.cutoff2Start}th-{cutoffSettings.cutoff2End}th</span>
          </div>
        )}
      </div>

      {/* View Mode Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'cutoff' | 'monthly')}>
        <TabsList>
          <TabsTrigger value="cutoff">By Cutoff Period</TabsTrigger>
          <TabsTrigger value="monthly">Monthly View</TabsTrigger>
        </TabsList>

        <TabsContent value="cutoff" className="space-y-4">
          {/* Cutoff Period Selector */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label>Year:</Label>
                  <Select value={selectedYear.toString()} onValueChange={(v) => handleYearChange(parseInt(v))}>
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2024, 2025, 2026, 2027].map((year) => (
                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center gap-2">
                  <Label>Cutoff Period:</Label>
                  <Select 
                    value={selectedPeriod?.id || ''} 
                    onValueChange={(v) => {
                      const period = payrollPeriods.find(p => p.id === v);
                      setSelectedPeriod(period || null);
                      if (period) loadAttendanceForPeriod(period, selectedDepartment);
                    }}
                  >
                    <SelectTrigger className="w-[280px]">
                      <SelectValue placeholder="Select cutoff period" />
                    </SelectTrigger>
                    <SelectContent>
                      {payrollPeriods.map((period) => (
                        <SelectItem key={period.id} value={period.id}>
                          <div className="flex items-center gap-2">
                            {period.isLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                            {MONTH_NAMES[period.month - 1]} {period.year} - {getCutoffLabel(period.periodType)}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCreatePeriodDialogOpen(true)}
                      title="Add New Cutoff Period"
                    >
                      <Calendar className="h-4 w-4 mr-1" /> Add Period
                    </Button>
                  )}
                </div>

                {selectedPeriod && isAdmin && (
                  <div className="flex items-center gap-2 ml-auto">
                    {selectedPeriod.status === 'DRAFT' && (
                      <>
                        <Button
                          variant={selectedPeriod.isLocked ? "outline" : "default"}
                          size="sm"
                          onClick={() => handleLockPeriod(selectedPeriod.id, !selectedPeriod.isLocked)}
                        >
                          {selectedPeriod.isLocked ? (
                            <><Unlock className="h-4 w-4 mr-2" /> Unlock</>  
                          ) : (
                            <><Lock className="h-4 w-4 mr-2" /> Lock Cutoff</>
                          )}
                        </Button>
                        {selectedPeriod.isLocked && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleGeneratePayroll(selectedPeriod.id)}
                          >
                            <Play className="h-4 w-4 mr-2" /> Generate Payroll
                          </Button>
                        )}
                      </>
                    )}
                    {selectedPeriod.status === 'PROCESSING' && (
                      <Badge className="bg-amber-500">Payroll Processing</Badge>
                    )}
                    {selectedPeriod.status === 'APPROVED' && (
                      <Badge className="bg-blue-500">Payroll Approved</Badge>
                    )}
                    {selectedPeriod.status === 'PAID' && (
                      <Badge className="bg-green-500">
                        <CheckCircle className="h-3 w-3 mr-1" /> Payroll Paid & Payslips Sent
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              
              {/* Period Info */}
              {selectedPeriod && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg flex flex-wrap gap-6 text-sm">
                  <div>
                    <span className="text-gray-500">Coverage:</span>
                    <span className="ml-2 font-medium">{format(parseISO(selectedPeriod.startDate), "MMM d")} - {format(parseISO(selectedPeriod.endDate), "MMM d, yyyy")}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Cutoff Date:</span>
                    <span className="ml-2 font-medium">{format(parseISO(selectedPeriod.cutoffDate), "MMM d, yyyy")}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Pay Date:</span>
                    <span className="ml-2 font-medium">{format(parseISO(selectedPeriod.payDate), "MMM d, yyyy")}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Payrolls:</span>
                    <span className="ml-2 font-medium">{selectedPeriod._count?.payrolls || 0} employees</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly" className="space-y-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
              <span>&lt;</span>
            </Button>
            <Select value={format(currentDate, "yyyy-MM")} onValueChange={(v) => setCurrentDate(new Date(v))}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => {
                  const date = new Date(currentDate.getFullYear(), i, 1);
                  return (
                    <SelectItem key={i} value={format(date, "yyyy-MM")}>
                      {format(date, "MMMM yyyy")}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
              <span>&gt;</span>
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 w-[150px]"
          />
        </div>
        
        <Button variant="outline" size="icon" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4" />
        </Button>
        
        <Button variant="outline" onClick={exportToCSV}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>

        {isAdmin && (
          <Button 
            variant="default" 
            onClick={() => {
              setMarkPresentDate(format(new Date(), 'yyyy-MM-dd'));
              setMarkPresentDialogOpen(true);
            }}
            className="bg-teal-600 hover:bg-teal-700"
          >
            <UserCheck className="h-4 w-4 mr-2" />
            Mark as Present
          </Button>
        )}
      </div>

      {/* Locked Period Warning */}
      {viewMode === 'cutoff' && selectedPeriod?.isLocked && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
          <Lock className="h-4 w-4" />
          <span className="text-sm">This cutoff period is locked. Attendance records cannot be edited.</span>
        </div>
      )}

      {/* Attendance Grid */}
      <Card>
        <CardContent className="p-0">
          {loading || autoCreatingPeriod ? (
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <p className="text-gray-500 text-sm">{autoCreatingPeriod ? 'Creating cutoff period...' : 'Loading attendance data...'}</p>
              </div>
              {/* Skeleton table */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="h-8 w-10 bg-gray-200 rounded animate-pulse"></div>
                  ))}
                </div>
                {[...Array(5)].map((_, row) => (
                  <div key={row} className="flex gap-2">
                    <div className="h-8 w-24 bg-gray-100 rounded animate-pulse"></div>
                    <div className="h-8 w-32 bg-gray-100 rounded animate-pulse"></div>
                    {[...Array(10)].map((_, i) => (
                      <div key={i} className="h-8 w-10 bg-gray-100 rounded animate-pulse"></div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : viewMode === 'cutoff' && !selectedPeriod ? (
            <div className="text-center py-12 text-gray-500">
              <AlertCircle className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No cutoff periods available for this year</p>
              <p className="text-sm mt-1">The system will auto-create the current cutoff period when available</p>
            </div>
          ) : (
            <ScrollArea className="w-full">
              <div className="min-w-[1200px]">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="sticky left-0 bg-gray-50 z-10 text-left p-2 border-r border-gray-200 min-w-[100px]">EMPLOYEE ID</th>
                      <th className="sticky left-[100px] bg-gray-50 z-10 text-left p-2 border-r border-gray-200 min-w-[150px]">EMPLOYEE NAME ▲</th>
                      {daysInRange.map((date) => {
                        const dayOfWeek = getDay(date);
                        const holiday = isHoliday(date);
                        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                        return (
                          <th
                            key={date.toISOString()}
                            className={`text-center p-1 min-w-[40px] border-r border-gray-200 text-xs ${
                              holiday ? "bg-red-100" : isWeekend ? "bg-gray-100" : ""
                            }`}
                            title={holiday?.name}
                          >
                            <div className="font-medium">{DAY_LABELS[dayOfWeek]}</div>
                            <div className="text-gray-500">{format(date, "d")}</div>
                          </th>
                        );
                      })}
                      <th className="text-center p-2 min-w-[60px] bg-blue-50 border-r border-gray-200" title="Total hours (complete records only)">TOTAL<br/><span className="text-xs text-gray-500">(h)</span></th>
                      <th className="text-center p-2 min-w-[70px] bg-yellow-50 border-r border-gray-200" title="Days with clock-in but no clock-out">NO<br/>OUT<br/><span className="text-xs text-gray-500">(d)</span></th>
                      <th className="text-center p-2 min-w-[50px] border-r border-gray-200">LATE<br/><span className="text-xs text-gray-500">(m)</span></th>
                      <th className="text-center p-2 min-w-[50px] border-r border-gray-200">UT<br/><span className="text-xs text-gray-500">(m)</span></th>
                      <th className="text-center p-2 min-w-[50px] border-r border-gray-200">OB<br/><span className="text-xs text-gray-500">(m)</span></th>
                      <th className="text-center p-2 min-w-[60px] border-r border-gray-200">ABSENT<br/><span className="text-xs text-gray-500">(d)</span></th>
                      <th className="text-center p-2 min-w-[50px] border-r border-gray-200">OT<br/><span className="text-xs text-gray-500">(m)</span></th>
                      <th className="text-center p-2 min-w-[50px] border-r border-gray-200">ND<br/><span className="text-xs text-gray-500">(m)</span></th>
                      <th className="text-center p-2 min-w-[60px] border-r border-gray-200">ND + OT<br/><span className="text-xs text-gray-500">(m)</span></th>
                      <th className="text-center p-2 min-w-[50px] border-r border-gray-200">LVS<br/><span className="text-xs text-gray-500">(d)</span></th>
                      <th className="text-center p-2 min-w-[60px]">WORK<br/>DAYS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={daysInRange.length + 14} className="text-center py-8 text-gray-500">
                          No employees found
                        </td>
                      </tr>
                    ) : (
                      filteredEmployees.map((employee) => {
                        const summary = calculateSummary(employee.id);
                        return (
                          <tr key={employee.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="sticky left-0 bg-white z-10 p-2 border-r border-gray-200 font-medium text-blue-600">
                              {employee.employeeId}
                            </td>
                            <td className="sticky left-[100px] bg-white z-10 p-2 border-r border-gray-200">
                              {employee.lastName}, {employee.firstName}
                            </td>
                            {daysInRange.map((date) => {
                              const attendance = getAttendanceForDay(employee.id, date);
                              const canEdit = isAdmin && (!selectedPeriod?.isLocked || viewMode === 'monthly');
                              return (
                                <td
                                  key={date.toISOString()}
                                  className={`${getCellStyle(attendance, date)} ${canEdit ? "cursor-pointer hover:bg-blue-50" : ""}`}
                                  onClick={() => handleCellClick(employee, date)}
                                  title={attendance?.notes || (isHoliday(date)?.name)}
                                >
                                  {getCellDisplay(attendance, date)}
                                </td>
                              );
                            })}
                            <td className="text-center p-2 bg-blue-50 border-r border-gray-200 font-medium">
                              {summary.totalHours.toFixed(0)}
                            </td>
                            <td className={`text-center p-2 bg-yellow-50 border-r border-gray-200 font-medium ${summary.ctoMinutes > 0 ? 'text-yellow-700' : ''}`}>
                              {summary.ctoMinutes > 0 ? summary.ctoMinutes : '-'}
                            </td>
                            <td className="text-center p-2 border-r border-gray-200">{summary.lateMinutes || 0}</td>
                            <td className="text-center p-2 border-r border-gray-200">{summary.undertimeMinutes || 0}</td>
                            <td className="text-center p-2 border-r border-gray-200">0</td>
                            <td className="text-center p-2 border-r border-gray-200 text-red-600">{summary.absentDays || 0}</td>
                            <td className="text-center p-2 border-r border-gray-200">{summary.overtimeMinutes || 0}</td>
                            <td className="text-center p-2 border-r border-gray-200">{summary.nightDiffMinutes || 0}</td>
                            <td className="text-center p-2 border-r border-gray-200">{summary.nightDiffOTMinutes || 0}</td>
                            <td className="text-center p-2 border-r border-gray-200">{summary.leaveDays || 0}</td>
                            <td className="text-center p-2 font-medium">{summary.workDays || 0}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Edit Attendance Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Attendance</DialogTitle>
            <DialogDescription>
              {selectedCell && (
                <>
                  {selectedCell.employee.firstName} {selectedCell.employee.lastName} - {format(selectedCell.date, "MMMM d, yyyy")}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Clock In</Label>
                <Input
                  type="time"
                  value={editForm.clockIn}
                  onChange={(e) => setEditForm({ ...editForm, clockIn: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Clock Out</Label>
                <Input
                  type="time"
                  value={editForm.clockOut}
                  onChange={(e) => setEditForm({ ...editForm, clockOut: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRESENT">Present</SelectItem>
                  <SelectItem value="LATE">Late</SelectItem>
                  <SelectItem value="ABSENT">Absent</SelectItem>
                  <SelectItem value="HALF_DAY">Half Day</SelectItem>
                  <SelectItem value="ON_LEAVE">On Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Late (min)</Label>
                <Input
                  type="number"
                  value={editForm.lateMinutes}
                  onChange={(e) => setEditForm({ ...editForm, lateMinutes: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Undertime (min)</Label>
                <Input
                  type="number"
                  value={editForm.undertimeMinutes}
                  onChange={(e) => setEditForm({ ...editForm, undertimeMinutes: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Overtime (min)</Label>
                <Input
                  type="number"
                  value={editForm.overtimeMinutes}
                  onChange={(e) => setEditForm({ ...editForm, overtimeMinutes: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                placeholder="Add notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveAttendance}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <div className="w-5 h-5 bg-cyan-100 text-cyan-700 border rounded flex items-center justify-center font-medium">P</div>
          <span>Present</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-5 h-5 bg-red-100 text-red-600 border rounded flex items-center justify-center font-medium">A</div>
          <span>Absent</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-5 h-5 bg-amber-100 text-amber-700 border rounded flex items-center justify-center font-medium">L</div>
          <span>Late</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-5 h-5 bg-red-200 text-red-700 border rounded flex items-center justify-center font-medium">H</div>
          <span>Holiday</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-5 h-5 bg-purple-100 text-purple-600 border rounded flex items-center justify-center font-medium text-[10px]">LV</div>
          <span>On Leave</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-5 h-5 bg-yellow-100 text-yellow-700 border rounded flex items-center justify-center font-medium text-[10px]">P?</div>
          <span>No Logout</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-5 h-5 bg-gray-100 text-gray-400 border rounded flex items-center justify-center font-medium">--</div>
          <span>Weekend/No Record</span>
        </div>
        {viewMode === 'cutoff' && selectedPeriod && (
          <div className="ml-auto flex items-center gap-1">
            {selectedPeriod.isLocked ? (
              <><Lock className="h-3 w-3" /> Period Locked</>
            ) : (
              <><Unlock className="h-3 w-3" /> Period Open - Click cells to edit</>
            )}
          </div>
        )}
      </div>

      {/* Create Period Dialog */}
      <Dialog open={createPeriodDialogOpen} onOpenChange={setCreatePeriodDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Cutoff Period</DialogTitle>
            <DialogDescription>
              Create a new payroll cutoff period for attendance tracking
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Month</Label>
                <Select 
                  value={newPeriodForm.month.toString()} 
                  onValueChange={(v) => setNewPeriodForm({ ...newPeriodForm, month: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_NAMES.map((month, idx) => (
                      <SelectItem key={idx} value={(idx + 1).toString()}>{month}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <Select 
                  value={newPeriodForm.year.toString()} 
                  onValueChange={(v) => setNewPeriodForm({ ...newPeriodForm, year: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026, 2027, 2028].map((year) => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cutoff Type</Label>
              <Select 
                value={newPeriodForm.periodType} 
                onValueChange={(v) => setNewPeriodForm({ ...newPeriodForm, periodType: v as 'FIRST_HALF' | 'SECOND_HALF' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FIRST_HALF">1st Cutoff ({cutoffSettings.cutoff1Start}-{cutoffSettings.cutoff1End})</SelectItem>
                  <SelectItem value="SECOND_HALF">2nd Cutoff ({cutoffSettings.cutoff2Start}-{cutoffSettings.cutoff2End})</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-gray-500 p-3 bg-gray-50 rounded-lg">
              <p className="font-medium mb-1">Coverage Period:</p>
              {newPeriodForm.periodType === 'FIRST_HALF' ? (
                <p>Day {cutoffSettings.cutoff1Start} (prev month) to Day {cutoffSettings.cutoff1End} ({MONTH_NAMES[newPeriodForm.month - 1]})</p>
              ) : (
                <p>Day {cutoffSettings.cutoff2Start} to Day {cutoffSettings.cutoff2End} ({MONTH_NAMES[newPeriodForm.month - 1]})</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreatePeriodDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreatePeriod} disabled={creatingPeriod}>
              {creatingPeriod ? 'Creating...' : 'Create Period'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark as Present Dialog */}
      <Dialog open={markPresentDialogOpen} onOpenChange={setMarkPresentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark All Employees as Present</DialogTitle>
            <DialogDescription>
              Bulk create attendance records for all active employees on the selected date.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={markPresentDate}
                onChange={(e) => setMarkPresentDate(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Clock In</Label>
                <Input
                  type="time"
                  value={markPresentClockIn}
                  onChange={(e) => setMarkPresentClockIn(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Clock Out</Label>
                <Input
                  type="time"
                  value={markPresentClockOut}
                  onChange={(e) => setMarkPresentClockOut(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="skipExisting"
                checked={markPresentSkipExisting}
                onCheckedChange={(checked) => setMarkPresentSkipExisting(checked === true)}
              />
              <Label htmlFor="skipExisting" className="text-sm font-normal cursor-pointer">
                Skip employees who already have attendance for this date
              </Label>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
              <p className="font-medium mb-1">This will:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Create attendance for all active employees ({employees.length} employees)</li>
                <li>Set clock-in at {markPresentClockIn} and clock-out at {markPresentClockOut}</li>
                {markPresentSkipExisting 
                  ? <li>Skip employees who already have records for this date</li>
                  : <li>Overwrite existing attendance records for this date</li>
                }
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMarkPresentDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkMarkPresent}
              disabled={markPresentLoading}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {markPresentLoading ? 'Processing...' : 'Mark as Present'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
