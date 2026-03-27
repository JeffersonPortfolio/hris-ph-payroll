"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { StatCard } from "@/components/dashboard/stat-card";
import { AttendanceChart } from "@/components/dashboard/attendance-chart";
import { DepartmentChart } from "@/components/dashboard/department-chart";
import { LeaveChart } from "@/components/dashboard/leave-chart";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { Users, UserCheck, Clock, CalendarDays, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmployeeDashboard } from "@/components/dashboard/employee-dashboard";

export default function DashboardPage() {
  const { data: session } = useSession() || {};
  const userRole = (session?.user as any)?.role;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Dashboard fetch error:", err);
        setLoading(false);
      });
  }, []);

  if (userRole === "EMPLOYEE") {
    return <EmployeeDashboard />;
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Welcome back! Here&apos;s your HR overview.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-[350px] col-span-2" />
          <Skeleton className="h-[350px]" />
        </div>
      </div>
    );
  }

  const stats = data?.stats ?? {};

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">Welcome back! Here&apos;s your HR overview.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Total Employees"
          value={stats?.totalEmployees ?? 0}
          icon={Users}
          bgColor="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Present Today"
          value={stats?.todayPresent ?? 0}
          icon={UserCheck}
          bgColor="bg-green-50"
          iconColor="text-green-600"
        />
        <StatCard
          title="Late Today"
          value={stats?.todayLate ?? 0}
          icon={Clock}
          bgColor="bg-yellow-50"
          iconColor="text-yellow-600"
        />
        <StatCard
          title="Pending Leaves"
          value={stats?.pendingLeaves ?? 0}
          icon={CalendarDays}
          bgColor="bg-purple-50"
          iconColor="text-purple-600"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <AttendanceChart data={data?.attendanceTrends ?? []} />
        <DepartmentChart data={data?.departmentData ?? []} />
      </div>

      {/* Leave Chart and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <LeaveChart data={data?.leaveTypeData ?? []} />
        <RecentActivity activities={data?.activities ?? []} />
      </div>
    </div>
  );
}