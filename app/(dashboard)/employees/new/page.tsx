"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, UserPlus } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function NewEmployeePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [createAccount, setCreateAccount] = useState(true);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    middleName: "",
    email: "",
    mobileNumber: "",
    dateOfBirth: "",
    gender: "",
    civilStatus: "",
    nationality: "Filipino",
    placeOfBirth: "",
    currentAddress: "",
    permanentAddress: "",
    emergencyContactName: "",
    emergencyContactRelation: "",
    emergencyContactNumber: "",
    departmentId: "",
    roleId: "",
    employmentType: "FULL_TIME",
    employmentStatus: "PROBATIONARY",
    dateHired: new Date().toISOString().split("T")[0],
    regularizationDate: "",
    sssNumber: "",
    philHealthNumber: "",
    pagIbigNumber: "",
    tinNumber: "",
    bankName: "",
    bankAccountNumber: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [deptRes, roleRes] = await Promise.all([
          fetch("/api/departments"),
          fetch("/api/roles"),
        ]);
        const [deptData, roleData] = await Promise.all([
          deptRes.json(),
          roleRes.json(),
        ]);
        setDepartments(deptData?.departments ?? []);
        setRoles(roleData?.roles ?? []);
      } catch (error) {
        console.error("Fetch error:", error);
      }
    };
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          createUserAccount: createAccount,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        console.log("Employee creation response:", data);
        
        if (data.tempPassword) {
          if (data.emailSent === false) {
            // Show password in alert so user can copy it
            alert(`Employee created!\n\nEmail could not be sent.\n\nTemporary Password: ${data.tempPassword}\n\nPlease copy this password and share it with the employee.`);
            toast.success("Employee created! Check the alert for temporary password.", { duration: 5000 });
          } else {
            toast.success("Employee created! Welcome email sent successfully.", { duration: 3000 });
          }
        } else {
          toast.success("Employee created successfully!", { duration: 3000 });
        }
        
        // Delay redirect to ensure toast is visible
        setTimeout(() => {
          router.push("/employees");
        }, 1500);
      } else {
        toast.error(data?.message ?? "Failed to create employee");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/employees">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add New Employee</h1>
          <p className="text-gray-500">Create a new employee record</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Basic personal details of the employee</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleChange("firstName", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="middleName">Middle Name</Label>
              <Input
                id="middleName"
                value={formData.middleName}
                onChange={(e) => handleChange("middleName", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleChange("lastName", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mobileNumber">Mobile Number</Label>
              <Input
                id="mobileNumber"
                value={formData.mobileNumber}
                onChange={(e) => handleChange("mobileNumber", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => handleChange("dateOfBirth", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select value={formData.gender} onValueChange={(v) => handleChange("gender", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Civil Status</Label>
              <Select value={formData.civilStatus} onValueChange={(v) => handleChange("civilStatus", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SINGLE">Single</SelectItem>
                  <SelectItem value="MARRIED">Married</SelectItem>
                  <SelectItem value="WIDOWED">Widowed</SelectItem>
                  <SelectItem value="SEPARATED">Separated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nationality">Nationality</Label>
              <Input
                id="nationality"
                value={formData.nationality}
                onChange={(e) => handleChange("nationality", e.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="currentAddress">Current Address</Label>
              <Textarea
                id="currentAddress"
                value={formData.currentAddress}
                onChange={(e) => handleChange("currentAddress", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Employment Details */}
        <Card>
          <CardHeader>
            <CardTitle>Employment Details</CardTitle>
            <CardDescription>Job-related information</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={formData.departmentId} onValueChange={(v) => handleChange("departmentId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {(departments ?? []).map((d: any) => (
                    <SelectItem key={d?.id ?? ""} value={d?.id ?? ""}>
                      {d?.name ?? ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Position/Role</Label>
              <Select value={formData.roleId} onValueChange={(v) => handleChange("roleId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {(roles ?? []).map((r: any) => (
                    <SelectItem key={r?.id ?? ""} value={r?.id ?? ""}>
                      {r?.name ?? ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Employment Type</Label>
              <Select value={formData.employmentType} onValueChange={(v) => handleChange("employmentType", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FULL_TIME">Full-time</SelectItem>
                  <SelectItem value="PART_TIME">Part-time</SelectItem>
                  <SelectItem value="CONTRACT">Contract</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Employment Status</Label>
              <Select value={formData.employmentStatus} onValueChange={(v) => handleChange("employmentStatus", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PROBATIONARY">Probationary</SelectItem>
                  <SelectItem value="REGULAR">Regular</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateHired">Date Hired *</Label>
              <Input
                id="dateHired"
                type="date"
                value={formData.dateHired}
                onChange={(e) => handleChange("dateHired", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="regularizationDate">Regularization Date</Label>
              <Input
                id="regularizationDate"
                type="date"
                value={formData.regularizationDate}
                onChange={(e) => handleChange("regularizationDate", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Government IDs */}
        <Card>
          <CardHeader>
            <CardTitle>Government IDs & Bank Details</CardTitle>
            <CardDescription>Required identification numbers</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sssNumber">SSS Number</Label>
              <Input
                id="sssNumber"
                value={formData.sssNumber}
                onChange={(e) => handleChange("sssNumber", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="philHealthNumber">PhilHealth Number</Label>
              <Input
                id="philHealthNumber"
                value={formData.philHealthNumber}
                onChange={(e) => handleChange("philHealthNumber", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pagIbigNumber">Pag-IBIG Number</Label>
              <Input
                id="pagIbigNumber"
                value={formData.pagIbigNumber}
                onChange={(e) => handleChange("pagIbigNumber", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tinNumber">TIN</Label>
              <Input
                id="tinNumber"
                value={formData.tinNumber}
                onChange={(e) => handleChange("tinNumber", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankName">Bank Name</Label>
              <Input
                id="bankName"
                value={formData.bankName}
                onChange={(e) => handleChange("bankName", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankAccountNumber">Bank Account Number</Label>
              <Input
                id="bankAccountNumber"
                value={formData.bankAccountNumber}
                onChange={(e) => handleChange("bankAccountNumber", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contact */}
        <Card>
          <CardHeader>
            <CardTitle>Emergency Contact</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="emergencyContactName">Contact Name</Label>
              <Input
                id="emergencyContactName"
                value={formData.emergencyContactName}
                onChange={(e) => handleChange("emergencyContactName", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergencyContactRelation">Relationship</Label>
              <Input
                id="emergencyContactRelation"
                value={formData.emergencyContactRelation}
                onChange={(e) => handleChange("emergencyContactRelation", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergencyContactNumber">Contact Number</Label>
              <Input
                id="emergencyContactNumber"
                value={formData.emergencyContactNumber}
                onChange={(e) => handleChange("emergencyContactNumber", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Account Creation */}
        <Card>
          <CardHeader>
            <CardTitle>System Access</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="createAccount"
                checked={createAccount}
                onCheckedChange={(checked) => setCreateAccount(checked as boolean)}
              />
              <Label htmlFor="createAccount" className="cursor-pointer">
                Create user account for this employee (login credentials will be sent via email)
              </Label>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Link href="/employees">
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={loading}>
            <UserPlus className="mr-2 h-4 w-4" />
            {loading ? "Creating..." : "Create Employee"}
          </Button>
        </div>
      </form>
    </div>
  );
}