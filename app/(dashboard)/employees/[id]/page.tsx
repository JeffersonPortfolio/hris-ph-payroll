"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  User,
  Briefcase,
  CreditCard,
  FileText,
  Edit,
  Save,
  X,
  Upload,
  Download,
  ChevronDown,
  ChevronRight,
  Calendar,
  Clock,
  MapPin,
  Home,
  Phone,
  Camera,
  DollarSign,
  Receipt,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, getStatusColor, getLeaveTypeLabel, formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";
import dynamic from "next/dynamic";

const GeofenceMap = dynamic(() => import("@/components/geofence-map"), { ssr: false });

type SectionKey = 
  | "basic-info"
  | "other-info"
  | "address-contact"
  | "payroll-info"
  | "work-schedule"
  | "attendance"
  | "leave-management"
  | "documents"
  | "geolocation"
  | "payslip";

const navigationItems = [
  {
    id: "employee-profile",
    label: "EMPLOYEE PROFILE",
    icon: User,
    children: [
      { id: "basic-info" as SectionKey, label: "Basic Information" },
      { id: "other-info" as SectionKey, label: "Other Information" },
      { id: "address-contact" as SectionKey, label: "Address & Contact Information" },
    ],
  },
  {
    id: "payroll-info",
    label: "PAYROLL INFORMATION",
    icon: DollarSign,
    children: [{ id: "payroll-info" as SectionKey, label: "Payroll Details" }],
  },
  {
    id: "work-schedule",
    label: "WORK SCHEDULE",
    icon: Clock,
    children: [{ id: "work-schedule" as SectionKey, label: "Schedule Details" }],
  },
  {
    id: "attendance",
    label: "ATTENDANCE",
    icon: Calendar,
    children: [{ id: "attendance" as SectionKey, label: "Attendance Records" }],
  },
  {
    id: "leave-management",
    label: "LEAVE MANAGEMENT",
    icon: Briefcase,
    children: [{ id: "leave-management" as SectionKey, label: "Leave Records" }],
  },
  {
    id: "documents",
    label: "DOCUMENTS",
    icon: FileText,
    children: [{ id: "documents" as SectionKey, label: "Employee Documents" }],
  },
  {
    id: "geolocation",
    label: "GEOLOCATION",
    icon: MapPin,
    children: [{ id: "geolocation" as SectionKey, label: "Location History" }],
  },
  {
    id: "payslip",
    label: "PAYSLIP",
    icon: Receipt,
    children: [{ id: "payslip" as SectionKey, label: "Payslip Records" }],
  },
];

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession() || {};
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [departments, setDepartments] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [activeSection, setActiveSection] = useState<SectionKey>("basic-info");
  const [expandedSections, setExpandedSections] = useState<string[]>(["employee-profile"]);
  const [attendances, setAttendances] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [payslips, setPayslips] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  // Geolocation state
  const [geoEnabled, setGeoEnabled] = useState(false);
  const [geoLocationName, setGeoLocationName] = useState("");
  const [geoLatitude, setGeoLatitude] = useState<number | null>(null);
  const [geoLongitude, setGeoLongitude] = useState<number | null>(null);
  const [geoRadius, setGeoRadius] = useState(0.5);
  const [savingGeo, setSavingGeo] = useState(false);

  const id = params?.id as string;
  const userRole = (session?.user as any)?.role;
  const canEdit = userRole === "ADMIN" || userRole === "HR";

  const fetchEmployee = async () => {
    try {
      const res = await fetch(`/api/employees/${id}`);
      const data = await res.json();
      setEmployee(data?.employee ?? null);
      setFormData(data?.employee ?? {});
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const [deptRes, roleRes] = await Promise.all([
        fetch("/api/departments"),
        fetch("/api/roles"),
      ]);
      const [deptData, roleData] = await Promise.all([deptRes.json(), roleRes.json()]);
      setDepartments(deptData?.departments ?? []);
      setRoles(roleData?.roles ?? []);
    } catch (error) {
      console.error("Fetch options error:", error);
    }
  };

  const fetchAttendances = async () => {
    try {
      const res = await fetch(`/api/attendance?employeeId=${id}&limit=30`);
      const data = await res.json();
      setAttendances(data?.attendances ?? []);
    } catch (error) {
      console.error("Fetch attendance error:", error);
    }
  };

  const fetchLeaves = async () => {
    try {
      const res = await fetch(`/api/leaves?employeeId=${id}&limit=20`);
      const data = await res.json();
      setLeaves(data?.leaves ?? []);
    } catch (error) {
      console.error("Fetch leaves error:", error);
    }
  };

  const fetchPayslips = async () => {
    try {
      const res = await fetch(`/api/payroll?employeeId=${id}`);
      const data = await res.json();
      setPayslips(data?.payrolls ?? []);
    } catch (error) {
      console.error("Fetch payslips error:", error);
    }
  };

  const fetchSchedules = async () => {
    try {
      const res = await fetch(`/api/work-schedules/employee/${id}`);
      const data = await res.json();
      setSchedules(data?.schedules ?? []);
    } catch (error) {
      console.error("Fetch schedules error:", error);
    }
  };

  useEffect(() => {
    fetchEmployee();
    fetchOptions();
  }, [id]);

  useEffect(() => {
    if (activeSection === "attendance") fetchAttendances();
    if (activeSection === "leave-management") fetchLeaves();
    if (activeSection === "payslip") fetchPayslips();
    if (activeSection === "work-schedule") fetchSchedules();
  }, [activeSection, id]);

  // Update geolocation state when employee data is loaded
  useEffect(() => {
    if (employee) {
      setGeoEnabled(employee.geoEnabled ?? false);
      setGeoLocationName(employee.geoLocationName ?? "");
      setGeoLatitude(employee.geoLatitude ?? null);
      setGeoLongitude(employee.geoLongitude ?? null);
      setGeoRadius(employee.geoRadius ?? 0.5);
    }
  }, [employee]);

  const handleSaveGeolocation = async () => {
    setSavingGeo(true);
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          geoEnabled,
          geoLocationName,
          geoLatitude,
          geoLongitude,
          geoRadius,
        }),
      });

      if (res.ok) {
        toast.success("Geolocation settings saved");
        fetchEmployee();
      } else {
        toast.error("Failed to save geolocation settings");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setSavingGeo(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success("Employee updated successfully");
        setEditing(false);
        fetchEmployee();
      } else {
        const data = await res.json();
        toast.error(data?.message ?? "Failed to update");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target?.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    setUploadingPhoto(true);
    try {
      const presignedRes = await fetch("/api/upload/presigned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          isPublic: true,
        }),
      });

      const { uploadUrl, cloudStoragePath } = await presignedRes.json();

      const uploadHeaders: Record<string, string> = { "Content-Type": file.type };
      if (uploadUrl.includes("content-disposition")) {
        uploadHeaders["Content-Disposition"] = "attachment";
      }

      await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: uploadHeaders,
      });

      const updateRes = await fetch(`/api/employees/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profilePhoto: cloudStoragePath }),
      });

      if (updateRes.ok) {
        toast.success("Profile photo updated");
        fetchEmployee();
      }
    } catch (error) {
      toast.error("Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target?.files?.[0];
    if (!file) return;

    try {
      const presignedRes = await fetch("/api/upload/presigned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          isPublic: false,
        }),
      });

      const { uploadUrl, cloudStoragePath } = await presignedRes.json();

      await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      await fetch(`/api/employees/${id}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          type: file.type,
          cloudStoragePath,
          size: file.size,
        }),
      });

      toast.success("Document uploaded");
      fetchEmployee();
    } catch (error) {
      toast.error("Upload failed");
    }
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "REGULAR":
        return "bg-green-500 text-white";
      case "PROBATIONARY":
        return "bg-yellow-500 text-white";
      case "RESIGNED":
        return "bg-red-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Employee not found</p>
        <Link href="/employees">
          <Button className="mt-4">Back to Employees</Button>
        </Link>
      </div>
    );
  }

  const renderProfileSidebar = () => (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Profile Header */}
      <div className="p-6 border-b border-gray-200 text-center">
        <div className="relative inline-block">
          <div className="w-32 h-32 mx-auto rounded-full bg-amber-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg relative">
            {employee?.profilePhoto ? (
              <Image
                src={`https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Aaron_Swartz_in_2011.jpg/250px-Aaron_Swartz_in_2011.jpg || ''}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || ''}.amazonaws.com/${employee.profilePhoto}`}
                alt={`${employee.firstName} ${employee.lastName}`}
                fill
                className="object-cover"
              />
            ) : (
              <User className="h-16 w-16 text-amber-600" />
            )}
          </div>
          {canEdit && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="absolute bottom-0 right-0 w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center text-white hover:bg-amber-600 transition-colors shadow-lg"
            >
              <Camera className="h-5 w-5" />
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoUpload}
          />
        </div>
        <h2 className="mt-4 text-lg font-bold text-gray-900">
          {employee?.lastName?.toUpperCase()}, {employee?.firstName?.toUpperCase()}
        </h2>
        <p className="text-sm text-amber-600">{employee?.role?.name ?? "—"}</p>
        <Badge className={`mt-3 ${getStatusBadgeClass(employee?.employmentStatus)}`}>
          {employee?.employmentStatus === "REGULAR" ? "ACTIVE" : employee?.employmentStatus}
        </Badge>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-2">
        {navigationItems.map((item) => (
          <Collapsible
            key={item.id}
            open={expandedSections.includes(item.id)}
            onOpenChange={() => toggleSection(item.id)}
          >
            <CollapsibleTrigger className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
              {expandedSections.includes(item.id) ? (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-400" />
              )}
              <item.icon className="h-4 w-4 text-amber-500" />
              <span>{item.label}</span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="pl-10 pr-4 space-y-1">
                {item.children.map((child) => (
                  <button
                    key={child.id}
                    onClick={() => setActiveSection(child.id)}
                    className={`w-full text-left py-2 px-3 text-sm rounded transition-colors ${
                      activeSection === child.id
                        ? "text-amber-600 bg-amber-50 font-medium"
                        : "text-gray-600 hover:text-amber-600 hover:bg-gray-50"
                    }`}
                  >
                    {child.label}
                  </button>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </div>
  );

  const renderInfoRow = (label: string, value: any) => (
    <div className="grid grid-cols-3 py-3 border-b border-gray-100">
      <div className="text-sm font-medium text-amber-700 uppercase">{label}</div>
      <div className="col-span-2 text-sm text-gray-900">{value || "--"}</div>
    </div>
  );

  const renderEditableField = (label: string, field: string, type: string = "text") => (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-amber-700 uppercase">{label}</Label>
      {type === "select-department" ? (
        <Select value={formData?.[field] ?? ""} onValueChange={(v) => handleChange(field, v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select department" />
          </SelectTrigger>
          <SelectContent>
            {departments.map((d: any) => (
              <SelectItem key={d?.id} value={d?.id}>
                {d?.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : type === "select-role" ? (
        <Select value={formData?.[field] ?? ""} onValueChange={(v) => handleChange(field, v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            {roles.map((r: any) => (
              <SelectItem key={r?.id} value={r?.id}>
                {r?.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : type === "select-status" ? (
        <Select value={formData?.[field] ?? ""} onValueChange={(v) => handleChange(field, v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PROBATIONARY">Probationary</SelectItem>
            <SelectItem value="REGULAR">Regular</SelectItem>
            <SelectItem value="RESIGNED">Resigned</SelectItem>
          </SelectContent>
        </Select>
      ) : type === "select-gender" ? (
        <Select value={formData?.[field] ?? ""} onValueChange={(v) => handleChange(field, v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select gender" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="MALE">Male</SelectItem>
            <SelectItem value="FEMALE">Female</SelectItem>
            <SelectItem value="OTHER">Other</SelectItem>
          </SelectContent>
        </Select>
      ) : type === "select-civil" ? (
        <Select value={formData?.[field] ?? ""} onValueChange={(v) => handleChange(field, v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="SINGLE">Single</SelectItem>
            <SelectItem value="MARRIED">Married</SelectItem>
            <SelectItem value="WIDOWED">Widowed</SelectItem>
            <SelectItem value="SEPARATED">Separated</SelectItem>
            <SelectItem value="DIVORCED">Divorced</SelectItem>
          </SelectContent>
        </Select>
      ) : type === "textarea" ? (
        <Textarea
          value={formData?.[field] ?? ""}
          onChange={(e) => handleChange(field, e.target.value)}
          rows={3}
        />
      ) : type === "date" ? (
        <Input
          type="date"
          value={formData?.[field] ? new Date(formData[field]).toISOString().split("T")[0] : ""}
          onChange={(e) => handleChange(field, e.target.value)}
        />
      ) : type === "number" ? (
        <Input
          type="number"
          step="0.01"
          value={formData?.[field] ?? ""}
          onChange={(e) => handleChange(field, e.target.value ? parseFloat(e.target.value) : 0)}
        />
      ) : (
        <Input
          type={type}
          value={formData?.[field] ?? ""}
          onChange={(e) => handleChange(field, e.target.value)}
        />
      )}
    </div>
  );

  const renderBasicInfo = () => (
    <div className="space-y-0">
      <div className="bg-amber-600 text-white px-6 py-3 font-semibold text-sm">
        BASIC INFORMATION
      </div>
      <div className="bg-white p-6">
        {editing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderEditableField("First Name", "firstName")}
            {renderEditableField("Last Name", "lastName")}
            {renderEditableField("Middle Name", "middleName")}
            {renderEditableField("Email", "email", "email")}
            {renderEditableField("Employee ID", "employeeId")}
            {renderEditableField("Designation", "roleId", "select-role")}
            {renderEditableField("Department", "departmentId", "select-department")}
            {renderEditableField("Gender", "gender", "select-gender")}
            {renderEditableField("Civil Status", "civilStatus", "select-civil")}
            {renderEditableField("Employment Status", "employmentStatus", "select-status")}
            {renderEditableField("Date Hired", "dateHired", "date")}
            {renderEditableField("Regularization Date", "regularizationDate", "date")}
          </div>
        ) : (
          <div>
            {renderInfoRow("Email", employee?.email)}
            {renderInfoRow("Company", "Company Name")}
            {renderInfoRow("Employee ID", employee?.employeeId)}
            {renderInfoRow("Designation", employee?.role?.name)}
            {renderInfoRow("Department", employee?.department?.name)}
            <div className="h-4" />
            {renderInfoRow("Last Name", employee?.lastName)}
            {renderInfoRow("First Name", employee?.firstName)}
            {renderInfoRow("Middle Name", employee?.middleName)}
            {renderInfoRow("Suffix", "--")}
            {renderInfoRow("Sex", employee?.gender)}
            {renderInfoRow("Civil Status", employee?.civilStatus)}
            <div className="h-4" />
            {renderInfoRow("Employment Status", employee?.employmentStatus)}
            {renderInfoRow("Date Hired", formatDate(employee?.dateHired))}
            {renderInfoRow("Regularization Date", formatDate(employee?.regularizationDate))}
            {renderInfoRow("Current State", employee?.isActive ? "Active" : "Inactive")}
          </div>
        )}
      </div>
    </div>
  );

  const renderOtherInfo = () => (
    <div className="space-y-0">
      <div className="bg-amber-600 text-white px-6 py-3 font-semibold text-sm">
        OTHER INFORMATION
      </div>
      <div className="bg-white p-6">
        {editing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderEditableField("Date of Birth", "dateOfBirth", "date")}
            {renderEditableField("Place of Birth", "placeOfBirth")}
            {renderEditableField("Nationality", "nationality")}
          </div>
        ) : (
          <div>
            {renderInfoRow("Date of Birth", formatDate(employee?.dateOfBirth))}
            {renderInfoRow("Place of Birth", employee?.placeOfBirth)}
            {renderInfoRow("Nationality", employee?.nationality)}
            {renderInfoRow("Employment Type", employee?.employmentType)}
          </div>
        )}
      </div>
    </div>
  );

  const renderAddressContact = () => (
    <div className="space-y-0">
      <div className="bg-amber-600 text-white px-6 py-3 font-semibold text-sm">
        ADDRESS & CONTACT INFORMATION
      </div>
      <div className="bg-white p-6">
        {editing ? (
          <div className="grid grid-cols-1 gap-6">
            {renderEditableField("Mobile Number", "mobileNumber")}
            {renderEditableField("Current Address", "currentAddress", "textarea")}
            {renderEditableField("Permanent Address", "permanentAddress", "textarea")}
            <div className="border-t pt-4 mt-4">
              <h4 className="font-semibold text-gray-700 mb-4">Emergency Contact</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {renderEditableField("Contact Name", "emergencyContactName")}
                {renderEditableField("Relationship", "emergencyContactRelation")}
                {renderEditableField("Contact Number", "emergencyContactNumber")}
              </div>
            </div>
          </div>
        ) : (
          <div>
            {renderInfoRow("Mobile Number", employee?.mobileNumber)}
            {renderInfoRow("Current Address", employee?.currentAddress)}
            {renderInfoRow("Permanent Address", employee?.permanentAddress)}
            <div className="h-4" />
            <div className="font-semibold text-gray-700 py-3 border-b border-gray-200">
              Emergency Contact
            </div>
            {renderInfoRow("Contact Name", employee?.emergencyContactName)}
            {renderInfoRow("Relationship", employee?.emergencyContactRelation)}
            {renderInfoRow("Contact Number", employee?.emergencyContactNumber)}
          </div>
        )}
      </div>
    </div>
  );

  const renderPayrollInfo = () => (
    <div className="space-y-0">
      <div className="bg-amber-600 text-white px-6 py-3 font-semibold text-sm">
        PAYROLL INFORMATION
      </div>
      <div className="bg-white p-6">
        {editing ? (
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold text-gray-700 mb-4">Basic Salary</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderEditableField("Basic Monthly Salary (₱)", "basicSalary", "number")}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="font-semibold text-gray-700 mb-4">Government IDs</h4>
                <div className="space-y-4">
                  {renderEditableField("SSS Number", "sssNumber")}
                  {renderEditableField("PhilHealth Number", "philHealthNumber")}
                  {renderEditableField("Pag-IBIG Number", "pagIbigNumber")}
                  {renderEditableField("TIN", "tinNumber")}
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-700 mb-4">Bank Details</h4>
                <div className="space-y-4">
                  {renderEditableField("Bank Name", "bankName")}
                  {renderEditableField("Account Number", "bankAccountNumber")}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold text-gray-700 mb-4">Basic Salary</h4>
              {renderInfoRow("Basic Monthly Salary", formatCurrency(employee?.basicSalary ?? 0))}
              {renderInfoRow("Daily Rate", formatCurrency((employee?.basicSalary ?? 0) / 22))}
              {renderInfoRow("Hourly Rate", formatCurrency((employee?.basicSalary ?? 0) / 22 / 8))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="font-semibold text-gray-700 mb-4">Government IDs</h4>
                {renderInfoRow("SSS Number", employee?.sssNumber)}
                {renderInfoRow("PhilHealth Number", employee?.philHealthNumber)}
                {renderInfoRow("Pag-IBIG Number", employee?.pagIbigNumber)}
                {renderInfoRow("TIN", employee?.tinNumber)}
              </div>
              <div>
                <h4 className="font-semibold text-gray-700 mb-4">Bank Details</h4>
                {renderInfoRow("Bank Name", employee?.bankName)}
                {renderInfoRow("Account Number", employee?.bankAccountNumber)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderWorkSchedule = () => (
    <div className="space-y-0">
      <div className="bg-amber-600 text-white px-6 py-3 font-semibold text-sm">
        WORK SCHEDULE
      </div>
      <div className="bg-white p-6">
        {schedules.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No work schedule assigned</p>
        ) : (
          <div className="space-y-4">
            {schedules.map((schedule: any) => (
              <Card key={schedule?.id}>
                <CardHeader className="py-3">
                  <CardTitle className="text-base">
                    {schedule?.workSchedule?.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Effective From:</span>
                      <p className="font-medium">{formatDate(schedule?.effectiveFrom)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Effective To:</span>
                      <p className="font-medium">{schedule?.effectiveTo ? formatDate(schedule.effectiveTo) : "Present"}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Break:</span>
                      <p className="font-medium">{schedule?.workSchedule?.breakMinutes} mins</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Grace Period:</span>
                      <p className="font-medium">{schedule?.workSchedule?.lateGracePeriod} mins</p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-7 gap-2 text-center text-xs">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => {
                      const dayKey = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"][i];
                      const start = schedule?.workSchedule?.[`${dayKey}Start`];
                      const end = schedule?.workSchedule?.[`${dayKey}End`];
                      return (
                        <div key={day} className="bg-gray-50 p-2 rounded">
                          <p className="font-semibold text-gray-700">{day}</p>
                          {start && end ? (
                            <p className="text-gray-600">{start} - {end}</p>
                          ) : (
                            <p className="text-gray-400">Rest Day</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderAttendance = () => (
    <div className="space-y-0">
      <div className="bg-amber-600 text-white px-6 py-3 font-semibold text-sm">
        ATTENDANCE RECORDS
      </div>
      <div className="bg-white">
        {attendances.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No attendance records found</p>
        ) : (
          <div className="overflow-x-auto"><Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Clock In</TableHead>
                <TableHead>Clock Out</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>OT</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendances.map((att: any) => (
                <TableRow key={att?.id}>
                  <TableCell>{formatDate(att?.date)}</TableCell>
                  <TableCell>{att?.clockIn ? new Date(att.clockIn).toLocaleTimeString() : "--"}</TableCell>
                  <TableCell>{att?.clockOut ? new Date(att.clockOut).toLocaleTimeString() : "--"}</TableCell>
                  <TableCell>{att?.totalHours?.toFixed(2) ?? "--"}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(att?.status)}>{att?.status}</Badge>
                  </TableCell>
                  <TableCell>{att?.overtimeMinutes ? `${(att.overtimeMinutes / 60).toFixed(1)}h` : "--"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table></div>
        )}
      </div>
    </div>
  );

  const renderLeaveManagement = () => (
    <div className="space-y-4">
      <div className="bg-amber-600 text-white px-6 py-3 font-semibold text-sm">
        LEAVE MANAGEMENT
      </div>
      
      {/* Leave Balances */}
      <div className="bg-white p-6">
        <h4 className="font-semibold text-gray-700 mb-4">Leave Balances ({new Date().getFullYear()})</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {(employee?.leaveBalances ?? []).map((b: any) => (
            <div key={b?.id ?? Math.random()} className="p-4 bg-amber-50 rounded-lg text-center border border-amber-100">
              <p className="text-sm text-amber-700 font-medium">{getLeaveTypeLabel(b?.leaveType ?? "")}</p>
              <p className="text-2xl font-bold text-gray-900">
                {((b?.balance ?? 0) - (b?.used ?? 0)).toFixed(1)}
              </p>
              <p className="text-xs text-gray-500">
                {b?.used ?? 0} used of {b?.balance ?? 0}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Leave History */}
      <div className="bg-white">
        <div className="px-6 py-3 border-b border-gray-200 font-semibold text-gray-700">
          Leave History
        </div>
        {leaves.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No leave records found</p>
        ) : (
          <div className="overflow-x-auto"><Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaves.map((leave: any) => (
                <TableRow key={leave?.id}>
                  <TableCell>{getLeaveTypeLabel(leave?.leaveType)}</TableCell>
                  <TableCell>{formatDate(leave?.startDate)}</TableCell>
                  <TableCell>{formatDate(leave?.endDate)}</TableCell>
                  <TableCell>{leave?.totalDays}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(leave?.status)}>{leave?.status}</Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{leave?.reason}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table></div>
        )}
      </div>
    </div>
  );

  const renderDocuments = () => (
    <div className="space-y-0">
      <div className="bg-amber-600 text-white px-6 py-3 font-semibold text-sm flex items-center justify-between">
        <span>DOCUMENTS</span>
        {canEdit && (
          <div>
            <input
              type="file"
              id="docUpload"
              className="hidden"
              onChange={handleDocumentUpload}
            />
            <label htmlFor="docUpload">
              <span className="cursor-pointer flex items-center gap-2 bg-white/20 hover:bg-white/30 px-3 py-1 rounded text-sm">
                <Upload className="h-4 w-4" />
                Upload
              </span>
            </label>
          </div>
        )}
      </div>
      <div className="bg-white p-6">
        {(employee?.documents ?? []).length === 0 ? (
          <p className="text-gray-500 text-center py-8">No documents uploaded</p>
        ) : (
          <div className="space-y-2">
            {(employee?.documents ?? []).map((doc: any) => (
              <div
                key={doc?.id ?? Math.random()}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-amber-500" />
                  <div>
                    <p className="font-medium text-gray-900">{doc?.name ?? ""}</p>
                    <p className="text-sm text-gray-500">{formatDate(doc?.uploadedAt)}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderGeolocation = () => (
    <div className="space-y-0">
      <div className="bg-amber-600 text-white px-6 py-3 font-semibold text-sm">
        GEOLOCATION
      </div>
      <div className="bg-white p-6 space-y-6">
        {/* Enable Toggle */}
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-gray-700">Enable geolocation for this employee</span>
          <button
            onClick={() => setGeoEnabled(!geoEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              geoEnabled ? "bg-teal-500" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                geoEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
          <span className="text-sm ml-2">{geoEnabled ? "On" : "Off"}</span>
        </div>

        {geoEnabled && (
          <>
            {/* Location Name */}
            <div className="grid grid-cols-3 items-center py-2">
              <Label className="text-sm font-medium text-amber-700 uppercase">Location Name</Label>
              <div className="col-span-2">
                <Input
                  value={geoLocationName}
                  onChange={(e) => setGeoLocationName(e.target.value)}
                  placeholder="e.g., Belina St. Phase I St. Jude Sub. Lucena City"
                  className="bg-gray-50"
                />
              </div>
            </div>

            {/* Map Coordinates */}
            <div className="grid grid-cols-3 items-center py-2">
              <Label className="text-sm font-medium text-amber-700 uppercase">Map Coordinates</Label>
              <div className="col-span-2 grid grid-cols-2 gap-4">
                <Input
                  type="number"
                  step="0.000001"
                  value={geoLatitude ?? ""}
                  onChange={(e) => setGeoLatitude(e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="Latitude (e.g., 13.9379)"
                  className="bg-gray-50"
                />
                <Input
                  type="number"
                  step="0.000001"
                  value={geoLongitude ?? ""}
                  onChange={(e) => setGeoLongitude(e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="Longitude (e.g., 121.6273)"
                  className="bg-gray-50"
                />
              </div>
            </div>

            {/* Radius */}
            <div className="grid grid-cols-3 items-center py-2">
              <Label className="text-sm font-medium text-amber-700 uppercase">Radius</Label>
              <div className="col-span-2 flex items-center gap-4">
                <Input
                  type="number"
                  step="0.01"
                  min="0.1"
                  max="5"
                  value={geoRadius}
                  onChange={(e) => setGeoRadius(parseFloat(e.target.value) || 0.5)}
                  className="w-20 bg-gray-50"
                />
                <span className="text-sm text-gray-500">km</span>
                <input
                  type="range"
                  min="0.1"
                  max="2"
                  step="0.05"
                  value={geoRadius}
                  onChange={(e) => setGeoRadius(parseFloat(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-500"
                />
              </div>
            </div>

            {/* Map Preview */}
            <div className="mt-4">
              <div className="relative w-full h-80 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                {geoLatitude && geoLongitude ? (
                  <GeofenceMap
                    latitude={geoLatitude}
                    longitude={geoLongitude}
                    radiusKm={geoRadius}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <div className="text-center">
                      <MapPin className="h-12 w-12 mx-auto mb-2" />
                      <p>Enter coordinates to preview location on map</p>
                    </div>
                  </div>
                )}
                {geoLatitude && geoLongitude && (
                  <div className="absolute top-2 left-2 bg-white/90 px-3 py-1 rounded shadow text-sm z-[1000]">
                    <span className="text-gray-600">Radius: </span>
                    <span className="font-semibold text-teal-600">{geoRadius} km</span>
                  </div>
                )}
              </div>
            </div>

            {/* Save Button */}
            {canEdit && (
              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleSaveGeolocation}
                  disabled={savingGeo}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {savingGeo ? "Saving..." : "Save Geolocation Settings"}
                </Button>
              </div>
            )}
          </>
        )}

        {/* Recent Clock-In Locations Table */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="font-semibold text-gray-700 mb-4">Recent Clock-In Locations</h4>
          <div className="overflow-x-auto"><Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Clock In Location</TableHead>
                <TableHead>Clock Out Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendances.slice(0, 5).map((att: any) => (
                <TableRow key={att?.id}>
                  <TableCell>{formatDate(att?.date)}</TableCell>
                  <TableCell>
                    {att?.clockInLat && att?.clockInLong
                      ? `${att.clockInLat.toFixed(6)}, ${att.clockInLong.toFixed(6)}`
                      : "--"}
                  </TableCell>
                  <TableCell>
                    {att?.clockOutLat && att?.clockOutLong
                      ? `${att.clockOutLat.toFixed(6)}, ${att.clockOutLong.toFixed(6)}`
                      : "--"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table></div>
        </div>
      </div>
    </div>
  );

  const renderPayslip = () => (
    <div className="space-y-0">
      <div className="bg-amber-600 text-white px-6 py-3 font-semibold text-sm">
        PAYSLIP RECORDS
      </div>
      <div className="bg-white">
        {payslips.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No payslip records found</p>
        ) : (
          <div className="divide-y divide-gray-200">
            {payslips.map((payslip: any) => (
              <div key={payslip?.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {payslip?.payrollPeriod?.periodType === "FIRST_HALF" ? "1st Half" : "2nd Half"} - {payslip?.payrollPeriod?.month}/{payslip?.payrollPeriod?.year}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {formatDate(payslip?.payrollPeriod?.startDate)} - {formatDate(payslip?.payrollPeriod?.endDate)}
                    </p>
                  </div>
                  <Badge className={getStatusColor(payslip?.payrollPeriod?.status)}>
                    {payslip?.payrollPeriod?.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-green-50 p-3 rounded">
                    <p className="text-xs text-gray-500">Total Gross</p>
                    <p className="font-bold text-green-700">{formatCurrency(payslip?.grossEarnings)}</p>
                  </div>
                  <div className="bg-red-50 p-3 rounded">
                    <p className="text-xs text-gray-500">Total Deductions</p>
                    <p className="font-bold text-red-700">{formatCurrency(payslip?.totalDeductions)}</p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded">
                    <p className="text-xs text-gray-500">Net Pay</p>
                    <p className="font-bold text-blue-700">{formatCurrency(payslip?.netPay)}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs text-gray-500">Days Worked</p>
                    <p className="font-bold text-gray-700">{payslip?.daysWorked}</p>
                  </div>
                </div>
                
                {/* Detailed Breakdown */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                  <div>
                    <h5 className="font-semibold text-gray-700 mb-2">Earnings</h5>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Basic Pay</span>
                        <span>{formatCurrency(payslip?.basicPay)}</span>
                      </div>
                      {payslip?.overtimePay > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Overtime Pay</span>
                          <span>{formatCurrency(payslip?.overtimePay)}</span>
                        </div>
                      )}
                      {payslip?.holidayPay > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Holiday Pay</span>
                          <span>{formatCurrency(payslip?.holidayPay)}</span>
                        </div>
                      )}
                      {payslip?.nightDiffPay > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Night Differential</span>
                          <span>{formatCurrency(payslip?.nightDiffPay)}</span>
                        </div>
                      )}
                      {(payslip?.mobileAllowance + payslip?.performancePay + payslip?.otherAllowances) > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Allowances</span>
                          <span>{formatCurrency((payslip?.mobileAllowance ?? 0) + (payslip?.performancePay ?? 0) + (payslip?.otherAllowances ?? 0))}</span>
                        </div>
                      )}
                      {(payslip?.employerSSS + payslip?.employerPhilHealth + payslip?.employerPagIbig) > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Employer Contributions</span>
                          <span>{formatCurrency((payslip?.employerSSS ?? 0) + (payslip?.employerPhilHealth ?? 0) + (payslip?.employerPagIbig ?? 0))}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <h5 className="font-semibold text-gray-700 mb-2">Deductions</h5>
                    <div className="space-y-1">
                      {payslip?.sssDeduction > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">SSS</span>
                          <span className="text-red-600">-{formatCurrency(payslip?.sssDeduction)}</span>
                        </div>
                      )}
                      {payslip?.philHealthDeduction > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">PhilHealth</span>
                          <span className="text-red-600">-{formatCurrency(payslip?.philHealthDeduction)}</span>
                        </div>
                      )}
                      {payslip?.pagIbigDeduction > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Pag-IBIG</span>
                          <span className="text-red-600">-{formatCurrency(payslip?.pagIbigDeduction)}</span>
                        </div>
                      )}

                      {payslip?.loanDeductions > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Loan Deductions</span>
                          <span className="text-red-600">-{formatCurrency(payslip?.loanDeductions)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case "basic-info":
        return renderBasicInfo();
      case "other-info":
        return renderOtherInfo();
      case "address-contact":
        return renderAddressContact();
      case "payroll-info":
        return renderPayrollInfo();
      case "work-schedule":
        return renderWorkSchedule();
      case "attendance":
        return renderAttendance();
      case "leave-management":
        return renderLeaveManagement();
      case "documents":
        return renderDocuments();
      case "geolocation":
        return renderGeolocation();
      case "payslip":
        return renderPayslip();
      default:
        return renderBasicInfo();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/employees" className="hover:text-amber-600">
            <Home className="h-4 w-4" />
          </Link>
          <span>/</span>
          <Link href="/employees" className="hover:text-amber-600">Employees</Link>
          <span>/</span>
          <span className="text-gray-900">Basic Information</span>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            {editing ? (
              <>
                <Button variant="outline" onClick={() => setEditing(false)}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving} className="bg-amber-600 hover:bg-amber-700">
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Saving..." : "Save"}
                </Button>
              </>
            ) : (
              <Button onClick={() => setEditing(true)} className="bg-amber-600 hover:bg-amber-700">
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
          </div>
        )}
      </div>

      <h1 className="text-2xl font-bold text-gray-900">EMPLOYEE PROFILE</h1>

      {/* Main Layout */}
      <div className="flex gap-0 border border-gray-200 rounded-lg overflow-hidden min-h-[600px]">
        {renderProfileSidebar()}
        <div className="flex-1 bg-gray-50">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}