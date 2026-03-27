"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Clock, Plus, Trash2, Edit, Users } from "lucide-react";
import { toast } from "sonner";

interface WorkSchedule {
  id: string;
  name: string;
  description?: string;
  mondayStart?: string;
  mondayEnd?: string;
  tuesdayStart?: string;
  tuesdayEnd?: string;
  wednesdayStart?: string;
  wednesdayEnd?: string;
  thursdayStart?: string;
  thursdayEnd?: string;
  fridayStart?: string;
  fridayEnd?: string;
  saturdayStart?: string;
  saturdayEnd?: string;
  sundayStart?: string;
  sundayEnd?: string;
  breakMinutes: number;
  lateGracePeriod: number;
  isDefault: boolean;
  isActive: boolean;
  _count?: { employeeSchedules: number };
}

const DAYS = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

export default function WorkSchedulesPage() {
  const { data: session } = useSession() || {};
  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<WorkSchedule | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    mondayStart: "09:00",
    mondayEnd: "18:00",
    tuesdayStart: "09:00",
    tuesdayEnd: "18:00",
    wednesdayStart: "09:00",
    wednesdayEnd: "18:00",
    thursdayStart: "09:00",
    thursdayEnd: "18:00",
    fridayStart: "09:00",
    fridayEnd: "18:00",
    saturdayStart: "",
    saturdayEnd: "",
    sundayStart: "",
    sundayEnd: "",
    breakMinutes: 60,
    lateGracePeriod: 15,
    isDefault: false,
  });

  const isAdmin = (session?.user as any)?.role === "ADMIN" || (session?.user as any)?.role === "HR";

  const fetchSchedules = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/work-schedules");
      if (res.ok) {
        const data = await res.json();
        setSchedules(data);
      }
    } catch (error) {
      console.error("Error fetching schedules:", error);
      toast.error("Failed to fetch work schedules");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingSchedule ? `/api/work-schedules/${editingSchedule.id}` : "/api/work-schedules";
      const method = editingSchedule ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success(editingSchedule ? "Schedule updated" : "Schedule created");
        setDialogOpen(false);
        setEditingSchedule(null);
        resetForm();
        fetchSchedules();
      } else {
        toast.error("Failed to save schedule");
      }
    } catch (error) {
      console.error("Error saving schedule:", error);
      toast.error("Failed to save schedule");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this schedule?")) return;
    try {
      const res = await fetch(`/api/work-schedules/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Schedule deleted");
        fetchSchedules();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete schedule");
      }
    } catch (error) {
      console.error("Error deleting schedule:", error);
      toast.error("Failed to delete schedule");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      mondayStart: "09:00",
      mondayEnd: "18:00",
      tuesdayStart: "09:00",
      tuesdayEnd: "18:00",
      wednesdayStart: "09:00",
      wednesdayEnd: "18:00",
      thursdayStart: "09:00",
      thursdayEnd: "18:00",
      fridayStart: "09:00",
      fridayEnd: "18:00",
      saturdayStart: "",
      saturdayEnd: "",
      sundayStart: "",
      sundayEnd: "",
      breakMinutes: 60,
      lateGracePeriod: 15,
      isDefault: false,
    });
  };

  const openEditDialog = (schedule: WorkSchedule) => {
    setEditingSchedule(schedule);
    setFormData({
      name: schedule.name,
      description: schedule.description || "",
      mondayStart: schedule.mondayStart || "",
      mondayEnd: schedule.mondayEnd || "",
      tuesdayStart: schedule.tuesdayStart || "",
      tuesdayEnd: schedule.tuesdayEnd || "",
      wednesdayStart: schedule.wednesdayStart || "",
      wednesdayEnd: schedule.wednesdayEnd || "",
      thursdayStart: schedule.thursdayStart || "",
      thursdayEnd: schedule.thursdayEnd || "",
      fridayStart: schedule.fridayStart || "",
      fridayEnd: schedule.fridayEnd || "",
      saturdayStart: schedule.saturdayStart || "",
      saturdayEnd: schedule.saturdayEnd || "",
      sundayStart: schedule.sundayStart || "",
      sundayEnd: schedule.sundayEnd || "",
      breakMinutes: schedule.breakMinutes,
      lateGracePeriod: schedule.lateGracePeriod,
      isDefault: schedule.isDefault,
    });
    setDialogOpen(true);
  };

  const formatTime = (start?: string, end?: string) => {
    if (!start && !end) return "Off";
    return `${start || "--"} - ${end || "--"}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold tracking-tight">Work Schedules</h1>
          <p className="text-muted-foreground">Manage employee work schedules and shifts</p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingSchedule(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Schedule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingSchedule ? "Edit Schedule" : "Create Work Schedule"}</DialogTitle>
                <DialogDescription>Define working hours for each day of the week</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Schedule Name</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Regular Shift"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Break Duration (minutes)</Label>
                    <Input
                      type="number"
                      value={formData.breakMinutes}
                      onChange={(e) => setFormData({ ...formData, breakMinutes: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional description"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Late Grace Period (minutes)</Label>
                  <Input
                    type="number"
                    value={formData.lateGracePeriod}
                    onChange={(e) => setFormData({ ...formData, lateGracePeriod: parseInt(e.target.value) || 0 })}
                    className="w-32"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Working Hours</Label>
                  {DAYS.map((day) => (
                    <div key={day.key} className="grid grid-cols-3 gap-4 items-center">
                      <span className="font-medium">{day.label}</span>
                      <Input
                        type="time"
                        value={(formData as Record<string, unknown>)[`${day.key}Start`] as string || ""}
                        onChange={(e) => setFormData({ ...formData, [`${day.key}Start`]: e.target.value })}
                        placeholder="Start"
                      />
                      <Input
                        type="time"
                        value={(formData as Record<string, unknown>)[`${day.key}End`] as string || ""}
                        onChange={(e) => setFormData({ ...formData, [`${day.key}End`]: e.target.value })}
                        placeholder="End"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.isDefault}
                    onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
                  />
                  <Label>Set as default schedule for new employees</Label>
                </div>
                <DialogFooter>
                  <Button type="submit">{editingSchedule ? "Update" : "Create"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Schedules Grid */}
      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : schedules.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">No work schedules configured</p>
            {isAdmin && (
              <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Schedule
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {schedules.map((schedule) => (
            <Card key={schedule.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      {schedule.name}
                      {schedule.isDefault && <Badge variant="secondary">Default</Badge>}
                    </CardTitle>
                    <CardDescription>{schedule.description}</CardDescription>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(schedule)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(schedule.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-4">
                  {DAYS.map((day) => (
                    <div key={day.key} className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-xs font-medium text-muted-foreground mb-1">{day.label.slice(0, 3)}</div>
                      <div className="text-sm">
                        {formatTime(
                          (schedule as unknown as Record<string, unknown>)[`${day.key}Start`] as string,
                          (schedule as unknown as Record<string, unknown>)[`${day.key}End`] as string
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-6 text-sm text-muted-foreground">
                  <span>Break: {schedule.breakMinutes} min</span>
                  <span>Grace Period: {schedule.lateGracePeriod} min</span>
                  {schedule._count && (
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {schedule._count.employeeSchedules} employees
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
