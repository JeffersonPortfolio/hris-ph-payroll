"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Clock,
  CalendarDays,
  LogIn,
  LogOut,
  CheckCircle,
  AlertCircle,
  Timer,
} from "lucide-react";
import { formatTime, formatDate, getLeaveTypeLabel, getStatusColor } from "@/lib/utils";
import toast from "react-hot-toast";
import Link from "next/link";

export function EmployeeDashboard() {
  const { data: session } = useSession() || {};
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [leaveBalances, setLeaveBalances] = useState<any[]>([]);
  const [recentLeaves, setRecentLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [clockingIn, setClockingIn] = useState(false);
  const [clockingOut, setClockingOut] = useState(false);
  const [elapsedTime, setElapsedTime] = useState<string>("00:00:00");

  const employeeId = (session?.user as any)?.employeeId;

  const fetchData = async () => {
    if (!employeeId) return;
    
    try {
      const [attendanceRes, balancesRes, leavesRes] = await Promise.all([
        fetch(`/api/attendance/today?employeeId=${employeeId}`),
        fetch(`/api/leaves/balance?employeeId=${employeeId}`),
        fetch(`/api/leaves?employeeId=${employeeId}&limit=5`),
      ]);

      const [attendance, balances, leaves] = await Promise.all([
        attendanceRes.json(),
        balancesRes.json(),
        leavesRes.json(),
      ]);

      setTodayAttendance(attendance?.attendance ?? null);
      setLeaveBalances(balances?.balances ?? []);
      setRecentLeaves(leaves?.leaves ?? []);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [employeeId]);

  // Running timer for elapsed work hours
  const calculateElapsedTime = useCallback(() => {
    if (!todayAttendance?.clockIn || todayAttendance?.clockOut) {
      return "00:00:00";
    }
    
    const clockInTime = new Date(todayAttendance.clockIn).getTime();
    const now = Date.now();
    const diff = now - clockInTime;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }, [todayAttendance?.clockIn, todayAttendance?.clockOut]);

  useEffect(() => {
    // Only run timer if clocked in but not clocked out
    if (!todayAttendance?.clockIn || todayAttendance?.clockOut) {
      if (todayAttendance?.totalHours) {
        const hours = Math.floor(todayAttendance.totalHours);
        const minutes = Math.floor((todayAttendance.totalHours % 1) * 60);
        setElapsedTime(`${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:00`);
      }
      return;
    }

    // Initial calculation
    setElapsedTime(calculateElapsedTime());

    // Update every second
    const interval = setInterval(() => {
      setElapsedTime(calculateElapsedTime());
    }, 1000);

    return () => clearInterval(interval);
  }, [todayAttendance?.clockIn, todayAttendance?.clockOut, todayAttendance?.totalHours, calculateElapsedTime]);

  // Helper to get current position as a promise
  const getCurrentPosition = (): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            reject(new Error("Location permission denied. Please enable location access to clock in/out."));
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            reject(new Error("Location unavailable. Please try again."));
          } else {
            reject(new Error("Could not get your location. Please try again."));
          }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });
  };

  const handleClockIn = async () => {
    if (!employeeId) return;
    setClockingIn(true);
    try {
      // Get location for geofence validation
      let latitude: number | undefined;
      let longitude: number | undefined;
      try {
        const pos = await getCurrentPosition();
        latitude = pos.latitude;
        longitude = pos.longitude;
      } catch (locErr: any) {
        // Location failed — still send request; server will reject if geofence is required
        console.warn("Location error:", locErr?.message);
      }

      const res = await fetch("/api/attendance/clock-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, latitude, longitude }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Clocked in successfully!");
        fetchData();
      } else {
        toast.error(data?.message ?? "Failed to clock in");
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to clock in");
    } finally {
      setClockingIn(false);
    }
  };

  const handleClockOut = async () => {
    if (!employeeId || !todayAttendance?.id) return;
    setClockingOut(true);
    try {
      let latitude: number | undefined;
      let longitude: number | undefined;
      try {
        const pos = await getCurrentPosition();
        latitude = pos.latitude;
        longitude = pos.longitude;
      } catch (locErr: any) {
        // Send without location — server will reject if geofence is required
      }

      const res = await fetch("/api/attendance/clock-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendanceId: todayAttendance.id, latitude, longitude }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Clocked out successfully!");
        fetchData();
      } else {
        toast.error(data?.message ?? "Failed to clock out");
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to clock out");
    } finally {
      setClockingOut(false);
    }
  };

  const hasClockedIn = !!todayAttendance?.clockIn;
  const hasClockedOut = !!todayAttendance?.clockOut;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, {session?.user?.name ?? "Employee"}!
        </h1>
        <p className="text-gray-500">Here&apos;s your personal dashboard.</p>
      </div>

      {/* Attendance Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Today&apos;s Attendance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <div className="flex items-center gap-2 mt-1">
                  {hasClockedIn ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-600">
                        {hasClockedOut ? "Completed" : "Clocked In"}
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-5 w-5 text-gray-400" />
                      <span className="font-medium text-gray-500">Not Clocked In</span>
                    </>
                  )}
                </div>
              </div>
              {todayAttendance?.status && (
                <Badge className={getStatusColor(todayAttendance.status)}>
                  {todayAttendance.status}
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-500">Clock In</p>
                <p className="text-xl font-bold text-green-700">
                  {todayAttendance?.clockIn
                    ? formatTime(todayAttendance.clockIn)
                    : "--:--"}
                </p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-gray-500">Clock Out</p>
                <p className="text-xl font-bold text-red-700">
                  {todayAttendance?.clockOut
                    ? formatTime(todayAttendance.clockOut)
                    : "--:--"}
                </p>
              </div>
            </div>

            {/* Running Timer / Total Hours */}
            {hasClockedIn && (
              <div className={`p-4 rounded-lg ${hasClockedOut ? 'bg-blue-50' : 'bg-amber-50 border-2 border-amber-200'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      {hasClockedOut ? (
                        "Total Hours Worked"
                      ) : (
                        <>
                          <Timer className="h-4 w-4 text-amber-600 animate-pulse" />
                          Working Time (Live)
                        </>
                      )}
                    </p>
                    <p className={`text-2xl font-bold font-mono ${hasClockedOut ? 'text-blue-700' : 'text-amber-700'}`}>
                      {elapsedTime}
                    </p>
                  </div>
                  {!hasClockedOut && (
                    <div className="text-right">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      <p className="text-xs text-gray-500 mt-1">Active</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                className="flex-1"
                onClick={handleClockIn}
                disabled={hasClockedIn || clockingIn || !employeeId}
              >
                <LogIn className="mr-2 h-4 w-4" />
                {clockingIn ? "Clocking In..." : "Clock In"}
              </Button>
              <Button
                className="flex-1"
                variant="outline"
                onClick={handleClockOut}
                disabled={!hasClockedIn || hasClockedOut || clockingOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                {clockingOut ? "Clocking Out..." : "Clock Out"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Leave Balances */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-purple-600" />
              Leave Balances
            </CardTitle>
            <Link href="/leaves">
              <Button variant="outline" size="sm">Apply Leave</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(leaveBalances ?? []).length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No leave balances set. Contact HR.
                </p>
              ) : (
                (leaveBalances ?? []).map((balance: any) => (
                  <div key={balance?.id ?? Math.random()} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">
                        {getLeaveTypeLabel(balance?.leaveType ?? "")}
                      </span>
                      <span className="text-gray-500">
                        {balance?.balance ?? 0} - {balance?.used ?? 0} ={" "}
                        <span className="font-bold text-gray-900">
                          {(balance?.balance ?? 0) - (balance?.used ?? 0)} days
                        </span>
                      </span>
                    </div>
                    <Progress
                      value={
                        balance?.balance
                          ? ((balance?.used ?? 0) / balance.balance) * 100
                          : 0
                      }
                      className="h-2"
                    />
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Leaves */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold">Recent Leave Requests</CardTitle>
          <Link href="/leaves">
            <Button variant="ghost" size="sm">View All</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {(recentLeaves ?? []).length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No leave requests yet</p>
          ) : (
            <div className="space-y-3">
              {(recentLeaves ?? []).map((leave: any) => (
                <div
                  key={leave?.id ?? Math.random()}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      {getLeaveTypeLabel(leave?.leaveType ?? "")}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatDate(leave?.startDate)} - {formatDate(leave?.endDate)}
                    </p>
                  </div>
                  <Badge className={getStatusColor(leave?.status ?? "")}>
                    {leave?.status ?? ""}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}