"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Mail,
  Phone,
  Users,
  CreditCard,
  Shield,
  Image,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/use-toast";

interface CompanyInfo {
  id: string;
  name: string;
  contactEmail: string | null;
  contactPhone: string | null;
  employeeLimit: number;
  subscriptionStatus: string;
  subscriptionType: string;
  isDemo: boolean;
  demoExpiresAt: string | null;
  _count: {
    employees: number;
    users: number;
    departments: number;
  };
}

export default function CompanySettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    name: "",
    contactEmail: "",
    contactPhone: "",
  });

  const user = session?.user as any;

  useEffect(() => {
    fetchCompany();
  }, []);

  async function fetchCompany() {
    try {
      const res = await fetch("/api/company");
      if (res.ok) {
        const data = await res.json();
        setCompany(data.company);
        setForm({
          name: data.company.name || "",
          contactEmail: data.company.contactEmail || "",
          contactPhone: data.company.contactPhone || "",
        });
      }
    } catch (error) {
      console.error("Failed to fetch company:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        toast({
          title: "Success",
          description: "Company information updated successfully",
        });
        setEditMode(false);
        fetchCompany();
      } else {
        const data = await res.json();
        toast({
          title: "Error",
          description: data.message || "Failed to update",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update company",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800";
      case "TRIAL":
        return "bg-blue-100 text-blue-800";
      case "INACTIVE":
        return "bg-gray-100 text-gray-800";
      case "EXPIRED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="text-center py-12">
        <Building2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
        <h2 className="text-xl font-semibold">No Company Found</h2>
        <p className="text-muted-foreground mt-2">
          Your account is not associated with any company. Contact your super admin.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary" />
          Company Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          View and manage your company information
        </p>
      </div>

      {/* Company Info Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Company Information</CardTitle>
            <CardDescription>Basic details about your company</CardDescription>
          </div>
          {(user?.role === "ADMIN" || user?.role === "SUPER_ADMIN") && (
            <Button
              variant={editMode ? "outline" : "default"}
              size="sm"
              onClick={() => setEditMode(!editMode)}
            >
              {editMode ? "Cancel" : "Edit"}
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {editMode ? (
            <>
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contact Email</Label>
                  <Input
                    type="email"
                    value={form.contactEmail}
                    onChange={(e) =>
                      setForm({ ...form, contactEmail: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contact Phone</Label>
                  <Input
                    value={form.contactPhone}
                    onChange={(e) =>
                      setForm({ ...form, contactPhone: e.target.value })
                    }
                  />
                </div>
              </div>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{company.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{company.contactEmail || "Not set"}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{company.contactPhone || "Not set"}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subscription Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Subscription
          </CardTitle>
          <CardDescription>Your current plan and usage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Plan</p>
              <p className="text-lg font-semibold">{company.subscriptionType}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(company.subscriptionStatus)}`}>
                {company.subscriptionStatus}
              </span>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Employees</p>
              <p className="text-lg font-semibold">
                {company._count.employees}{" "}
                <span className="text-sm text-muted-foreground font-normal">
                  / {company.employeeLimit}
                </span>
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Users</p>
              <p className="text-lg font-semibold">{company._count.users}</p>
            </div>
          </div>

          {company.isDemo && company.demoExpiresAt && (
            <>
              <Separator className="my-4" />
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Demo Account:</strong> Your trial expires on{" "}
                  {new Date(company.demoExpiresAt).toLocaleDateString()}. Contact
                  sales to upgrade your plan.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Logo Upload Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Branding
          </CardTitle>
          <CardDescription>Customize your company branding</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
            <Image className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Logo Upload</p>
            <p className="text-sm mt-1">Coming soon — upload your company logo for white-label branding</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
