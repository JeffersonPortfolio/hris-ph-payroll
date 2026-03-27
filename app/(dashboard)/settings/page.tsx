"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Settings, Clock, Users, Building2, Calendar, Save, Plus, Trash2, Edit, CheckCircle, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

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
  requiredHours: number;
  isDefault: boolean;
  isActive: boolean;
}

interface Department {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  department?: { name: string };
}

interface DepartmentSchedule {
  id: string;
  departmentId: string;
  departmentName: string;
  workScheduleId: string;
  workSchedule: WorkSchedule;
  effectiveFrom: string;
  effectiveTo?: string;
  isDefault: boolean;
}

interface EmployeeSchedule {
  id: string;
  employeeId: string;
  workScheduleId: string;
  workSchedule: WorkSchedule;
  effectiveFrom: string;
  effectiveTo?: string;
}

export default function SettingsPage() {
  const { data: session } = useSession() || {};
  const userRole = (session?.user as any)?.role;
  const isAdmin = userRole === 'ADMIN';
  
  const [workSchedules, setWorkSchedules] = useState<WorkSchedule[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departmentSchedules, setDepartmentSchedules] = useState<DepartmentSchedule[]>([]);
  const [employeeSchedules, setEmployeeSchedules] = useState<EmployeeSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showDeptAssignDialog, setShowDeptAssignDialog] = useState(false);
  const [showEmpAssignDialog, setShowEmpAssignDialog] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<WorkSchedule | null>(null);
  
  // Form states
  const [scheduleForm, setScheduleForm] = useState({
    name: '',
    description: '',
    mondayStart: '09:00', mondayEnd: '18:00',
    tuesdayStart: '09:00', tuesdayEnd: '18:00',
    wednesdayStart: '09:00', wednesdayEnd: '18:00',
    thursdayStart: '09:00', thursdayEnd: '18:00',
    fridayStart: '09:00', fridayEnd: '18:00',
    saturdayStart: '', saturdayEnd: '',
    sundayStart: '', sundayEnd: '',
    breakMinutes: 60,
    lateGracePeriod: 15,
    requiredHours: 9,
    isDefault: false,
  });
  
  const [deptAssignForm, setDeptAssignForm] = useState({
    departmentId: '',
    workScheduleId: '',
    effectiveFrom: new Date().toISOString().split('T')[0],
    effectiveTo: '',
    isDefault: true,
  });
  
  const [empAssignForm, setEmpAssignForm] = useState({
    employeeId: '',
    workScheduleId: '',
    effectiveFrom: new Date().toISOString().split('T')[0],
    effectiveTo: '',
  });
  
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  
  // Payroll settings state
  const [payrollSettings, setPayrollSettings] = useState({
    cutoff1Start: '27',
    cutoff1End: '10',
    cutoff2Start: '11',
    cutoff2End: '25',
    payrollPeriodMode: 'SEMI_MONTHLY',
  });
  const [savingPayroll, setSavingPayroll] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [schedulesRes, deptsRes, empsRes, deptSchRes, settingsRes] = await Promise.all([
        fetch('/api/work-schedules'),
        fetch('/api/departments'),
        fetch('/api/employees?limit=1000'),
        fetch('/api/work-schedules/department'),
        fetch('/api/settings'),
      ]);
      
      const schedulesData = await schedulesRes.json();
      const deptsData = await deptsRes.json();
      const empsData = await empsRes.json();
      const deptSchData = await deptSchRes.json();
      const settingsData = await settingsRes.json();
      
      // Handle different API response formats
      setWorkSchedules(Array.isArray(schedulesData) ? schedulesData : []);
      setDepartments(deptsData?.departments || (Array.isArray(deptsData) ? deptsData : []));
      setEmployees(empsData?.employees || (Array.isArray(empsData) ? empsData : []));
      setDepartmentSchedules(deptSchData?.schedules || []);
      
      // Load payroll settings
      if (settingsData) {
        setPayrollSettings({
          cutoff1Start: settingsData.payroll_cutoff_1_start || '27',
          cutoff1End: settingsData.payroll_cutoff_1_end || '10',
          cutoff2Start: settingsData.payroll_cutoff_2_start || '11',
          cutoff2End: settingsData.payroll_cutoff_2_end || '25',
          payrollPeriodMode: settingsData.payroll_period_mode || 'SEMI_MONTHLY',
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load settings data');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeSchedules = async (employeeId: string) => {
    try {
      const res = await fetch(`/api/work-schedules/employee/${employeeId}`);
      const data = await res.json();
      setEmployeeSchedules(data?.schedules || []);
    } catch (error) {
      console.error('Error fetching employee schedules:', error);
    }
  };

  const handleCreateSchedule = async () => {
    try {
      const url = editingSchedule ? `/api/work-schedules/${editingSchedule.id}` : '/api/work-schedules';
      const method = editingSchedule ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheduleForm),
      });
      
      if (!res.ok) throw new Error('Failed to save schedule');
      
      toast.success(editingSchedule ? 'Schedule updated' : 'Schedule created');
      setShowScheduleDialog(false);
      setEditingSchedule(null);
      resetScheduleForm();
      fetchData();
    } catch (error) {
      toast.error('Failed to save work schedule');
    }
  };

  const handleAssignDepartment = async () => {
    try {
      const res = await fetch('/api/work-schedules/department', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deptAssignForm),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to assign');
      }
      
      toast.success('Work schedule assigned to department');
      setShowDeptAssignDialog(false);
      setDeptAssignForm({ departmentId: '', workScheduleId: '', effectiveFrom: new Date().toISOString().split('T')[0], effectiveTo: '', isDefault: true });
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to assign schedule');
    }
  };

  const handleAssignEmployee = async () => {
    try {
      const assignedEmployeeId = empAssignForm.employeeId;
      const res = await fetch(`/api/work-schedules/employee/${assignedEmployeeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workScheduleId: empAssignForm.workScheduleId,
          effectiveFrom: empAssignForm.effectiveFrom,
          effectiveTo: empAssignForm.effectiveTo || null,
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to assign');
      }
      
      toast.success('Work schedule assigned to employee');
      setShowEmpAssignDialog(false);
      setEmpAssignForm({ employeeId: '', workScheduleId: '', effectiveFrom: new Date().toISOString().split('T')[0], effectiveTo: '' });
      // Auto-select the assigned employee to show their schedules
      setSelectedEmployee(assignedEmployeeId);
      fetchEmployeeSchedules(assignedEmployeeId);
    } catch (error: any) {
      toast.error(error.message || 'Failed to assign schedule');
    }
  };

  const handleDeleteDeptSchedule = async (id: string) => {
    if (!confirm('Remove this schedule assignment?')) return;
    try {
      await fetch(`/api/work-schedules/department?id=${id}`, { method: 'DELETE' });
      toast.success('Schedule assignment removed');
      fetchData();
    } catch (error) {
      toast.error('Failed to remove');
    }
  };

  const handleDeleteEmpSchedule = async (id: string) => {
    if (!confirm('Remove this schedule assignment?')) return;
    try {
      await fetch(`/api/work-schedules/employee/${selectedEmployee}?scheduleId=${id}`, { method: 'DELETE' });
      toast.success('Schedule assignment removed');
      if (selectedEmployee) fetchEmployeeSchedules(selectedEmployee);
    } catch (error) {
      toast.error('Failed to remove');
    }
  };

  const resetScheduleForm = () => {
    setScheduleForm({
      name: '', description: '',
      mondayStart: '09:00', mondayEnd: '18:00',
      tuesdayStart: '09:00', tuesdayEnd: '18:00',
      wednesdayStart: '09:00', wednesdayEnd: '18:00',
      thursdayStart: '09:00', thursdayEnd: '18:00',
      fridayStart: '09:00', fridayEnd: '18:00',
      saturdayStart: '', saturdayEnd: '',
      sundayStart: '', sundayEnd: '',
      breakMinutes: 60, lateGracePeriod: 15, requiredHours: 9, isDefault: false,
    });
  };

  const handleSavePayrollSettings = async () => {
    try {
      setSavingPayroll(true);
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            payroll_cutoff_1_start: payrollSettings.cutoff1Start,
            payroll_cutoff_1_end: payrollSettings.cutoff1End,
            payroll_cutoff_2_start: payrollSettings.cutoff2Start,
            payroll_cutoff_2_end: payrollSettings.cutoff2End,
            payroll_period_mode: payrollSettings.payrollPeriodMode,
          }
        }),
      });
      
      if (!res.ok) throw new Error('Failed to save settings');
      
      toast.success('Payroll settings saved successfully');
    } catch (error) {
      console.error('Error saving payroll settings:', error);
      toast.error('Failed to save payroll settings');
    } finally {
      setSavingPayroll(false);
    }
  };

  const openEditSchedule = (schedule: WorkSchedule) => {
    setEditingSchedule(schedule);
    setScheduleForm({
      name: schedule.name,
      description: schedule.description || '',
      mondayStart: schedule.mondayStart || '',
      mondayEnd: schedule.mondayEnd || '',
      tuesdayStart: schedule.tuesdayStart || '',
      tuesdayEnd: schedule.tuesdayEnd || '',
      wednesdayStart: schedule.wednesdayStart || '',
      wednesdayEnd: schedule.wednesdayEnd || '',
      thursdayStart: schedule.thursdayStart || '',
      thursdayEnd: schedule.thursdayEnd || '',
      fridayStart: schedule.fridayStart || '',
      fridayEnd: schedule.fridayEnd || '',
      saturdayStart: schedule.saturdayStart || '',
      saturdayEnd: schedule.saturdayEnd || '',
      sundayStart: schedule.sundayStart || '',
      sundayEnd: schedule.sundayEnd || '',
      breakMinutes: schedule.breakMinutes,
      lateGracePeriod: schedule.lateGracePeriod,
      requiredHours: schedule.requiredHours,
      isDefault: schedule.isDefault,
    });
    setShowScheduleDialog(true);
  };

  const formatTime = (time?: string) => time || '-';

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg sm:text-2xl font-bold text-gray-900">System Settings</h1>
        <p className="text-gray-500">Configure work hours and system settings</p>
      </div>

      <Tabs defaultValue="schedules" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="schedules" className="flex items-center gap-2">
            <Clock className="h-4 w-4" /> Work Schedules
          </TabsTrigger>
          <TabsTrigger value="departments" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" /> By Department
          </TabsTrigger>
          <TabsTrigger value="employees" className="flex items-center gap-2">
            <Users className="h-4 w-4" /> By Employee
          </TabsTrigger>
          <TabsTrigger value="payroll" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Payroll Settings
          </TabsTrigger>
        </TabsList>

        {/* Work Schedules Tab */}
        <TabsContent value="schedules" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Work Schedules</CardTitle>
                <CardDescription>Manage work schedule templates</CardDescription>
              </div>
              <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
                <DialogTrigger asChild>
                  <Button onClick={() => { setEditingSchedule(null); resetScheduleForm(); }}>
                    <Plus className="h-4 w-4 mr-2" /> New Schedule
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingSchedule ? 'Edit Work Schedule' : 'Create Work Schedule'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Schedule Name *</Label>
                        <Input
                          value={scheduleForm.name}
                          onChange={(e) => setScheduleForm({ ...scheduleForm, name: e.target.value })}
                          placeholder="e.g., Regular 9-6"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Input
                          value={scheduleForm.description}
                          onChange={(e) => setScheduleForm({ ...scheduleForm, description: e.target.value })}
                          placeholder="Optional description"
                        />
                      </div>
                    </div>
                    
                    <div className="border rounded-lg p-4">
                      <Label className="text-sm font-medium">Daily Work Hours</Label>
                      <div className="grid gap-3 mt-3">
                        {days.map(day => (
                          <div key={day} className="grid grid-cols-3 items-center gap-2">
                            <span className="text-sm capitalize font-medium">{day}</span>
                            <Input
                              type="time"
                              value={(scheduleForm as any)[`${day}Start`]}
                              onChange={(e) => setScheduleForm({ ...scheduleForm, [`${day}Start`]: e.target.value })}
                              className="h-9"
                            />
                            <Input
                              type="time"
                              value={(scheduleForm as any)[`${day}End`]}
                              onChange={(e) => setScheduleForm({ ...scheduleForm, [`${day}End`]: e.target.value })}
                              className="h-9"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Break (mins)</Label>
                        <Input
                          type="number"
                          value={scheduleForm.breakMinutes}
                          onChange={(e) => setScheduleForm({ ...scheduleForm, breakMinutes: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Grace Period (mins)</Label>
                        <Input
                          type="number"
                          value={scheduleForm.lateGracePeriod}
                          onChange={(e) => setScheduleForm({ ...scheduleForm, lateGracePeriod: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Required Hours</Label>
                        <Input
                          type="number"
                          step="0.5"
                          value={scheduleForm.requiredHours}
                          onChange={(e) => setScheduleForm({ ...scheduleForm, requiredHours: parseFloat(e.target.value) || 8 })}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="isDefault"
                        checked={scheduleForm.isDefault}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, isDefault: e.target.checked })}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="isDefault">Set as company default schedule</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>Cancel</Button>
                    <Button onClick={handleCreateSchedule} disabled={!scheduleForm.name}>
                      <Save className="h-4 w-4 mr-2" /> {editingSchedule ? 'Update' : 'Create'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Mon-Fri</TableHead>
                    <TableHead>Sat</TableHead>
                    <TableHead>Sun</TableHead>
                    <TableHead>Break</TableHead>
                    <TableHead>Grace</TableHead>
                    <TableHead>Required Hrs</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workSchedules.map(schedule => (
                    <TableRow key={schedule.id}>
                      <TableCell className="font-medium">
                        {schedule.name}
                        {schedule.isDefault && <Badge variant="secondary" className="ml-2">Default</Badge>}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatTime(schedule.mondayStart)} - {formatTime(schedule.mondayEnd)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {schedule.saturdayStart ? `${formatTime(schedule.saturdayStart)} - ${formatTime(schedule.saturdayEnd)}` : 'Off'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {schedule.sundayStart ? `${formatTime(schedule.sundayStart)} - ${formatTime(schedule.sundayEnd)}` : 'Off'}
                      </TableCell>
                      <TableCell>{schedule.breakMinutes} min</TableCell>
                      <TableCell>{schedule.lateGracePeriod} min</TableCell>
                      <TableCell>{schedule.requiredHours} hrs</TableCell>
                      <TableCell>
                        <Badge variant={schedule.isActive ? 'default' : 'secondary'}>
                          {schedule.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => openEditSchedule(schedule)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {workSchedules.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                        No work schedules created yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Department Schedules Tab */}
        <TabsContent value="departments" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Department Work Schedules</CardTitle>
                <CardDescription>Assign default work schedules to departments</CardDescription>
              </div>
              <Dialog open={showDeptAssignDialog} onOpenChange={setShowDeptAssignDialog}>
                <DialogTrigger asChild>
                  <Button><Plus className="h-4 w-4 mr-2" /> Assign to Department</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Assign Schedule to Department</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Department *</Label>
                      <Select
                        value={deptAssignForm.departmentId}
                        onValueChange={(v) => setDeptAssignForm({ ...deptAssignForm, departmentId: v })}
                      >
                        <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                        <SelectContent>
                          {departments.map(dept => (
                            <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Work Schedule *</Label>
                      <Select
                        value={deptAssignForm.workScheduleId}
                        onValueChange={(v) => setDeptAssignForm({ ...deptAssignForm, workScheduleId: v })}
                      >
                        <SelectTrigger><SelectValue placeholder="Select schedule" /></SelectTrigger>
                        <SelectContent>
                          {workSchedules.map(sch => (
                            <SelectItem key={sch.id} value={sch.id}>{sch.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Effective From *</Label>
                        <Input
                          type="date"
                          value={deptAssignForm.effectiveFrom}
                          onChange={(e) => setDeptAssignForm({ ...deptAssignForm, effectiveFrom: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Effective To</Label>
                        <Input
                          type="date"
                          value={deptAssignForm.effectiveTo}
                          onChange={(e) => setDeptAssignForm({ ...deptAssignForm, effectiveTo: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowDeptAssignDialog(false)}>Cancel</Button>
                    <Button
                      onClick={handleAssignDepartment}
                      disabled={!deptAssignForm.departmentId || !deptAssignForm.workScheduleId}
                    >
                      Assign Schedule
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead>Work Schedule</TableHead>
                    <TableHead>Working Hours</TableHead>
                    <TableHead>Effective From</TableHead>
                    <TableHead>Effective To</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departmentSchedules.map(ds => (
                    <TableRow key={ds.id}>
                      <TableCell className="font-medium">{ds.departmentName}</TableCell>
                      <TableCell>
                        {ds.workSchedule?.name}
                        {ds.isDefault && <Badge variant="secondary" className="ml-2">Default</Badge>}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {ds.workSchedule?.mondayStart} - {ds.workSchedule?.mondayEnd}
                      </TableCell>
                      <TableCell>{new Date(ds.effectiveFrom).toLocaleDateString()}</TableCell>
                      <TableCell>{ds.effectiveTo ? new Date(ds.effectiveTo).toLocaleDateString() : 'Ongoing'}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteDeptSchedule(ds.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {departmentSchedules.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                        No department schedules assigned yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Employee Schedules Tab */}
        <TabsContent value="employees" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Employee Work Schedules</CardTitle>
                <CardDescription>Assign custom work schedules to individual employees (overrides department default)</CardDescription>
              </div>
              <Dialog open={showEmpAssignDialog} onOpenChange={setShowEmpAssignDialog}>
                <DialogTrigger asChild>
                  <Button><Plus className="h-4 w-4 mr-2" /> Assign to Employee</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Assign Schedule to Employee</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Employee *</Label>
                      <Select
                        value={empAssignForm.employeeId}
                        onValueChange={(v) => setEmpAssignForm({ ...empAssignForm, employeeId: v })}
                      >
                        <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                        <SelectContent>
                          {employees.map(emp => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.lastName}, {emp.firstName} ({emp.employeeId})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Work Schedule *</Label>
                      <Select
                        value={empAssignForm.workScheduleId}
                        onValueChange={(v) => setEmpAssignForm({ ...empAssignForm, workScheduleId: v })}
                      >
                        <SelectTrigger><SelectValue placeholder="Select schedule" /></SelectTrigger>
                        <SelectContent>
                          {workSchedules.map(sch => (
                            <SelectItem key={sch.id} value={sch.id}>{sch.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Effective From *</Label>
                        <Input
                          type="date"
                          value={empAssignForm.effectiveFrom}
                          onChange={(e) => setEmpAssignForm({ ...empAssignForm, effectiveFrom: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Effective To</Label>
                        <Input
                          type="date"
                          value={empAssignForm.effectiveTo}
                          onChange={(e) => setEmpAssignForm({ ...empAssignForm, effectiveTo: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowEmpAssignDialog(false)}>Cancel</Button>
                    <Button
                      onClick={handleAssignEmployee}
                      disabled={!empAssignForm.employeeId || !empAssignForm.workScheduleId}
                    >
                      Assign Schedule
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Label>View schedules for:</Label>
                <Select
                  value={selectedEmployee}
                  onValueChange={(v) => {
                    setSelectedEmployee(v);
                    if (v) fetchEmployeeSchedules(v);
                    else setEmployeeSchedules([]);
                  }}
                >
                  <SelectTrigger className="w-[300px]"><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.lastName}, {emp.firstName} ({emp.employeeId}) - {emp.department?.name || 'No Dept'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedEmployee && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Work Schedule</TableHead>
                      <TableHead>Working Hours</TableHead>
                      <TableHead>Break</TableHead>
                      <TableHead>Effective From</TableHead>
                      <TableHead>Effective To</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employeeSchedules.map(es => (
                      <TableRow key={es.id}>
                        <TableCell className="font-medium">{es.workSchedule?.name}</TableCell>
                        <TableCell className="text-sm">
                          {es.workSchedule?.mondayStart} - {es.workSchedule?.mondayEnd}
                        </TableCell>
                        <TableCell>{es.workSchedule?.breakMinutes} min</TableCell>
                        <TableCell>{new Date(es.effectiveFrom).toLocaleDateString()}</TableCell>
                        <TableCell>{es.effectiveTo ? new Date(es.effectiveTo).toLocaleDateString() : 'Ongoing'}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteEmpSchedule(es.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {employeeSchedules.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                          No custom schedule assigned. Employee uses department default.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payroll Settings Tab */}
        <TabsContent value="payroll" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Payroll Cutoff Dates
              </CardTitle>
              <CardDescription>
                Configure payroll period mode and cutoff dates for salary computation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                <p className="font-medium mb-1">How cutoff dates work:</p>
                <p>
                  Cutoff dates determine which days of work are included in each payroll period.
                  For semi-monthly payroll, there are two cutoff periods per month.
                </p>
              </div>

              {/* Payroll Period Mode */}
              <div className="border rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-gray-900">Payroll Period Mode</h4>
                <Select
                  value={payrollSettings.payrollPeriodMode}
                  onValueChange={(value) => setPayrollSettings({ ...payrollSettings, payrollPeriodMode: value })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SEMI_MONTHLY">Semi-Monthly (2x per month)</SelectItem>
                    <SelectItem value="MONTHLY">Monthly (1x per month)</SelectItem>
                    <SelectItem value="BI_WEEKLY">Bi-Weekly (Every 2 weeks)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500">Determines how contributions and withholding tax are calculated per period.</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* First Cutoff Period */}
                <div className="border rounded-lg p-4 space-y-4">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    First Cutoff Period
                  </h4>
                  <p className="text-sm text-gray-500">
                    Work covered from the start date to the end date
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cutoff1Start">Start Day</Label>
                      <Select
                        value={payrollSettings.cutoff1Start}
                        onValueChange={(value) => setPayrollSettings({ ...payrollSettings, cutoff1Start: value })}
                      >
                        <SelectTrigger id="cutoff1Start">
                          <SelectValue placeholder="Select day" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                            <SelectItem key={day} value={String(day)}>
                              {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cutoff1End">End Day</Label>
                      <Select
                        value={payrollSettings.cutoff1End}
                        onValueChange={(value) => setPayrollSettings({ ...payrollSettings, cutoff1End: value })}
                      >
                        <SelectTrigger id="cutoff1End">
                          <SelectValue placeholder="Select day" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                            <SelectItem key={day} value={String(day)}>
                              {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                    Example: {payrollSettings.cutoff1Start}th to {payrollSettings.cutoff1End}th 
                    {parseInt(payrollSettings.cutoff1Start) > parseInt(payrollSettings.cutoff1End) && ' (spans to next month)'}
                  </p>
                </div>

                {/* Second Cutoff Period */}
                <div className="border rounded-lg p-4 space-y-4">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Second Cutoff Period
                  </h4>
                  <p className="text-sm text-gray-500">
                    Work covered from the start date to the end date
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cutoff2Start">Start Day</Label>
                      <Select
                        value={payrollSettings.cutoff2Start}
                        onValueChange={(value) => setPayrollSettings({ ...payrollSettings, cutoff2Start: value })}
                      >
                        <SelectTrigger id="cutoff2Start">
                          <SelectValue placeholder="Select day" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                            <SelectItem key={day} value={String(day)}>
                              {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cutoff2End">End Day</Label>
                      <Select
                        value={payrollSettings.cutoff2End}
                        onValueChange={(value) => setPayrollSettings({ ...payrollSettings, cutoff2End: value })}
                      >
                        <SelectTrigger id="cutoff2End">
                          <SelectValue placeholder="Select day" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                            <SelectItem key={day} value={String(day)}>
                              {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                    Example: {payrollSettings.cutoff2Start}th to {payrollSettings.cutoff2End}th
                    {parseInt(payrollSettings.cutoff2Start) > parseInt(payrollSettings.cutoff2End) && ' (spans to next month)'}
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button 
                  onClick={handleSavePayrollSettings} 
                  disabled={savingPayroll || !isAdmin}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  {savingPayroll ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Payroll Settings
                    </>
                  )}
                </Button>
              </div>

              {!isAdmin && (
                <p className="text-sm text-gray-500 text-center">
                  Only administrators can modify payroll settings.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
