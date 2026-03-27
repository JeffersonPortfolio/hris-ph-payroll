'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Wallet, Users, Search, Building2, ArrowUpDown } from 'lucide-react';

interface AllowanceType {
  id: string;
  name: string;
  description: string | null;
  isTaxable: boolean;
  isActive: boolean;
  _count?: { employeeAllowances: number };
}

interface EmployeeAllowance {
  id: string;
  employeeId: string;
  allowanceTypeId: string;
  amount: number;
  frequency: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  allowanceType: AllowanceType;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    department?: { id: string; name: string };
  };
}

interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  department?: { id: string; name: string };
  departmentId?: string;
}

interface Department {
  id: string;
  name: string;
}

function generatePayrollCutoffs(): { label: string; value: string }[] {
  const cutoffs: { label: string; value: string }[] = [];
  const now = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let i = -2; i < 8; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const mLabel = months[m];
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    // First half: 26 prev month - 10 this month
    const prevD = new Date(y, m - 1, 1);
    const prevM = prevD.getMonth();
    const prevY = prevD.getFullYear();
    cutoffs.push({
      label: `26 ${months[prevM]} - 10 ${mLabel} ${y}`,
      value: `${prevY}-${String(prevM + 1).padStart(2, '0')}-26_${y}-${String(m + 1).padStart(2, '0')}-10`,
    });

    // Second half: 11 - 25 this month
    cutoffs.push({
      label: `11 ${mLabel} - 25 ${mLabel} ${y}`,
      value: `${y}-${String(m + 1).padStart(2, '0')}-11_${y}-${String(m + 1).padStart(2, '0')}-25`,
    });
  }
  return cutoffs;
}

