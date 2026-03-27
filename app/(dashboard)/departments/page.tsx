"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "@/components/ui/dialog";
import { Building2, Plus, Edit, Trash2, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import toast from "react-hot-toast";

export default function DepartmentsPage() {
  const { data: session } = useSession() || {};
  const [departments, setDepartments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    headId: "",
  });

  const userRole = (session?.user as any)?.role;
  const canManage = userRole === "ADMIN" || userRole === "HR";

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/departments");
      const data = await res.json();
      setDepartments(data?.departments ?? []);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/employees?limit=100");
      const data = await res.json();
      setEmployees(data?.employees ?? []);
    } catch (error) {
      console.error("Fetch employees error:", error);
    }
  };

  useEffect(() => {
    fetchDepartments();
    fetchEmployees();
  }, []);

  const handleSubmit = async () => {
    if (!formData.name) {
      toast.error("Department name is required");
      return;
    }

    try {
      const url = editId ? `/api/departments/${editId}` : "/api/departments";
      const method = editId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success(editId ? "Department updated" : "Department created");
        setDialog(false);
        setFormData({ name: "", description: "", headId: "" });
        setEditId(null);
        fetchDepartments();
      } else {
        const data = await res.json();
        toast.error(data?.message ?? "Operation failed");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this department?")) return;

    try {
      const res = await fetch(`/api/departments/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Department deleted");
        fetchDepartments();
      } else {
        toast.error("Delete failed");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const openEditDialog = (dept: any) => {
    setEditId(dept?.id ?? null);
    setFormData({
      name: dept?.name ?? "",
      description: dept?.description ?? "",
      headId: dept?.headId ?? "",
    });
    setDialog(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Departments</h1>
          <p className="text-gray-500">Manage organizational departments</p>
        </div>
        {canManage && (
          <Button
            onClick={() => {
              setEditId(null);
              setFormData({ name: "", description: "", headId: "" });
              setDialog(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Department
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Department List
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (departments ?? []).length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No departments found</p>
            </div>
          ) : (
            <div className="overflow-x-auto"><Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Head</TableHead>
                  <TableHead>Employees</TableHead>
                  {canManage && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(departments ?? []).map((dept: any) => (
                  <TableRow key={dept?.id ?? Math.random()}>
                    <TableCell className="font-medium">{dept?.name ?? ""}</TableCell>
                    <TableCell className="text-gray-500">
                      {dept?.description ?? "—"}
                    </TableCell>
                    <TableCell>
                      {dept?.head
                        ? `${dept.head.firstName ?? ""} ${dept.head.lastName ?? ""}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-gray-400" />
                        {dept?._count?.employees ?? 0}
                      </div>
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(dept)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {userRole === "ADMIN" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600"
                              onClick={() => handleDelete(dept?.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table></div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editId ? "Edit Department" : "Add Department"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Department Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Enter department name"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Brief description"
              />
            </div>
            <div className="space-y-2">
              <Label>Department Head</Label>
              <Select
                value={formData.headId}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, headId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department head" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Head</SelectItem>
                  {(employees ?? []).map((emp: any) => (
                    <SelectItem key={emp?.id ?? ""} value={emp?.id ?? ""}>
                      {emp?.firstName ?? ""} {emp?.lastName ?? ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}