"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Eye, Edit, Users, MoreHorizontal, UserCheck, UserX, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getStatusColor } from "@/lib/utils";
import { toast } from "sonner";

export default function EmployeesPage() {
  const { data: session } = useSession() || {};
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterAccountStatus, setFilterAccountStatus] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  
  // Dialog states
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (search) params.set("search", search);
      if (filterDept) params.set("department", filterDept);
      if (filterStatus) params.set("status", filterStatus);
      if (filterAccountStatus) params.set("accountStatus", filterAccountStatus);

      const res = await fetch(`/api/employees?${params}`);
      const data = await res.json();
      setEmployees(data?.employees ?? []);
      setPagination((prev) => ({
        ...prev,
        total: data?.pagination?.total ?? 0,
        totalPages: data?.pagination?.totalPages ?? 0,
      }));
    } catch (error) {
      console.error("Fetch employees error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (employee: any, activate: boolean) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/employees/${employee.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: activate }),
      });
      
      if (res.ok) {
        toast.success(activate ? "Account activated successfully" : "Account deactivated successfully");
        fetchEmployees();
      } else {
        const data = await res.json();
        toast.error(data.message || "Failed to update account status");
      }
    } catch (error) {
      toast.error("Failed to update account status");
    } finally {
      setActionLoading(false);
      setShowActivateDialog(false);
      setShowDeactivateDialog(false);
      setSelectedEmployee(null);
    }
  };

  const handleDelete = async (employee: any) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/employees/${employee.id}/status`, {
        method: "DELETE",
      });
      
      if (res.ok) {
        toast.success("Employee permanently deleted");
        fetchEmployees();
      } else {
        const data = await res.json();
        toast.error(data.message || "Failed to delete employee");
      }
    } catch (error) {
      toast.error("Failed to delete employee");
    } finally {
      setActionLoading(false);
      setShowDeleteDialog(false);
      setSelectedEmployee(null);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch("/api/departments");
      const data = await res.json();
      setDepartments(data?.departments ?? []);
    } catch (error) {
      console.error("Fetch departments error:", error);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [pagination.page, filterDept, filterStatus, filterAccountStatus]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchEmployees();
  };

  const userRole = (session?.user as any)?.role;
  const canCreate = userRole === "ADMIN" || userRole === "HR";
  const isAdmin = userRole === "ADMIN";

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Employees</h1>
          <p className="text-sm text-gray-500">Manage your workforce directory</p>
        </div>
        {canCreate && (
          <Link href="/employees/new" className="self-start">
            <Button size="sm" className="sm:size-default">
              <Plus className="mr-2 h-4 w-4" />
              Add Employee
            </Button>
          </Link>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, email, or ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterDept} onValueChange={setFilterDept}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {(departments ?? []).map((dept: any) => (
                  <SelectItem key={dept?.id ?? ""} value={dept?.id ?? ""}>
                    {dept?.name ?? ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Employment Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employment Status</SelectItem>
                <SelectItem value="PROBATIONARY">Probationary</SelectItem>
                <SelectItem value="REGULAR">Regular</SelectItem>
                <SelectItem value="RESIGNED">Resigned</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterAccountStatus} onValueChange={setFilterAccountStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Account Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit">Search</Button>
          </form>
        </CardContent>
      </Card>

      {/* Employee List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Employee Directory ({pagination.total})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (employees ?? []).length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No employees found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Employee</TableHead>
                    <TableHead className="whitespace-nowrap hidden sm:table-cell">ID</TableHead>
                    <TableHead className="whitespace-nowrap hidden md:table-cell">Department</TableHead>
                    <TableHead className="whitespace-nowrap hidden lg:table-cell">Position</TableHead>
                    <TableHead className="whitespace-nowrap hidden sm:table-cell">Employment</TableHead>
                    <TableHead className="whitespace-nowrap">Account</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(employees ?? []).map((emp: any) => (
                    <TableRow key={emp?.id ?? Math.random()} className={emp?.isActive === false ? "bg-gray-50 opacity-75" : ""}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${emp?.isActive === false ? "bg-gray-200" : "bg-blue-100"}`}>
                            <span className={`font-medium ${emp?.isActive === false ? "text-gray-500" : "text-blue-700"}`}>
                              {(emp?.firstName?.[0] ?? "") + (emp?.lastName?.[0] ?? "")}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">
                              {emp?.firstName ?? ""} {emp?.lastName ?? ""}
                            </p>
                            <p className="text-sm text-gray-500">{emp?.email ?? ""}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm hidden sm:table-cell">
                        {emp?.employeeId ?? ""}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{emp?.department?.name ?? "—"}</TableCell>
                      <TableCell className="hidden lg:table-cell">{emp?.role?.name ?? "—"}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge className={getStatusColor(emp?.employmentStatus ?? "")}>
                          {emp?.employmentStatus ?? ""}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={emp?.isActive !== false ? "default" : "secondary"} className={emp?.isActive !== false ? "bg-green-500" : "bg-gray-400"}>
                          {emp?.isActive !== false ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Link href={`/employees/${emp?.id ?? ""}`}>
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          {canCreate && (
                            <Link href={`/employees/${emp?.id ?? ""}?edit=true`}>
                              <Button variant="ghost" size="icon">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                          )}
                          {isAdmin && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {emp?.isActive !== false ? (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedEmployee(emp);
                                      setShowDeactivateDialog(true);
                                    }}
                                    className="text-amber-600"
                                  >
                                    <UserX className="h-4 w-4 mr-2" />
                                    Deactivate Account
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedEmployee(emp);
                                      setShowActivateDialog(true);
                                    }}
                                    className="text-green-600"
                                  >
                                    <UserCheck className="h-4 w-4 mr-2" />
                                    Activate Account
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedEmployee(emp);
                                    setShowDeleteDialog(true);
                                  }}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Permanently
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-gray-500">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                  {pagination.total} employees
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                    }
                    disabled={pagination.page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                    }
                    disabled={pagination.page >= pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Deactivate Confirmation Dialog */}
      <AlertDialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate the account for{" "}
              <strong>{selectedEmployee?.firstName} {selectedEmployee?.lastName}</strong>?
              <br /><br />
              This will prevent the employee from logging into the system. You can reactivate the account later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedEmployee && handleToggleStatus(selectedEmployee, false)}
              disabled={actionLoading}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {actionLoading ? "Deactivating..." : "Deactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Activate Confirmation Dialog */}
      <AlertDialog open={showActivateDialog} onOpenChange={setShowActivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to activate the account for{" "}
              <strong>{selectedEmployee?.firstName} {selectedEmployee?.lastName}</strong>?
              <br /><br />
              This will allow the employee to log into the system again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedEmployee && handleToggleStatus(selectedEmployee, true)}
              disabled={actionLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {actionLoading ? "Activating..." : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Permanently Delete Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete{" "}
              <strong>{selectedEmployee?.firstName} {selectedEmployee?.lastName}</strong>?
              <br /><br />
              <span className="text-red-600 font-medium">
                This action cannot be undone. All employee data including attendance records, 
                payroll history, leave records, and documents will be permanently deleted.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedEmployee && handleDelete(selectedEmployee)}
              disabled={actionLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {actionLoading ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}