export default function AllowancesPage() {
  const { data: session } = useSession() || {};
  const [allowanceTypes, setAllowanceTypes] = useState<AllowanceType[]>([]);
  const [employeeAllowances, setEmployeeAllowances] = useState<EmployeeAllowance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('types');

  // Type Dialog
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<AllowanceType | null>(null);
  const [typeForm, setTypeForm] = useState({
    name: '',
    description: '',
    isTaxable: true,
  });

  // Assign Dialog (new bulk mode)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assigningType, setAssigningType] = useState<AllowanceType | null>(null);
  const [filterMode, setFilterMode] = useState<'department' | 'employee'>('department');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState<Map<string, string>>(new Map()); // id -> amount
  const [paymentScheme, setPaymentScheme] = useState('ONE_TIME');
  const [payrollCutoff, setPayrollCutoff] = useState('');
  const [prorated, setProrated] = useState('');
  const [proratedBy, setProratedBy] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);

  // Edit single assignment dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<EmployeeAllowance | null>(null);
  const [editForm, setEditForm] = useState({
    amount: '',
    frequency: 'MONTHLY',
    effectiveFrom: '',
    effectiveTo: '',
  });

  // Sort state for employee table in assign dialog
  const [sortField, setSortField] = useState<'employeeId' | 'name'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const userRole = (session?.user as any)?.role;
  const canManage = ['ADMIN', 'HR'].includes(userRole);

  const payrollCutoffs = useMemo(() => generatePayrollCutoffs(), []);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [typesRes, allowancesRes, employeesRes, deptRes] = await Promise.all([
        fetch('/api/allowances'),
        fetch('/api/allowances/employee'),
        fetch('/api/employees?limit=1000'),
        fetch('/api/departments'),
      ]);

      if (typesRes.ok) setAllowanceTypes(await typesRes.json());
      if (allowancesRes.ok) setEmployeeAllowances(await allowancesRes.json());
      if (employeesRes.ok) {
        const data = await employeesRes.json();
        setEmployees(data.employees || data);
      }
      if (deptRes.ok) {
        const data = await deptRes.json();
        setDepartments(Array.isArray(data) ? data : data.departments || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Filtered employees for assign dialog
  const filteredEmployees = useMemo(() => {
    let list = employees;
    if (filterMode === 'department' && selectedDepartment) {
      list = list.filter(e => (e.department?.id || e.departmentId) === selectedDepartment);
    }
    if (filterMode === 'employee' && employeeSearch.trim()) {
      const q = employeeSearch.toLowerCase();
      list = list.filter(e =>
        `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
        e.employeeId.toLowerCase().includes(q)
      );
    }
    // Sort
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'employeeId') {
        cmp = a.employeeId.localeCompare(b.employeeId);
      } else {
        cmp = `${a.lastName}, ${a.firstName}`.localeCompare(`${b.lastName}, ${b.firstName}`);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [employees, filterMode, selectedDepartment, employeeSearch, sortField, sortDir]);

  // Type CRUD
  const handleSaveType = async () => {
    try {
      const url = '/api/allowances';
      const method = editingType ? 'PUT' : 'POST';
      const body = editingType ? { id: editingType.id, ...typeForm } : typeForm;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(editingType ? 'Allowance type updated' : 'Allowance type created');
        setTypeDialogOpen(false);
        setEditingType(null);
        setTypeForm({ name: '', description: '', isTaxable: true });
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to save');
      }
    } catch (error) {
      toast.error('Failed to save allowance type');
    }
  };

  const handleDeleteType = async (id: string) => {
    if (!confirm('Are you sure you want to delete this allowance type?')) return;
    try {
      const res = await fetch(`/api/allowances?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Allowance type deleted');
        fetchData();
      } else {
        toast.error('Failed to delete');
      }
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  // Open assign dialog for a specific allowance type
  const openAssignDialog = (type: AllowanceType) => {
    setAssigningType(type);
    setFilterMode('department');
    setSelectedDepartment('');
    setEmployeeSearch('');
    setSelectedEmployees(new Map());
    setPaymentScheme('ONE_TIME');
    setPayrollCutoff('');
    setProrated('');
    setProratedBy('');
    setStartDate('');
    setEndDate('');
    setAssignDialogOpen(true);
  };

  // Toggle employee selection
  const toggleEmployee = (empId: string) => {
    const next = new Map(selectedEmployees);
    if (next.has(empId)) {
      next.delete(empId);
    } else {
      next.set(empId, '');
    }
    setSelectedEmployees(next);
  };

  // Toggle all visible employees
  const toggleAll = () => {
    const allSelected = filteredEmployees.every(e => selectedEmployees.has(e.id));
    const next = new Map(selectedEmployees);
    if (allSelected) {
      filteredEmployees.forEach(e => next.delete(e.id));
    } else {
      filteredEmployees.forEach(e => { if (!next.has(e.id)) next.set(e.id, ''); });
    }
    setSelectedEmployees(next);
  };

  // Update amount for a selected employee
  const setEmployeeAmount = (empId: string, amount: string) => {
    const next = new Map(selectedEmployees);
    next.set(empId, amount);
    setSelectedEmployees(next);
  };

  // Bulk save
  const handleBulkAssign = async () => {
    if (!assigningType) return;
    const assignments = Array.from(selectedEmployees.entries())
      .filter(([_, amt]) => amt && parseFloat(amt) > 0)
      .map(([empId, amt]) => ({ employeeId: empId, amount: amt }));

    if (assignments.length === 0) {
      toast.error('Please select employees and enter amounts');
      return;
    }
    if (!startDate) {
      toast.error('Please set a start date');
      return;
    }

    setBulkSaving(true);
    try {
      const frequency = paymentScheme === 'ONE_TIME' ? 'ONE_TIME' : 'MONTHLY';
      const res = await fetch('/api/allowances/employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          allowanceTypeId: assigningType.id,
          frequency,
          effectiveFrom: startDate,
          effectiveTo: endDate || null,
          payrollCutoff,
          prorated,
          proratedBy,
          assignments,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        toast.success(`Allowance assigned to ${result.length} employee(s)`);
        setAssignDialogOpen(false);
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to assign');
      }
    } catch (error) {
      toast.error('Failed to assign allowances');
    } finally {
      setBulkSaving(false);
    }
  };

  // Edit single assignment
  const handleSaveEdit = async () => {
    if (!editingAssignment) return;
    try {
      const res = await fetch('/api/allowances/employee', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingAssignment.id,
          amount: editForm.amount,
          frequency: editForm.frequency,
          effectiveFrom: editForm.effectiveFrom,
          effectiveTo: editForm.effectiveTo || null,
        }),
      });

      if (res.ok) {
        toast.success('Allowance updated');
        setEditDialogOpen(false);
        setEditingAssignment(null);
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update');
      }
    } catch (error) {
      toast.error('Failed to update allowance');
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    if (!confirm('Are you sure you want to remove this allowance?')) return;
    try {
      const res = await fetch(`/api/allowances/employee?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Allowance removed');
        fetchData();
      } else {
        toast.error('Failed to remove');
      }
    } catch (error) {
      toast.error('Failed to remove');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  const handleSort = (field: 'employeeId' | 'name') => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  if (loading) {
    return (
      <div>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-lg sm:text-2xl font-bold">Allowances Management</h1>
        <p className="text-sm text-muted-foreground">Manage allowance types and employee assignments</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Wallet className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Allowance Types</p>
                <p className="text-2xl font-bold">{allowanceTypes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Assignments</p>
                <p className="text-2xl font-bold">
                  {employeeAllowances.filter(ea => ea.isActive).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Wallet className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Monthly</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(
                    employeeAllowances
                      .filter(ea => ea.isActive)
                      .reduce((sum, ea) => sum + ea.amount, 0)
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="types">Allowance Types</TabsTrigger>
          <TabsTrigger value="assignments">Employee Allowances</TabsTrigger>
        </TabsList>

        <TabsContent value="types" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Allowance Types</CardTitle>
              {canManage && (
                <Button onClick={() => {
                  setEditingType(null);
                  setTypeForm({ name: '', description: '', isTaxable: true });
                  setTypeDialogOpen(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Type
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Taxable</TableHead>
                    <TableHead>Employees</TableHead>
                    <TableHead>Status</TableHead>
                    {canManage && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allowanceTypes.map((type) => (
                    <TableRow key={type.id}>
                      <TableCell className="font-medium">{type.name}</TableCell>
                      <TableCell>{type.description || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={type.isTaxable ? 'default' : 'secondary'}>
                          {type.isTaxable ? 'Yes' : 'No'}
                        </Badge>
                      </TableCell>
                      <TableCell>{type._count?.employeeAllowances || 0}</TableCell>
                      <TableCell>
                        <Badge variant={type.isActive ? 'default' : 'destructive'}>
                          {type.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      {canManage && (
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openAssignDialog(type)}
                              title="Assign to employees"
                            >
                              <Users className="h-4 w-4 mr-1" />
                              Assign
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingType(type);
                                setTypeForm({
                                  name: type.name,
                                  description: type.description || '',
                                  isTaxable: type.isTaxable,
                                });
                                setTypeDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteType(type.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Employee Allowances</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Allowance Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Effective From</TableHead>
                    <TableHead>Effective To</TableHead>
                    <TableHead>Status</TableHead>
                    {canManage && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeeAllowances.map((ea) => (
                    <TableRow key={ea.id}>
                      <TableCell>
                        {ea.employee ? `${ea.employee.lastName}, ${ea.employee.firstName}` : 'Unknown'}
                      </TableCell>
                      <TableCell>{ea.allowanceType.name}</TableCell>
                      <TableCell>{formatCurrency(ea.amount)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{ea.frequency}</Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(ea.effectiveFrom).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {ea.effectiveTo ? new Date(ea.effectiveTo).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={ea.isActive ? 'default' : 'destructive'}>
                          {ea.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      {canManage && (
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingAssignment(ea);
                                setEditForm({
                                  amount: ea.amount.toString(),
                                  frequency: ea.frequency,
                                  effectiveFrom: new Date(ea.effectiveFrom).toISOString().split('T')[0],
                                  effectiveTo: ea.effectiveTo ? new Date(ea.effectiveTo).toISOString().split('T')[0] : '',
                                });
                                setEditDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteAssignment(ea.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {employeeAllowances.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No employee allowances assigned yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Type Dialog */}
      <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingType ? 'Edit Allowance Type' : 'Add Allowance Type'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={typeForm.name}
                onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                placeholder="e.g., Monthly Performance Bonus"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={typeForm.description}
                onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={typeForm.isTaxable}
                onCheckedChange={(checked) => setTypeForm({ ...typeForm, isTaxable: checked })}
              />
              <Label>Taxable</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTypeDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveType}>
              {editingType ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== ASSIGN EMPLOYEES DIALOG (new bulk mode) ===== */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">
              ASSIGN EMPLOYEES - <span className="text-teal-600">{assigningType?.name}</span>
            </DialogTitle>
          </DialogHeader>

          {/* Top bar: Department / Employee toggle */}
          <div className="flex items-center gap-3 border-b pb-3">
            {filterMode === 'department' ? (
              <>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger className="w-[250px]">
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="link" className="text-teal-600" onClick={() => setFilterMode('employee')}>
                  <Search className="h-4 w-4 mr-1" />
                  Search by Employee
                </Button>
              </>
            ) : (
              <>
                <div className="relative flex-1 max-w-[350px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={employeeSearch}
                    onChange={e => setEmployeeSearch(e.target.value)}
                    placeholder="Search Employees"
                    className="pl-9"
                  />
                </div>
                <Button variant="link" className="text-teal-600" onClick={() => setFilterMode('department')}>
                  <Building2 className="h-4 w-4 mr-1" />
                  Assign by Department
                </Button>
              </>
            )}
          </div>

          {/* Settings row */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Payment Scheme</Label>
                <Select value={paymentScheme} onValueChange={setPaymentScheme}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ONE_TIME">One-time</SelectItem>
                    <SelectItem value="RECURRING">Recurring</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Payroll Cut-off</Label>
                <Select value={payrollCutoff} onValueChange={setPayrollCutoff}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Option" />
                  </SelectTrigger>
                  <SelectContent>
                    {payrollCutoffs.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Prorated</Label>
                <Select value={prorated} onValueChange={setProrated}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no">No</SelectItem>
                    <SelectItem value="yes">Yes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Prorated By</Label>
                <Select value={proratedBy} onValueChange={setProratedBy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="working_days">Working Days</SelectItem>
                    <SelectItem value="calendar_days">Calendar Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Start Date</Label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">End Date</Label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Employee table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={filteredEmployees.length > 0 && filteredEmployees.every(e => selectedEmployees.has(e.id))}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort('employeeId')}
                  >
                    <div className="flex items-center gap-1">
                      EMPLOYEE ID
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      EMPLOYEE NAME
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead>DEPARTMENT</TableHead>
                  <TableHead className="text-right">AMOUNT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                      {filterMode === 'department' && !selectedDepartment
                        ? 'Select a department to view employees'
                        : 'No Employees Found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees.map(emp => {
                    const isChecked = selectedEmployees.has(emp.id);
                    return (
                      <TableRow
                        key={emp.id}
                        className={isChecked ? 'bg-teal-50' : ''}
                      >
                        <TableCell>
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleEmployee(emp.id)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">{emp.employeeId}</TableCell>
                        <TableCell>{emp.lastName}, {emp.firstName}</TableCell>
                        <TableCell>{emp.department?.name || '-'}</TableCell>
                        <TableCell className="text-right">
                          {isChecked && (
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              className="w-[120px] ml-auto text-right"
                              value={selectedEmployees.get(emp.id) || ''}
                              onChange={e => setEmployeeAmount(emp.id, e.target.value)}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <DialogFooter className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {selectedEmployees.size} employee(s) selected
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleBulkAssign} disabled={bulkSaving}>
                {bulkSaving ? 'Saving...' : 'Assign Allowance'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit single assignment dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Allowance Assignment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Employee</Label>
              <Input
                disabled
                value={editingAssignment?.employee ? `${editingAssignment.employee.lastName}, ${editingAssignment.employee.firstName}` : ''}
              />
            </div>
            <div>
              <Label>Allowance Type</Label>
              <Input disabled value={editingAssignment?.allowanceType.name || ''} />
            </div>
            <div>
              <Label>Amount (₱)</Label>
              <Input
                type="number"
                value={editForm.amount}
                onChange={e => setEditForm({ ...editForm, amount: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Frequency</Label>
              <Select value={editForm.frequency} onValueChange={v => setEditForm({ ...editForm, frequency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="SEMI_MONTHLY">Semi-Monthly</SelectItem>
                  <SelectItem value="ONE_TIME">One-Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Effective From</Label>
                <Input type="date" value={editForm.effectiveFrom} onChange={e => setEditForm({ ...editForm, effectiveFrom: e.target.value })} />
              </div>
              <div>
                <Label>Effective To (Optional)</Label>
                <Input type="date" value={editForm.effectiveTo} onChange={e => setEditForm({ ...editForm, effectiveTo: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
