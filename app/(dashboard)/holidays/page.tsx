"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, Trash2, Edit, Download, Upload } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Holiday {
  id: string;
  name: string;
  date: string;
  type: "REGULAR" | "SPECIAL";
  description?: string;
  year: number;
  isRecurring: boolean;
}

export default function HolidaysPage() {
  const { data: session } = useSession() || {};
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    date: "",
    type: "REGULAR" as "REGULAR" | "SPECIAL",
    description: "",
    isRecurring: false,
  });

  const isAdmin = (session?.user as any)?.role === "ADMIN" || (session?.user as any)?.role === "HR";

  const fetchHolidays = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/holidays?year=${selectedYear}`);
      if (res.ok) {
        const data = await res.json();
        setHolidays(data);
      }
    } catch (error) {
      console.error("Error fetching holidays:", error);
      toast.error("Failed to fetch holidays");
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  const handleImportSingapore = async () => {
    try {
      const res = await fetch("/api/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ importSingapore: true, year: selectedYear }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(data.message);
        fetchHolidays();
      } else {
        toast.error("Failed to import holidays");
      }
    } catch (error) {
      console.error("Error importing holidays:", error);
      toast.error("Failed to import holidays");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingHoliday ? `/api/holidays/${editingHoliday.id}` : "/api/holidays";
      const method = editingHoliday ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success(editingHoliday ? "Holiday updated" : "Holiday created");
        setDialogOpen(false);
        setEditingHoliday(null);
        setFormData({ name: "", date: "", type: "REGULAR", description: "", isRecurring: false });
        fetchHolidays();
      } else {
        toast.error("Failed to save holiday");
      }
    } catch (error) {
      console.error("Error saving holiday:", error);
      toast.error("Failed to save holiday");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this holiday?")) return;
    try {
      const res = await fetch(`/api/holidays/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Holiday deleted");
        fetchHolidays();
      } else {
        toast.error("Failed to delete holiday");
      }
    } catch (error) {
      console.error("Error deleting holiday:", error);
      toast.error("Failed to delete holiday");
    }
  };

  const openEditDialog = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    setFormData({
      name: holiday.name,
      date: format(new Date(holiday.date), "yyyy-MM-dd"),
      type: holiday.type,
      description: holiday.description || "",
      isRecurring: holiday.isRecurring,
    });
    setDialogOpen(true);
  };

  const years = [2024, 2025, 2026, 2027, 2028];

  // Group holidays by month
  const groupedHolidays = holidays.reduce((acc, holiday) => {
    const month = format(new Date(holiday.date), "MMMM");
    if (!acc[month]) acc[month] = [];
    acc[month].push(holiday);
    return acc;
  }, {} as Record<string, Holiday[]>);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold tracking-tight">Holiday Calendar</h1>
          <p className="text-muted-foreground">Manage public holidays (based on Singapore holidays)</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isAdmin && (
            <>
              <Button variant="outline" onClick={handleImportSingapore}>
                <Download className="h-4 w-4 mr-2" />
                Import SG Holidays
              </Button>
              <Dialog open={dialogOpen} onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) {
                  setEditingHoliday(null);
                  setFormData({ name: "", date: "", type: "REGULAR", description: "", isRecurring: false });
                }
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Holiday
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingHoliday ? "Edit Holiday" : "Add New Holiday"}</DialogTitle>
                    <DialogDescription>Enter holiday details</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Holiday Name</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v as "REGULAR" | "SPECIAL" })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="REGULAR">Regular Holiday (2x pay)</SelectItem>
                          <SelectItem value="SPECIAL">Special Holiday (1.3x pay)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Description (Optional)</Label>
                      <Input
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>
                    <DialogFooter>
                      <Button type="submit">{editingHoliday ? "Update" : "Create"}</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Holidays</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{holidays.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Regular Holidays</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {holidays.filter(h => h.type === "REGULAR").length}
            </div>
            <p className="text-xs text-muted-foreground">2x pay rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Special Holidays</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {holidays.filter(h => h.type === "SPECIAL").length}
            </div>
            <p className="text-xs text-muted-foreground">1.3x pay rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Holidays Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {selectedYear} Holiday Calendar
          </CardTitle>
          <CardDescription>Singapore public holidays for payroll computation</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : holidays.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No holidays found for {selectedYear}</p>
              {isAdmin && (
                <Button variant="outline" className="mt-4" onClick={handleImportSingapore}>
                  <Upload className="h-4 w-4 mr-2" />
                  Import Singapore Holidays
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto"><Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="hidden sm:table-cell">Day</TableHead>
                  <TableHead>Holiday Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="hidden md:table-cell">Pay Rate</TableHead>
                  {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {holidays.map((holiday) => (
                  <TableRow key={holiday.id}>
                    <TableCell>{format(new Date(holiday.date), "MMM d, yyyy")}</TableCell>
                    <TableCell className="hidden sm:table-cell">{format(new Date(holiday.date), "EEEE")}</TableCell>
                    <TableCell className="font-medium">{holiday.name}</TableCell>
                    <TableCell>
                      <Badge variant={holiday.type === "REGULAR" ? "destructive" : "secondary"}>
                        {holiday.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className={holiday.type === "REGULAR" ? "text-red-600 font-semibold" : "text-orange-600"}>
                        {holiday.type === "REGULAR" ? "200%" : "130%"}
                      </span>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(holiday)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(holiday.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table></div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
