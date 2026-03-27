"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Download, Users, Clock, CalendarDays, Building2, DollarSign, TrendingUp, Filter } from "lucide-react";
import toast from "react-hot-toast";
import { getLeaveTypeLabel, getFilingTypeLabel, formatDate } from "@/lib/utils";

const reports = [
  {
    id: "employees",
    title: "Employee Master List",
    description: "Complete list of all employees with key details",
    icon: Users,
    endpoint: "/api/employees?limit=1000",
  },
  {
    id: "attendance",
    title: "Attendance Report",
    description: "Daily attendance summary with clock-in/out times",
    icon: Clock,
    endpoint: "/api/attendance/export",
  },
  {
    id: "leaves",
    title: "Leave Report",
    description: "Leave applications and balances summary",
    icon: CalendarDays,
    endpoint: "/api/leaves?limit=1000",
  },
  {
    id: "departments",
    title: "Department Report",
    description: "Employees grouped by department",
    icon: Building2,
    endpoint: "/api/departments",
  },
];

const MONTHS = [
  { value: "", label: "All Months" },
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

interface DepartmentCost {
  name: string;
  monthly: { [key: string]: number };
  totalGross: number;
  totalNet: number;
  totalDeductions: number;
  employerContributions: number;
  employeeCount: number;
}

interface DepartmentCostReport {
  year: number;
  month: number | null;
  months: string[];
  departments: DepartmentCost[];
  grandTotal: {
    totalGross: number;
    totalNet: number;
    totalDeductions: number;
    employerContributions: number;
    monthly: { [key: string]: number };
  };
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(amount);
};

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  
  // Department Cost Report state
  const [costYear, setCostYear] = useState(new Date().getFullYear().toString());
  const [costMonth, setCostMonth] = useState("");
  const [costReport, setCostReport] = useState<DepartmentCostReport | null>(null);
  const [loadingCost, setLoadingCost] = useState(false);

  // Leave Report per Employee state
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [leaveReportFilters, setLeaveReportFilters] = useState({
    employeeId: "all",
    departmentId: "all",
    leaveType: "all",
    filingType: "all",
    status: "all",
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });
  const [leaveReport, setLeaveReport] = useState<any>(null);
  const [loadingLeaveReport, setLoadingLeaveReport] = useState(false);

  useEffect(() => {
    // Fetch employees and departments for filters
    const fetchFilters = async () => {
      try {
        const [empRes, deptRes] = await Promise.all([
          fetch("/api/employees?limit=500"),
          fetch("/api/departments"),
        ]);
        if (empRes.ok) {
          const empData = await empRes.json();
          setEmployees(empData?.employees ?? []);
        }
        if (deptRes.ok) {
          const deptData = await deptRes.json();
          setDepartments(deptData?.departments ?? []);
        }
      } catch (error) {
        console.error("Error fetching filters:", error);
      }
    };
    fetchFilters();
  }, []);

  const fetchLeaveReport = async () => {
    setLoadingLeaveReport(true);
    try {
      const params = new URLSearchParams();
      if (leaveReportFilters.employeeId !== "all") params.set("employeeId", leaveReportFilters.employeeId);
      if (leaveReportFilters.departmentId !== "all") params.set("departmentId", leaveReportFilters.departmentId);
      if (leaveReportFilters.leaveType !== "all") params.set("leaveType", leaveReportFilters.leaveType);
      if (leaveReportFilters.filingType !== "all") params.set("filingType", leaveReportFilters.filingType);
      if (leaveReportFilters.status !== "all") params.set("status", leaveReportFilters.status);
      params.set("startDate", leaveReportFilters.startDate);
      params.set("endDate", leaveReportFilters.endDate);

      const res = await fetch(`/api/reports/leaves?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLeaveReport(data);
      } else {
        toast.error("Failed to load leave report");
      }
    } catch (error) {
      console.error("Error fetching leave report:", error);
      toast.error("Failed to load leave report");
    } finally {
      setLoadingLeaveReport(false);
    }
  };

  const exportLeaveReportCSV = () => {
    if (!leaveReport) return;

    const rows = [
      ["Leave Report per Employee"],
      [`Date Range: ${leaveReportFilters.startDate} to ${leaveReportFilters.endDate}`],
      [],
      ["Employee ID", "Employee Name", "Department", "Leave Type", "Filing Type", "Start Date", "End Date", "Days", "Status", "Reason", "Approver"],
      ...(leaveReport.leaves || []).map((l: any) => [
        l.employee?.employeeId || "",
        `${l.employee?.firstName || ""} ${l.employee?.lastName || ""}`,
        l.employee?.department?.name || "",
        getLeaveTypeLabel(l.leaveType || ""),
        getFilingTypeLabel(l.filingType || "ADVANCE"),
        l.startDate ? new Date(l.startDate).toLocaleDateString() : "",
        l.endDate ? new Date(l.endDate).toLocaleDateString() : "",
        l.totalDays || 0,
        l.status || "",
        l.reason || "",
        l.approver ? `${l.approver.firstName} ${l.approver.lastName}` : "",
      ]),
      [],
      ["Summary"],
      ["Total Leaves", leaveReport.summary?.totalLeaves || 0],
      ["Total Days", leaveReport.summary?.totalDays || 0],
      [],
      ["By Status"],
      ["Pending", leaveReport.summary?.byStatus?.PENDING || 0],
      ["Approved", leaveReport.summary?.byStatus?.APPROVED || 0],
      ["Rejected", leaveReport.summary?.byStatus?.REJECTED || 0],
      [],
      ["By Filing Type"],
      ["3+ Days Filing (Advance)", leaveReport.summary?.byFilingType?.ADVANCE || 0],
      ["Urgent Filing", leaveReport.summary?.byFilingType?.URGENT || 0],
    ];

    const csv = rows.map((row: (string | number)[]) => row.map((cell: string | number) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `leave-report-${leaveReportFilters.startDate}-to-${leaveReportFilters.endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(downloadUrl);
    toast.success("Report downloaded");
  };

  const fetchDepartmentCost = async () => {
    setLoadingCost(true);
    try {
      let url = `/api/reports/department-cost?year=${costYear}`;
      if (costMonth) {
        url += `&month=${costMonth}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setCostReport(data);
      } else {
        toast.error("Failed to load department cost report");
      }
    } catch (error) {
      console.error("Error fetching department cost:", error);
      toast.error("Failed to load department cost report");
    } finally {
      setLoadingCost(false);
    }
  };

  const exportDepartmentCostCSV = () => {
    if (!costReport) return;
    
    const rows = [
      ["Department Cost Report"],
      [`Year: ${costReport.year}${costReport.month ? `, Month: ${costReport.month}` : ""}`],
      [],
      ["Department", "Employee Count", ...costReport.months.map(m => {
        const [y, mon] = m.split("-");
        return `${MONTHS.find(mo => mo.value === String(parseInt(mon)))?.label || mon} ${y}`;
      }), "Total Gross", "Total Net", "Total Deductions", "Employer Contributions"],
      ...costReport.departments.map(dept => [
        dept.name,
        dept.employeeCount,
        ...costReport.months.map(m => (dept.monthly[m] || 0).toFixed(2)),
        dept.totalGross.toFixed(2),
        dept.totalNet.toFixed(2),
        dept.totalDeductions.toFixed(2),
        dept.employerContributions.toFixed(2),
      ]),
      [],
      ["GRAND TOTAL", "", ...costReport.months.map(m => (costReport.grandTotal.monthly[m] || 0).toFixed(2)), 
        costReport.grandTotal.totalGross.toFixed(2), 
        costReport.grandTotal.totalNet.toFixed(2),
        costReport.grandTotal.totalDeductions.toFixed(2),
        costReport.grandTotal.employerContributions.toFixed(2)
      ],
    ];

    const csv = rows.map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `department-cost-report-${costYear}${costMonth ? `-${costMonth}` : ""}.csv`;
    a.click();
    window.URL.revokeObjectURL(downloadUrl);
    toast.success("Report downloaded");
  };

  const handleExport = async (reportId: string) => {
    setLoading(true);
    try {
      let url = "";

      if (reportId === "attendance") {
        url = `/api/attendance/export?startDate=${startDate}&endDate=${endDate}`;
        const res = await fetch(url);
        const blob = await res.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `attendance-report-${startDate}-to-${endDate}.csv`;
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        toast.success("Report downloaded");
      } else if (reportId === "employees") {
        const res = await fetch("/api/employees?limit=1000");
        const data = await res.json();
        const employees = data?.employees ?? [];

        const csv = [
          [
            "Employee ID",
            "First Name",
            "Last Name",
            "Email",
            "Department",
            "Position",
            "Status",
            "Date Hired",
          ],
          ...employees.map((e: any) => [
            e?.employeeId ?? "",
            e?.firstName ?? "",
            e?.lastName ?? "",
            e?.email ?? "",
            e?.department?.name ?? "",
            e?.role?.name ?? "",
            e?.employmentStatus ?? "",
            e?.dateHired ? new Date(e.dateHired).toLocaleDateString() : "",
          ]),
        ]
          .map((row) => row.map((cell: any) => `"${cell}"`).join(","))
          .join("\n");

        const blob = new Blob([csv], { type: "text/csv" });
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `employee-master-list-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        toast.success("Report downloaded");
      } else if (reportId === "leaves") {
        const res = await fetch("/api/leaves?limit=1000");
        const data = await res.json();
        const leaves = data?.leaves ?? [];

        const csv = [
          [
            "Employee",
            "Leave Type",
            "Start Date",
            "End Date",
            "Days",
            "Status",
            "Reason",
            "Applied On",
          ],
          ...leaves.map((l: any) => [
            `${l?.employee?.firstName ?? ""} ${l?.employee?.lastName ?? ""}`,
            l?.leaveType ?? "",
            l?.startDate ? new Date(l.startDate).toLocaleDateString() : "",
            l?.endDate ? new Date(l.endDate).toLocaleDateString() : "",
            l?.totalDays ?? "",
            l?.status ?? "",
            l?.reason ?? "",
            l?.createdAt ? new Date(l.createdAt).toLocaleDateString() : "",
          ]),
        ]
          .map((row) => row.map((cell: any) => `"${cell}"`).join(","))
          .join("\n");

        const blob = new Blob([csv], { type: "text/csv" });
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `leave-report-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        toast.success("Report downloaded");
      } else if (reportId === "departments") {
        const res = await fetch("/api/departments");
        const data = await res.json();
        const departments = data?.departments ?? [];

        const csv = [
          ["Department", "Head", "Employee Count"],
          ...departments.map((d: any) => [
            d?.name ?? "",
            d?.head ? `${d.head.firstName} ${d.head.lastName}` : "",
            d?._count?.employees ?? 0,
          ]),
        ]
          .map((row) => row.map((cell: any) => `"${cell}"`).join(","))
          .join("\n");

        const blob = new Blob([csv], { type: "text/csv" });
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `department-report-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        toast.success("Report downloaded");
      }
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-500">Generate and export HR reports</p>
      </div>

      {/* Date Range for Attendance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Report Parameters</CardTitle>
          <CardDescription>Set date range for time-based reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((report) => (
          <Card key={report.id} className="card-hover">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <report.icon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">{report.title}</CardTitle>
                  <CardDescription>{report.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                onClick={() => handleExport(report.id)}
                disabled={loading}
              >
                <Download className="mr-2 h-4 w-4" />
                {loading ? "Generating..." : "Export CSV"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Department Cost Report */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Departmental Cost Report</CardTitle>
              <CardDescription>View payroll costs per department (monthly and yearly)</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>Year</Label>
              <Select value={costYear} onValueChange={setCostYear}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026].map(y => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Month (Optional)</Label>
              <Select value={costMonth || "all"} onValueChange={(v) => setCostMonth(v === "all" ? "" : v)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Months" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map(m => (
                    <SelectItem key={m.value || "all"} value={m.value || "all"}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={fetchDepartmentCost} disabled={loadingCost}>
              {loadingCost ? "Loading..." : "Generate Report"}
            </Button>
            {costReport && (
              <Button variant="outline" onClick={exportDepartmentCostCSV}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            )}
          </div>

          {costReport && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-center">Employees</TableHead>
                    {costReport.months.map(m => {
                      const [y, mon] = m.split("-");
                      const monthName = MONTHS.find(mo => mo.value === String(parseInt(mon)))?.label || mon;
                      return (
                        <TableHead key={m} className="text-right">{monthName}</TableHead>
                      );
                    })}
                    <TableHead className="text-right">Total Gross</TableHead>
                    <TableHead className="text-right">Total Net</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costReport.departments.map((dept) => (
                    <TableRow key={dept.name}>
                      <TableCell className="font-medium">{dept.name}</TableCell>
                      <TableCell className="text-center">{dept.employeeCount}</TableCell>
                      {costReport.months.map(m => (
                        <TableCell key={m} className="text-right">
                          {formatCurrency(dept.monthly[m] || 0)}
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-semibold">{formatCurrency(dept.totalGross)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(dept.totalNet)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-gray-50 font-bold">
                    <TableCell>GRAND TOTAL</TableCell>
                    <TableCell></TableCell>
                    {costReport.months.map(m => (
                      <TableCell key={m} className="text-right">
                        {formatCurrency(costReport.grandTotal.monthly[m] || 0)}
                      </TableCell>
                    ))}
                    <TableCell className="text-right">{formatCurrency(costReport.grandTotal.totalGross)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(costReport.grandTotal.totalNet)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-gray-500">Total Gross Earnings</div>
                    <div className="text-xl font-bold text-gray-900">{formatCurrency(costReport.grandTotal.totalGross)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-gray-500">Total Net Pay</div>
                    <div className="text-xl font-bold text-green-600">{formatCurrency(costReport.grandTotal.totalNet)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-gray-500">Total Deductions</div>
                    <div className="text-xl font-bold text-red-600">{formatCurrency(costReport.grandTotal.totalDeductions)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-gray-500">Employer Contributions</div>
                    <div className="text-xl font-bold text-blue-600">{formatCurrency(costReport.grandTotal.employerContributions)}</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Leave Report per Employee */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <Filter className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Leave Report per Employee</CardTitle>
              <CardDescription>Generate detailed leave reports with filtering by employee, department, leave type, and filing type</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select 
                value={leaveReportFilters.employeeId} 
                onValueChange={(v) => setLeaveReportFilters(prev => ({ ...prev, employeeId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select 
                value={leaveReportFilters.departmentId} 
                onValueChange={(v) => setLeaveReportFilters(prev => ({ ...prev, departmentId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Leave Type</Label>
              <Select 
                value={leaveReportFilters.leaveType} 
                onValueChange={(v) => setLeaveReportFilters(prev => ({ ...prev, leaveType: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="ANNUAL">Annual Leave</SelectItem>
                  <SelectItem value="SICK">Sick Leave</SelectItem>
                  <SelectItem value="EMERGENCY">Emergency Leave</SelectItem>
                  <SelectItem value="WFH">Work From Home</SelectItem>
                  <SelectItem value="COMPASSIONATE">Compassionate Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Filing Type</Label>
              <Select 
                value={leaveReportFilters.filingType} 
                onValueChange={(v) => setLeaveReportFilters(prev => ({ ...prev, filingType: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Filing Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Filing Types</SelectItem>
                  <SelectItem value="ADVANCE">3+ Days Filing (Advance)</SelectItem>
                  <SelectItem value="URGENT">Urgent Filing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select 
                value={leaveReportFilters.status} 
                onValueChange={(v) => setLeaveReportFilters(prev => ({ ...prev, status: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={leaveReportFilters.startDate}
                onChange={(e) => setLeaveReportFilters(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={leaveReportFilters.endDate}
                onChange={(e) => setLeaveReportFilters(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={fetchLeaveReport} disabled={loadingLeaveReport}>
              {loadingLeaveReport ? "Loading..." : "Generate Report"}
            </Button>
            {leaveReport && (
              <Button variant="outline" onClick={exportLeaveReportCSV}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            )}
          </div>

          {/* Results */}
          {leaveReport && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-gray-500">Total Leaves</div>
                    <div className="text-2xl font-bold text-gray-900">{leaveReport.summary?.totalLeaves || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-gray-500">Total Days</div>
                    <div className="text-2xl font-bold text-blue-600">{leaveReport.summary?.totalDays?.toFixed(1) || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-gray-500">Pending</div>
                    <div className="text-2xl font-bold text-yellow-600">{leaveReport.summary?.byStatus?.PENDING || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-gray-500">Approved</div>
                    <div className="text-2xl font-bold text-green-600">{leaveReport.summary?.byStatus?.APPROVED || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-gray-500">3+ Days Filing</div>
                    <div className="text-2xl font-bold text-blue-600">{leaveReport.summary?.byFilingType?.ADVANCE || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-gray-500">Urgent Filing</div>
                    <div className="text-2xl font-bold text-orange-600">{leaveReport.summary?.byFilingType?.URGENT || 0}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Leave Details Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Leave Type</TableHead>
                      <TableHead>Filing Type</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Approver</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(leaveReport.leaves || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                          No leave records found for the selected filters
                        </TableCell>
                      </TableRow>
                    ) : (
                      (leaveReport.leaves || []).map((leave: any) => (
                        <TableRow key={leave.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{leave.employee?.firstName} {leave.employee?.lastName}</p>
                              <p className="text-xs text-gray-500">{leave.employee?.employeeId}</p>
                            </div>
                          </TableCell>
                          <TableCell>{leave.employee?.department?.name || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{getLeaveTypeLabel(leave.leaveType)}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={leave.filingType === "URGENT" ? "bg-orange-100 text-orange-800" : "bg-blue-100 text-blue-800"}>
                              {getFilingTypeLabel(leave.filingType || "ADVANCE")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p>{formatDate(leave.startDate)}</p>
                              <p className="text-gray-500">to {formatDate(leave.endDate)}</p>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{leave.totalDays}</TableCell>
                          <TableCell>
                            <Badge className={
                              leave.status === "APPROVED" ? "bg-green-100 text-green-800" :
                              leave.status === "REJECTED" ? "bg-red-100 text-red-800" :
                              "bg-yellow-100 text-yellow-800"
                            }>
                              {leave.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {leave.approver ? `${leave.approver.firstName} ${leave.approver.lastName}` : "-"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Employee Summary Table */}
              {(leaveReport.employeeLeaves || []).length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-3">Summary by Employee</h3>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead className="text-center">Total Leaves</TableHead>
                          <TableHead className="text-center">Total Days</TableHead>
                          <TableHead className="text-center">Advance Filing</TableHead>
                          <TableHead className="text-center">Urgent Filing</TableHead>
                          <TableHead className="text-center">Approved</TableHead>
                          <TableHead className="text-center">Pending</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(leaveReport.employeeLeaves || []).map((emp: any) => (
                          <TableRow key={emp.employee?.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{emp.employee?.firstName} {emp.employee?.lastName}</p>
                                <p className="text-xs text-gray-500">{emp.employee?.employeeId}</p>
                              </div>
                            </TableCell>
                            <TableCell>{emp.employee?.department?.name || "-"}</TableCell>
                            <TableCell className="text-center font-medium">{emp.leaves?.length || 0}</TableCell>
                            <TableCell className="text-center font-medium">{emp.totalDays?.toFixed(1) || 0}</TableCell>
                            <TableCell className="text-center">
                              <Badge className="bg-blue-100 text-blue-800">{emp.byFilingType?.ADVANCE || 0}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className="bg-orange-100 text-orange-800">{emp.byFilingType?.URGENT || 0}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className="bg-green-100 text-green-800">{emp.byStatus?.APPROVED || 0}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className="bg-yellow-100 text-yellow-800">{emp.byStatus?.PENDING || 0}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}