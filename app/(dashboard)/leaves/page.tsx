"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CalendarDays,
  Plus,
  Check,
  X,
  Eye,
  Trash2,
  Upload,
  FileText,
  UserCheck,
  Download,
  Settings2,
  Edit,
  Save,
  Users,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { formatDate, getStatusColor, getLeaveTypeLabel, getFilingTypeLabel, calculateLeaveDays } from "@/lib/utils";
import toast from "react-hot-toast";

export default function LeavesPage() {
  const { data: session } = useSession() || {};
  const [leaves, setLeaves] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [activeTab, setActiveTab] = useState("my-leaves");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [applyDialog, setApplyDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [approverDialog, setApproverDialog] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedApprover, setSelectedApprover] = useState<string>("");
  const [formData, setFormData] = useState({
    leaveType: "",
    filingType: "ADVANCE",
    startDate: "",
    endDate: "",
    reason: "",
    isHalfDay: false,
  });
  const [uploadedFile, setUploadedFile] = useState<{
    url: string;
    name: string;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Leave config states
  const [leaveConfigs, setLeaveConfigs] = useState<any[]>([]);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<any>(null);
  const [configForm, setConfigForm] = useState({ code: "", name: "", defaultBalance: "0", description: "" });
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedConfigIds, setSelectedConfigIds] = useState<string[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [assignOverwrite, setAssignOverwrite] = useState(false);
  const [assignYear, setAssignYear] = useState(new Date().getFullYear().toString());
  const [assignLoading, setAssignLoading] = useState(false);

  const userRole = (session?.user as any)?.role;
  const employeeId = (session?.user as any)?.employeeId;
  const isAdminOrHR = userRole === "ADMIN" || userRole === "HR";

  const fetchLeaveConfigs = async () => {
    try {
      const res = await fetch("/api/leaves/config");
      const data = await res.json();
      setLeaveConfigs(data?.configs ?? []);
    } catch (error) {
      console.error("Fetch leave configs error:", error);
    }
  };

  const handleSaveConfig = async () => {
    if (!configForm.code || !configForm.name) {
      toast.error("Code and name are required");
      return;
    }
    try {
      const method = editingConfig ? "PUT" : "POST";
      const body = editingConfig
        ? { id: editingConfig.id, name: configForm.name, defaultBalance: configForm.defaultBalance, description: configForm.description }
        : { code: configForm.code, name: configForm.name, defaultBalance: configForm.defaultBalance, description: configForm.description };
      const res = await fetch("/api/leaves/config", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success(editingConfig ? "Leave type updated" : "Leave type created");
        setConfigDialogOpen(false);
        setEditingConfig(null);
        setConfigForm({ code: "", name: "", defaultBalance: "0", description: "" });
        fetchLeaveConfigs();
      } else {
        const data = await res.json();
        toast.error(data?.message ?? "Failed to save");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const handleToggleConfig = async (config: any) => {
    try {
      const res = await fetch("/api/leaves/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: config.id, isActive: !config.isActive }),
      });
      if (res.ok) {
        toast.success(`${config.name} ${config.isActive ? "disabled" : "enabled"}`);
        fetchLeaveConfigs();
      }
    } catch (error) {
      toast.error("Failed to update");
    }
  };

  const handleDeleteConfig = async (id: string) => {
    if (!confirm("Are you sure you want to delete this leave type?")) return;
    try {
      const res = await fetch(`/api/leaves/config?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Leave type deleted");
        fetchLeaveConfigs();
      } else {
        toast.error("Failed to delete");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const handleAssignLeaves = async () => {
    if (selectedConfigIds.length === 0 || selectedEmployeeIds.length === 0) {
      toast.error("Select at least one leave type and one employee");
      return;
    }
    setAssignLoading(true);
    try {
      const res = await fetch("/api/leaves/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeIds: selectedEmployeeIds,
          leaveTypeConfigIds: selectedConfigIds,
          year: parseInt(assignYear),
          overwrite: assignOverwrite,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        setAssignDialogOpen(false);
        setSelectedConfigIds([]);
        setSelectedEmployeeIds([]);
      } else {
        toast.error(data?.message ?? "Failed to assign");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setAssignLoading(false);
    }
  };

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (filterStatus && filterStatus !== "all") params.set("status", filterStatus);

      const res = await fetch(`/api/leaves?${params}`);
      const data = await res.json();
      setLeaves(data?.leaves ?? []);
      setPagination((prev) => ({
        ...prev,
        total: data?.pagination?.total ?? 0,
        totalPages: data?.pagination?.totalPages ?? 0,
      }));
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingApprovals = async () => {
    if (!employeeId) return;
    try {
      const res = await fetch(`/api/leaves?forApproval=true`);
      const data = await res.json();
      setPendingApprovals(data?.leaves ?? []);
    } catch (error) {
      console.error("Fetch approvals error:", error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/employees?limit=500");
      const data = await res.json();
      setEmployees(data?.employees ?? []);
    } catch (error) {
      console.error("Fetch employees error:", error);
    }
  };

  useEffect(() => {
    fetchLeaves();
    fetchPendingApprovals();
    fetchLeaveConfigs();
    if (isAdminOrHR) {
      fetchEmployees();
    }
  }, [pagination.page, filterStatus]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only PDF and image files are allowed");
      return;
    }

    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setUploading(true);
    try {
      // Get presigned URL
      const presignedRes = await fetch("/api/upload/presigned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          isPublic: false,
        }),
      });

      const presignedData = await presignedRes.json();
      if (!presignedRes.ok) {
        throw new Error(presignedData.message || "Failed to get upload URL");
      }

      // Upload to S3
      const uploadRes = await fetch(presignedData.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload file");
      }

      setUploadedFile({
        url: presignedData.cloud_storage_path,
        name: file.name,
      });
      toast.success("File uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const handleApply = async () => {
    if (!formData.leaveType || !formData.startDate || !formData.endDate || !formData.reason) {
      toast.error("Please fill all required fields");
      return;
    }

    // Sick leave requires attachment
    if (formData.leaveType === "SICK" && !uploadedFile) {
      toast.error("Sick leave requires a supporting document (medical certificate)");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          employeeId,
          documentUrl: uploadedFile?.url,
          documentName: uploadedFile?.name,
          isPublicDoc: false,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Leave application submitted");
        setApplyDialog(false);
        setFormData({
          leaveType: "",
          filingType: "ADVANCE",
          startDate: "",
          endDate: "",
          reason: "",
          isHalfDay: false,
        });
        setUploadedFile(null);
        fetchLeaves();
      } else {
        toast.error(data?.message ?? "Failed to submit");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/leaves/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APPROVED" }),
      });

      if (res.ok) {
        toast.success("Leave approved");
        fetchLeaves();
        fetchPendingApprovals();
      } else {
        toast.error("Failed to approve");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const handleReject = async () => {
    if (!selectedLeave?.id) return;

    try {
      const res = await fetch(`/api/leaves/${selectedLeave.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REJECTED", rejectionReason }),
      });

      if (res.ok) {
        toast.success("Leave rejected");
        setRejectDialog(false);
        setRejectionReason("");
        fetchLeaves();
        fetchPendingApprovals();
      } else {
        toast.error("Failed to reject");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this leave request?")) return;

    try {
      const res = await fetch(`/api/leaves/${id}`, { method: "DELETE" });

      if (res.ok) {
        toast.success("Leave cancelled");
        fetchLeaves();
      } else {
        toast.error("Failed to cancel");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const handleAssignApprover = async () => {
    if (!selectedLeave?.id) return;

    try {
      const res = await fetch(`/api/leaves/${selectedLeave.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approverId: selectedApprover || null }),
      });

      if (res.ok) {
        toast.success("Approver updated");
        setApproverDialog(false);
        setSelectedApprover("");
        fetchLeaves();
      } else {
        toast.error("Failed to update approver");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const calculatedDays =
    formData.startDate && formData.endDate
      ? calculateLeaveDays(
          new Date(formData.startDate),
          new Date(formData.endDate),
          formData.isHalfDay
        )
      : 0;

  const renderLeaveTable = (leaveList: any[], showApproveActions: boolean = false) => (
    <div className="overflow-x-auto"><Table>
      <TableHeader>
        <TableRow>
          {isAdminOrHR && <TableHead>Employee</TableHead>}
          <TableHead>Leave Type</TableHead>
          <TableHead className="hidden sm:table-cell">Filing Type</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead>Days</TableHead>
          <TableHead className="hidden md:table-cell">Approver</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="hidden md:table-cell">Applied On</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {leaveList.map((leave: any) => (
          <TableRow key={leave?.id ?? Math.random()}>
            {isAdminOrHR && (
              <TableCell>
                <div>
                  <p className="font-medium">
                    {leave?.employee?.firstName ?? ""} {leave?.employee?.lastName ?? ""}
                  </p>
                  <p className="text-xs text-gray-500">
                    {leave?.employee?.department?.name ?? ""}
                  </p>
                </div>
              </TableCell>
            )}
            <TableCell>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {getLeaveTypeLabel(leave?.leaveType ?? "")}
                </Badge>
                {leave?.documentUrl && (
                  <FileText className="h-4 w-4 text-blue-500" />
                )}
              </div>
            </TableCell>
            <TableCell className="hidden sm:table-cell">
              <Badge className={leave?.filingType === "URGENT" ? "bg-orange-100 text-orange-800" : "bg-blue-100 text-blue-800"}>
                {getFilingTypeLabel(leave?.filingType ?? "ADVANCE")}
              </Badge>
            </TableCell>
            <TableCell>
              {formatDate(leave?.startDate)} - {formatDate(leave?.endDate)}
            </TableCell>
            <TableCell>{leave?.totalDays ?? 0} day(s)</TableCell>
            <TableCell className="hidden md:table-cell">
              {leave?.approver ? (
                <div className="flex items-center gap-1">
                  <UserCheck className="h-4 w-4 text-green-600" />
                  <span className="text-sm">
                    {leave.approver.firstName} {leave.approver.lastName}
                  </span>
                </div>
              ) : (
                <span className="text-gray-400 text-sm">Not assigned</span>
              )}
            </TableCell>
            <TableCell>
              <Badge className={getStatusColor(leave?.status ?? "")}>
                {leave?.status ?? ""}
              </Badge>
            </TableCell>
            <TableCell className="hidden md:table-cell">{formatDate(leave?.createdAt)}</TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSelectedLeave(leave);
                    setViewDialog(true);
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                {(isAdminOrHR || showApproveActions) && leave?.status === "PENDING" && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-green-600"
                      onClick={() => handleApprove(leave?.id)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-600"
                      onClick={() => {
                        setSelectedLeave(leave);
                        setRejectDialog(true);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                )}
                {isAdminOrHR && leave?.status === "PENDING" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-blue-600"
                    onClick={() => {
                      setSelectedLeave(leave);
                      setSelectedApprover(leave?.approverId ?? "");
                      setApproverDialog(true);
                    }}
                  >
                    <UserCheck className="h-4 w-4" />
                  </Button>
                )}
                {leave?.status === "PENDING" &&
                  leave?.employeeId === employeeId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-600"
                      onClick={() => handleCancel(leave?.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table></div>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Leave Management</h1>
          <p className="text-sm text-gray-500">Apply for and manage leave requests</p>
        </div>
        {employeeId && (
          <Button onClick={() => setApplyDialog(true)} className="self-start" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Apply for Leave
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="my-leaves">
            {isAdminOrHR ? "All Leaves" : "My Leaves"}
          </TabsTrigger>
          {pendingApprovals.length > 0 && (
            <TabsTrigger value="for-approval" className="relative">
              For My Approval
              <Badge className="ml-2 bg-red-500 text-white">
                {pendingApprovals.length}
              </Badge>
            </TabsTrigger>
          )}
          {isAdminOrHR && (
            <TabsTrigger value="configuration">
              <Settings2 className="mr-1 h-4 w-4" />
              Configuration
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="my-leaves">
          {/* Filters */}
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex gap-4">
                <Select value={filterStatus} onValueChange={(v) => {
                  setFilterStatus(v);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Leaves Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Leave Requests ({pagination.total})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (leaves ?? []).length === 0 ? (
                <div className="text-center py-12">
                  <CalendarDays className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No leave requests found</p>
                </div>
              ) : (
                <>
                  {renderLeaveTable(leaves)}

                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-gray-500">
                      Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                      {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                      {pagination.total} requests
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
        </TabsContent>

        <TabsContent value="for-approval">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-amber-600" />
                Pending Your Approval ({pendingApprovals.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingApprovals.length === 0 ? (
                <div className="text-center py-12">
                  <UserCheck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No pending approvals</p>
                </div>
              ) : (
                renderLeaveTable(pendingApprovals, true)
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {isAdminOrHR && (
          <TabsContent value="configuration">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Settings2 className="h-5 w-5 text-blue-600" />
                    Leave Type Configuration
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setAssignDialogOpen(true)}>
                      <Users className="mr-2 h-4 w-4" />
                      Assign to Employees
                    </Button>
                    <Button size="sm" onClick={() => {
                      setEditingConfig(null);
                      setConfigForm({ code: "", name: "", defaultBalance: "0", description: "" });
                      setConfigDialogOpen(true);
                    }}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Leave Type
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 mb-4">
                  Configure leave types and their default balances. You can then assign these to employees.
                </p>
                {leaveConfigs.length === 0 ? (
                  <div className="text-center py-12">
                    <Settings2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No leave types configured</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Default Balance</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leaveConfigs.map((config: any) => (
                          <TableRow key={config.id}>
                            <TableCell>
                              <Badge variant="outline" className="font-mono">{config.code}</Badge>
                            </TableCell>
                            <TableCell className="font-medium">{config.name}</TableCell>
                            <TableCell>
                              <span className="font-semibold text-blue-600">{config.defaultBalance}</span>
                              <span className="text-gray-500 text-sm ml-1">days</span>
                            </TableCell>
                            <TableCell className="text-gray-500 text-sm max-w-xs truncate">
                              {config.description || "—"}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={config.isActive}
                                  onCheckedChange={() => handleToggleConfig(config)}
                                />
                                <span className={`text-xs ${config.isActive ? "text-green-600" : "text-gray-400"}`}>
                                  {config.isActive ? "Active" : "Inactive"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setEditingConfig(config);
                                    setConfigForm({
                                      code: config.code,
                                      name: config.name,
                                      defaultBalance: config.defaultBalance.toString(),
                                      description: config.description || "",
                                    });
                                    setConfigDialogOpen(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-600"
                                  onClick={() => handleDeleteConfig(config.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Apply Leave Dialog */}
      <Dialog open={applyDialog} onOpenChange={setApplyDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Apply for Leave</DialogTitle>
            <DialogDescription>Submit a new leave request</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Leave Type *</Label>
                <Select
                  value={formData.leaveType}
                  onValueChange={(v) =>
                    setFormData((prev) => ({ ...prev, leaveType: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    {leaveConfigs.filter((c: any) => c.isActive).length > 0 ? (
                      leaveConfigs.filter((c: any) => c.isActive).map((c: any) => (
                        <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                      ))
                    ) : (
                      <>
                        <SelectItem value="ANNUAL">Annual Leave</SelectItem>
                        <SelectItem value="SICK">Sick Leave</SelectItem>
                        <SelectItem value="EMERGENCY">Emergency Leave</SelectItem>
                        <SelectItem value="WFH">Work From Home</SelectItem>
                        <SelectItem value="COMPASSIONATE">Compassionate Leave</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Filing Type *</Label>
                <Select
                  value={formData.filingType}
                  onValueChange={(v) =>
                    setFormData((prev) => ({ ...prev, filingType: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select filing type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADVANCE">3+ Days Filing (Advance)</SelectItem>
                    <SelectItem value="URGENT">Urgent Filing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, startDate: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>End Date *</Label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, endDate: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="halfDay"
                checked={formData.isHalfDay}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, isHalfDay: checked as boolean }))
                }
              />
              <Label htmlFor="halfDay" className="cursor-pointer">
                Half-day leave
              </Label>
            </div>
            {calculatedDays > 0 && (
              <p className="text-sm text-blue-600 font-medium">
                Total: {calculatedDays} day(s)
              </p>
            )}
            <div className="space-y-2">
              <Label>Reason *</Label>
              <Textarea
                value={formData.reason}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, reason: e.target.value }))
                }
                placeholder="Please provide a reason for your leave"
              />
            </div>

            {/* File Upload for Sick Leave */}
            {formData.leaveType === "SICK" && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  Supporting Document *
                  <span className="text-xs text-gray-500">(Medical Certificate)</span>
                </Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  {uploadedFile ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-500" />
                        <span className="text-sm">{uploadedFile.name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setUploadedFile(null)}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {uploading ? "Uploading..." : "Upload File"}
                      </Button>
                      <p className="text-xs text-gray-500 mt-2">
                        PDF, JPG, PNG (max 5MB)
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleApply} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Application"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Leave Dialog */}
      <Dialog open={viewDialog} onOpenChange={setViewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave Details</DialogTitle>
          </DialogHeader>
          {selectedLeave && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">Employee</Label>
                  <p className="font-medium">
                    {selectedLeave?.employee?.firstName ?? ""}{" "}
                    {selectedLeave?.employee?.lastName ?? ""}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-500">Leave Type</Label>
                  <p className="font-medium">
                    {getLeaveTypeLabel(selectedLeave?.leaveType ?? "")}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-500">Filing Type</Label>
                  <Badge className={selectedLeave?.filingType === "URGENT" ? "bg-orange-100 text-orange-800" : "bg-blue-100 text-blue-800"}>
                    {getFilingTypeLabel(selectedLeave?.filingType ?? "ADVANCE")}
                  </Badge>
                </div>
                <div>
                  <Label className="text-gray-500">Duration</Label>
                  <p className="font-medium">
                    {formatDate(selectedLeave?.startDate)} -{" "}
                    {formatDate(selectedLeave?.endDate)}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-500">Total Days</Label>
                  <p className="font-medium">{selectedLeave?.totalDays ?? 0} day(s)</p>
                </div>
                <div>
                  <Label className="text-gray-500">Status</Label>
                  <Badge className={getStatusColor(selectedLeave?.status ?? "")}>
                    {selectedLeave?.status ?? ""}
                  </Badge>
                </div>
                <div>
                  <Label className="text-gray-500">Approver</Label>
                  {selectedLeave?.approver ? (
                    <p className="font-medium">
                      {selectedLeave.approver.firstName} {selectedLeave.approver.lastName}
                    </p>
                  ) : (
                    <p className="text-gray-400">Not assigned</p>
                  )}
                </div>
                {selectedLeave?.approvedBy && (
                  <div>
                    <Label className="text-gray-500">Processed By</Label>
                    <p className="font-medium">{selectedLeave.approvedBy?.name ?? ""}</p>
                  </div>
                )}
              </div>
              <div>
                <Label className="text-gray-500">Reason</Label>
                <p className="font-medium">{selectedLeave?.reason ?? ""}</p>
              </div>
              {selectedLeave?.rejectionReason && (
                <div>
                  <Label className="text-gray-500">Rejection Reason</Label>
                  <p className="font-medium text-red-600">
                    {selectedLeave.rejectionReason}
                  </p>
                </div>
              )}
              {selectedLeave?.documentUrl && (
                <div>
                  <Label className="text-gray-500">Attachment</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <FileText className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">{selectedLeave.documentName || "Document"}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        try {
                          const res = await fetch(`/api/employees/${selectedLeave.employeeId}/documents?fileUrl=${encodeURIComponent(selectedLeave.documentUrl)}`);
                          const data = await res.json();
                          if (data.downloadUrl) {
                            window.open(data.downloadUrl, "_blank");
                          }
                        } catch (error) {
                          toast.error("Failed to download file");
                        }
                      }}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog} onOpenChange={setRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Leave Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this leave request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Reason for rejection"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Reject Leave
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Approver Dialog */}
      <Dialog open={approverDialog} onOpenChange={setApproverDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Approver</DialogTitle>
            <DialogDescription>
              Select an employee to approve this leave request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Approver</Label>
              <Select
                value={selectedApprover}
                onValueChange={setSelectedApprover}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an approver" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Approver</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproverDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignApprover}>
              Save Approver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave Type Config Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingConfig ? "Edit Leave Type" : "Add Leave Type"}</DialogTitle>
            <DialogDescription>
              {editingConfig ? "Update the leave type configuration" : "Create a new leave type with default balance"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Code *</Label>
              <Input
                value={configForm.code}
                onChange={(e) => setConfigForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                placeholder="e.g., ANNUAL, SICK"
                disabled={!!editingConfig}
                className="font-mono"
              />
              {editingConfig && <p className="text-xs text-gray-400">Code cannot be changed after creation</p>}
            </div>
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={configForm.name}
                onChange={(e) => setConfigForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Annual Leave"
              />
            </div>
            <div className="space-y-2">
              <Label>Default Balance (days)</Label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={configForm.defaultBalance}
                onChange={(e) => setConfigForm((prev) => ({ ...prev, defaultBalance: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={configForm.description}
                onChange={(e) => setConfigForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveConfig}>
              <Save className="mr-2 h-4 w-4" />
              {editingConfig ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Leave Balances Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Leave Balances</DialogTitle>
            <DialogDescription>
              Select leave types and employees to assign leave balances.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Year</Label>
              <Input
                type="number"
                value={assignYear}
                onChange={(e) => setAssignYear(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Select Leave Types</Label>
              <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                {leaveConfigs.filter((c: any) => c.isActive).map((config: any) => (
                  <div key={config.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`config-${config.id}`}
                      checked={selectedConfigIds.includes(config.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedConfigIds((prev) => [...prev, config.id]);
                        } else {
                          setSelectedConfigIds((prev) => prev.filter((id) => id !== config.id));
                        }
                      }}
                    />
                    <Label htmlFor={`config-${config.id}`} className="cursor-pointer text-sm">
                      {config.name} ({config.defaultBalance} days)
                    </Label>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedConfigIds(leaveConfigs.filter((c: any) => c.isActive).map((c: any) => c.id))}
                >
                  Select All
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedConfigIds([])}
                >
                  Clear
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Select Employees</Label>
              <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                {employees.map((emp: any) => (
                  <div key={emp.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`emp-${emp.id}`}
                      checked={selectedEmployeeIds.includes(emp.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedEmployeeIds((prev) => [...prev, emp.id]);
                        } else {
                          setSelectedEmployeeIds((prev) => prev.filter((id) => id !== emp.id));
                        }
                      }}
                    />
                    <Label htmlFor={`emp-${emp.id}`} className="cursor-pointer text-sm">
                      {emp.firstName} {emp.lastName} ({emp.employeeId})
                    </Label>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedEmployeeIds(employees.map((e: any) => e.id))}
                >
                  Select All
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedEmployeeIds([])}
                >
                  Clear
                </Button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="overwrite"
                checked={assignOverwrite}
                onCheckedChange={(checked) => setAssignOverwrite(checked as boolean)}
              />
              <Label htmlFor="overwrite" className="cursor-pointer text-sm">
                Overwrite existing balances (reset to default)
              </Label>
            </div>

            <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
              <p><strong>Summary:</strong> {selectedConfigIds.length} leave type(s) will be assigned to {selectedEmployeeIds.length} employee(s) for year {assignYear}.</p>
              {!assignOverwrite && <p className="mt-1">Existing balances will be skipped.</p>}
              {assignOverwrite && <p className="mt-1 text-orange-600">⚠ Existing balances will be overwritten with default values.</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAssignLeaves} disabled={assignLoading}>
              {assignLoading ? "Assigning..." : "Assign Leave Balances"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
