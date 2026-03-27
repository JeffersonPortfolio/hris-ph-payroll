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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Briefcase, Plus, Edit, Trash2, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import toast from "react-hot-toast";

export default function RolesPage() {
  const { data: session } = useSession() || {};
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const userRole = (session?.user as any)?.role;
  const canManage = userRole === "ADMIN" || userRole === "HR";

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/roles");
      const data = await res.json();
      setRoles(data?.roles ?? []);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleSubmit = async () => {
    if (!formData.name) {
      toast.error("Role name is required");
      return;
    }

    try {
      const url = editId ? `/api/roles/${editId}` : "/api/roles";
      const method = editId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success(editId ? "Role updated" : "Role created");
        setDialog(false);
        setFormData({ name: "", description: "" });
        setEditId(null);
        fetchRoles();
      } else {
        const data = await res.json();
        toast.error(data?.message ?? "Operation failed");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this role?")) return;

    try {
      const res = await fetch(`/api/roles/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Role deleted");
        fetchRoles();
      } else {
        toast.error("Delete failed");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const openEditDialog = (role: any) => {
    setEditId(role?.id ?? null);
    setFormData({
      name: role?.name ?? "",
      description: role?.description ?? "",
    });
    setDialog(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Job Roles</h1>
          <p className="text-gray-500">Manage employee positions and roles</p>
        </div>
        {canManage && (
          <Button
            onClick={() => {
              setEditId(null);
              setFormData({ name: "", description: "" });
              setDialog(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Role
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Role List
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (roles ?? []).length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No roles found</p>
            </div>
          ) : (
            <div className="overflow-x-auto"><Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Employees</TableHead>
                  {canManage && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(roles ?? []).map((role: any) => (
                  <TableRow key={role?.id ?? Math.random()}>
                    <TableCell className="font-medium">{role?.name ?? ""}</TableCell>
                    <TableCell className="text-gray-500">
                      {role?.description ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-gray-400" />
                        {role?._count?.employees ?? 0}
                      </div>
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(role)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {userRole === "ADMIN" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600"
                              onClick={() => handleDelete(role?.id)}
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
            <DialogTitle>{editId ? "Edit Role" : "Add Role"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Role Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Enter role name"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Job description"
              />
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