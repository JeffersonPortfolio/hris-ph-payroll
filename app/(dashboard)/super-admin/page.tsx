"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  Plus,
  Users,
  Shield,
  Activity,
  Eye,
  ToggleLeft,
  ToggleRight,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/use-toast";

interface Company {
  id: string;
  name: string;
  contactEmail: string | null;
  contactPhone: string | null;
  employeeLimit: number;
  subscriptionStatus: string;
  subscriptionType: string;
  isDemo: boolean;
  demoExpiresAt: string | null;
  createdAt: string;
  _count: {
    users: number;
    employees: number;
  };
}

export default function SuperAdminPage() {
  const { data: session, update: updateSession } = useSession();
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    company: Company | null;
    action: "activate" | "deactivate";
  }>({ open: false, company: null, action: "activate" });

  const user = session?.user as any;

  useEffect(() => {
    if (user?.role !== "SUPER_ADMIN") {
      router.push("/dashboard");
      return;
    }
    fetchCompanies();
  }, [user]);

  async function fetchCompanies() {
    try {
      const res = await fetch("/api/super-admin/companies");
      const data = await res.json();
      if (res.ok) {
        setCompanies(data.companies);
      }
    } catch (error) {
      console.error("Failed to fetch companies:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleStatus(company: Company, action: "activate" | "deactivate") {
    try {
      const res = await fetch(`/api/super-admin/companies/${company.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (res.ok) {
        toast({
          title: "Success",
          description: `Company ${action}d successfully`,
        });
        fetchCompanies();
      } else {
        const data = await res.json();
        toast({
          title: "Error",
          description: data.message || "Failed to update company",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update company",
        variant: "destructive",
      });
    }
    setActionDialog({ open: false, company: null, action: "activate" });
  }

  async function handleImpersonate(company: Company) {
    try {
      const res = await fetch("/api/super-admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: company.id }),
      });

      if (res.ok) {
        const data = await res.json();
        // Update session with impersonated company
        await updateSession({
          impersonatedCompanyId: data.companyId,
          impersonatedCompanyName: data.companyName,
        });
        toast({
          title: "Impersonation Active",
          description: `Now viewing as ${company.name}`,
        });
        router.push("/dashboard");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to impersonate company",
        variant: "destructive",
      });
    }
  }

  function getStatusBadge(status: string) {
    const variants: Record<string, string> = {
      ACTIVE: "bg-green-100 text-green-800",
      TRIAL: "bg-blue-100 text-blue-800",
      INACTIVE: "bg-gray-100 text-gray-800",
      EXPIRED: "bg-red-100 text-red-800",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${variants[status] || "bg-gray-100 text-gray-800"}`}>
        {status}
      </span>
    );
  }

  function getTypeBadge(type: string) {
    const variants: Record<string, string> = {
      TRIAL: "bg-blue-50 text-blue-700 border-blue-200",
      BASIC: "bg-gray-50 text-gray-700 border-gray-200",
      PREMIUM: "bg-purple-50 text-purple-700 border-purple-200",
      ENTERPRISE: "bg-amber-50 text-amber-700 border-amber-200",
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium border ${variants[type] || ""}`}>
        {type}
      </span>
    );
  }

  const activeCompanies = companies.filter((c) => c.subscriptionStatus === "ACTIVE").length;
  const trialCompanies = companies.filter((c) => c.subscriptionStatus === "TRIAL").length;
  const totalEmployees = companies.reduce((acc, c) => acc + c._count.employees, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Super Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage all companies and their subscriptions
          </p>
        </div>
        <Link href="/super-admin/companies/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Company
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companies.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeCompanies}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trial</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{trialCompanies}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEmployees}</div>
          </CardContent>
        </Card>
      </div>

      {/* Companies Table */}
      <Card>
        <CardHeader>
          <CardTitle>Companies</CardTitle>
          <CardDescription>All registered companies and their status</CardDescription>
        </CardHeader>
        <CardContent>
          {companies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No companies yet. Create your first company to get started.</p>
              <Link href="/super-admin/companies/new">
                <Button className="mt-4" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Company
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Employees</TableHead>
                  <TableHead>Limit</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell className="font-medium">
                      {company.name}
                      {company.isDemo && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          DEMO
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{getTypeBadge(company.subscriptionType)}</TableCell>
                    <TableCell>{getStatusBadge(company.subscriptionStatus)}</TableCell>
                    <TableCell>{company._count.employees}</TableCell>
                    <TableCell>{company.employeeLimit}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {company.contactEmail && (
                          <div className="text-muted-foreground">{company.contactEmail}</div>
                        )}
                        {company.contactPhone && (
                          <div className="text-muted-foreground">{company.contactPhone}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(company.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleImpersonate(company)}
                          title="Login as this company"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {company.subscriptionStatus === "ACTIVE" || company.subscriptionStatus === "TRIAL" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setActionDialog({
                                open: true,
                                company,
                                action: "deactivate",
                              })
                            }
                            title="Deactivate"
                          >
                            <ToggleRight className="h-4 w-4 text-green-600" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setActionDialog({
                                open: true,
                                company,
                                action: "activate",
                              })
                            }
                            title="Activate"
                          >
                            <ToggleLeft className="h-4 w-4 text-gray-400" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Confirm Action Dialog */}
      <AlertDialog
        open={actionDialog.open}
        onOpenChange={(open) =>
          setActionDialog({ ...actionDialog, open })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionDialog.action === "activate" ? "Activate" : "Deactivate"} Company
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {actionDialog.action}{" "}
              <strong>{actionDialog.company?.name}</strong>?
              {actionDialog.action === "deactivate" &&
                " Users from this company will not be able to log in."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                actionDialog.company &&
                handleToggleStatus(actionDialog.company, actionDialog.action)
              }
              className={
                actionDialog.action === "deactivate"
                  ? "bg-red-600 hover:bg-red-700"
                  : ""
              }
            >
              {actionDialog.action === "activate" ? "Activate" : "Deactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
