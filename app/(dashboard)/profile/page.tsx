"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { User, Lock, Save } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const { data: session } = useSession() || {};
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    mobileNumber: "",
    currentAddress: "",
    permanentAddress: "",
    emergencyContactName: "",
    emergencyContactRelation: "",
    emergencyContactNumber: "",
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [changingPassword, setChangingPassword] = useState(false);

  const employeeId = (session?.user as any)?.employeeId;

  useEffect(() => {
    if (employeeId) {
      fetchEmployee();
    } else {
      setLoading(false);
    }
  }, [employeeId]);

  const fetchEmployee = async () => {
    try {
      const res = await fetch(`/api/employees/${employeeId}`);
      const data = await res.json();
      setEmployee(data?.employee ?? null);
      setFormData({
        mobileNumber: data?.employee?.mobileNumber ?? "",
        currentAddress: data?.employee?.currentAddress ?? "",
        permanentAddress: data?.employee?.permanentAddress ?? "",
        emergencyContactName: data?.employee?.emergencyContactName ?? "",
        emergencyContactRelation: data?.employee?.emergencyContactRelation ?? "",
        emergencyContactNumber: data?.employee?.emergencyContactNumber ?? "",
      });
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success("Profile updated successfully");
        fetchEmployee();
      } else {
        toast.error("Failed to update profile");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      if (res.ok) {
        toast.success("Password changed successfully");
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        const data = await res.json();
        toast.error(data?.message ?? "Failed to change password");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setChangingPassword(false);
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

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-lg sm:text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-500">View and update your personal information</p>
      </div>

      {/* Profile Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <CardTitle>{session?.user?.name ?? "User"}</CardTitle>
              <CardDescription>{session?.user?.email ?? ""}</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Editable Contact Info */}
      {employee && (
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>Update your contact details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Mobile Number</Label>
              <Input
                value={formData.mobileNumber}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, mobileNumber: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Current Address</Label>
              <Textarea
                value={formData.currentAddress}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, currentAddress: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Permanent Address</Label>
              <Textarea
                value={formData.permanentAddress}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, permanentAddress: e.target.value }))
                }
              />
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-medium mb-4">Emergency Contact</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Contact Name</Label>
                  <Input
                    value={formData.emergencyContactName}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        emergencyContactName: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Relationship</Label>
                  <Input
                    value={formData.emergencyContactRelation}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        emergencyContactRelation: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contact Number</Label>
                  <Input
                    value={formData.emergencyContactNumber}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        emergencyContactNumber: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Change Password
          </CardTitle>
          <CardDescription>Update your account password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Current Password</Label>
            <Input
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) =>
                setPasswordData((prev) => ({ ...prev, currentPassword: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>New Password</Label>
            <Input
              type="password"
              value={passwordData.newPassword}
              onChange={(e) =>
                setPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Confirm New Password</Label>
            <Input
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) =>
                setPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }))
              }
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleChangePassword} disabled={changingPassword}>
              {changingPassword ? "Changing..." : "Change Password"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}