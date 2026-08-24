"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "@/components/ui/dialog";
import { Shield, Plus, Edit, Key, UserX, UserCheck, KeyRound, Copy, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialog, setEditDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    role: "",
    isActive: true,
  });
  // --- Temporary password dialog state ---
  const [tempPwDialog, setTempPwDialog] = useState(false);
  const [tempPwUser, setTempPwUser] = useState<any>(null);
  const [tempPwInput, setTempPwInput] = useState("");
  const [tempPwResult, setTempPwResult] = useState("");
  const [tempPwSaving, setTempPwSaving] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      setUsers(data?.users ?? []);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUpdate = async () => {
    if (!selectedUser?.id) return;

    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success("User updated");
        setEditDialog(false);
        fetchUsers();
      } else {
        toast.error("Update failed");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (!confirm("Send password reset email to this user?")) return;

    try {
      const res = await fetch(`/api/users/${userId}/reset-password`, {
        method: "POST",
      });

      if (res.ok) {
        toast.success("Password reset email sent");
      } else {
        toast.error("Failed to send reset email");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const openTempPwDialog = (user: any) => {
    setTempPwUser(user);
    setTempPwInput("");
    setTempPwResult("");
    setTempPwDialog(true);
  };

  const generateRandomPassword = () => {
    const pw = Math.random().toString(36).slice(-8) + "A1!";
    setTempPwInput(pw);
  };

  const handleSetTempPassword = async () => {
    if (!tempPwUser?.id) return;
    if (tempPwInput && tempPwInput.trim().length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setTempPwSaving(true);
    try {
      const res = await fetch(`/api/users/${tempPwUser.id}/reset-password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        // Empty password tells the API to auto-generate one.
        body: JSON.stringify({ password: tempPwInput.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setTempPwResult(data?.tempPassword ?? tempPwInput.trim());
        toast.success("Temporary password set!");
      } else {
        toast.error(data?.message ?? "Failed to set temporary password");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setTempPwSaving(false);
    }
  };

  const copyTempPassword = async () => {
    if (!tempPwResult) return;
    try {
      await navigator.clipboard.writeText(tempPwResult);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Copy failed - please copy manually");
    }
  };

  const openEditDialog = (user: any) => {
    setSelectedUser(user);
    setFormData({
      role: user?.role ?? "EMPLOYEE",
      isActive: user?.isActive ?? true,
    });
    setEditDialog(true);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-red-100 text-red-800";
      case "HR":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg sm:text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-500">Manage user accounts and permissions</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            User Accounts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (users ?? []).length === 0 ? (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto"><Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(users ?? []).map((user: any) => (
                  <TableRow key={user?.id ?? Math.random()}>
                    <TableCell className="font-medium">{user?.name ?? ""}</TableCell>
                    <TableCell>{user?.email ?? ""}</TableCell>
                    <TableCell>
                      <Badge className={getRoleBadgeColor(user?.role ?? "")}>
                        {user?.role ?? ""}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user?.isActive ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{formatDate(user?.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Send password reset email"
                          onClick={() => handleResetPassword(user?.id)}
                        >
                          <Key className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Set temporary password"
                          onClick={() => openTempPwDialog(user)}
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table></div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">User</p>
              <p className="font-medium">{selectedUser?.name ?? ""}</p>
              <p className="text-sm text-gray-500">{selectedUser?.email ?? ""}</p>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={formData.role}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, role: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="HR">HR</SelectItem>
                  <SelectItem value="EMPLOYEE">Employee</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.isActive ? "active" : "inactive"}
                onValueChange={(v) =>
                  setFormData((prev) => ({ ...prev, isActive: v === "active" }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set Temporary Password Dialog */}
      <Dialog open={tempPwDialog} onOpenChange={setTempPwDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Set Temporary Password
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">User</p>
              <p className="font-medium">{tempPwUser?.name ?? ""}</p>
              <p className="text-sm text-gray-500">{tempPwUser?.email ?? ""}</p>
            </div>

            {!tempPwResult ? (
              <>
                <div className="space-y-2">
                  <Label>Temporary Password</Label>
                  <div className="flex gap-2">
                    <Input
                      value={tempPwInput}
                      onChange={(e) => setTempPwInput(e.target.value)}
                      placeholder="Leave blank to auto-generate"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      title="Generate random password"
                      onClick={generateRandomPassword}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Type a password (min 6 characters) or leave blank to
                    auto-generate one. Share it with the employee so they can log
                    in and change it.
                  </p>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label>New Temporary Password</Label>
                <div className="flex gap-2">
                  <Input readOnly value={tempPwResult} className="font-mono" />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    title="Copy password"
                    onClick={copyTempPassword}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-amber-600">
                  ⚠️ Copy this now — it will not be shown again. Give it to the
                  employee to log in with.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            {!tempPwResult ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setTempPwDialog(false)}
                  disabled={tempPwSaving}
                >
                  Cancel
                </Button>
                <Button onClick={handleSetTempPassword} disabled={tempPwSaving}>
                  {tempPwSaving ? "Saving..." : "Set Password"}
                </Button>
              </>
            ) : (
              <Button onClick={() => setTempPwDialog(false)}>Done</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}