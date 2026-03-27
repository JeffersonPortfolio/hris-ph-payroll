'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, ArrowUpDown } from 'lucide-react';

interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  department?: { id: string; name: string };
}

interface Adjustment {
  id: string;
  employeeId: string;
  adjustmentName: string;
  adjustmentType: string;
  amount: number;
  payrollCutoff: string | null;
  includeInGross: boolean;
  addedById: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  employee?: Employee;
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

    const prevD = new Date(y, m - 1, 1);
    const prevM = prevD.getMonth();
    const prevY = prevD.getFullYear();
    cutoffs.push({
      label: `26 ${months[prevM]} - 10 ${mLabel} ${y}`,
      value: `${prevY}-${String(prevM + 1).padStart(2, '0')}-26_${y}-${String(m + 1).padStart(2, '0')}-10`,
    });
    cutoffs.push({
      label: `11 ${mLabel} - 25 ${mLabel} ${y}`,
      value: `${y}-${String(m + 1).padStart(2, '0')}-11_${y}-${String(m + 1).padStart(2, '0')}-25`,
    });
  }
  return cutoffs;
}

export default function AdjustmentsPage() {
  const { data: session } = useSession() || {};
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Adjustment | null>(null);
  const [form, setForm] = useState({
    employeeId: '',
    adjustmentName: '',
    adjustmentType: 'BONUS',
    amount: '',
    payrollCutoff: '',
    includeInGross: true,
    notes: '',
  });

  const [sortField, setSortField] = useState<'employeeId' | 'name' | 'adjustmentName'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const userRole = (session?.user as any)?.role;
  const canManage = ['ADMIN', 'HR'].includes(userRole);
  const userName = (session?.user as any)?.name || 'Admin';

  const payrollCutoffs = useMemo(() => generatePayrollCutoffs(), []);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [adjRes, empRes] = await Promise.all([
        fetch('/api/adjustments'),
        fetch('/api/employees?limit=1000'),
      ]);
      if (adjRes.ok) setAdjustments(await adjRes.json());
      if (empRes.ok) {
        const data = await empRes.json();
        setEmployees(data.employees || data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const selectedEmployee = employees.find(e => e.id === form.employeeId);

  const openAddDialog = () => {
    setEditing(null);
    setForm({
      employeeId: '',
      adjustmentName: '',
      adjustmentType: 'BONUS',
      amount: '',
      payrollCutoff: '',
      includeInGross: true,
      notes: '',
    });
    setDialogOpen(true);
  };

  const openEditDialog = (adj: Adjustment) => {
    setEditing(adj);
    setForm({
      employeeId: adj.employeeId,
      adjustmentName: adj.adjustmentName,
      adjustmentType: adj.adjustmentType,
      amount: adj.amount.toString(),
      payrollCutoff: adj.payrollCutoff || '',
      includeInGross: adj.includeInGross,
      notes: adj.notes || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.employeeId || !form.adjustmentName || !form.amount) {
      toast.error('Please fill in Employee, Adjustment Name, and Amount');
      return;
    }

    try {
      const url = '/api/adjustments';
      const method = editing ? 'PUT' : 'POST';
      const body = editing ? { id: editing.id, ...form } : form;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(editing ? 'Adjustment updated' : 'Adjustment added');
        setDialogOpen(false);
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to save');
      }
    } catch (error) {
      toast.error('Failed to save adjustment');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this adjustment?')) return;
    try {
      const res = await fetch(`/api/adjustments?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Adjustment deleted');
        fetchData();
      } else {
        toast.error('Failed to delete');
      }
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);

  const getCutoffLabel = (value: string | null) => {
    if (!value) return '-';
    const found = payrollCutoffs.find(c => c.value === value);
    return found ? found.label : value;
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortedAdjustments = useMemo(() => {
    return [...adjustments].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'employeeId') {
        cmp = (a.employee?.employeeId || '').localeCompare(b.employee?.employeeId || '');
      } else if (sortField === 'name') {
        const nameA = `${a.employee?.lastName || ''}, ${a.employee?.firstName || ''}`;
        const nameB = `${b.employee?.lastName || ''}, ${b.employee?.firstName || ''}`;
        cmp = nameA.localeCompare(nameB);
      } else {
        cmp = a.adjustmentName.localeCompare(b.adjustmentName);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [adjustments, sortField, sortDir]);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold">ADJUSTMENTS</h1>
          <p className="text-sm text-muted-foreground">Manage payroll adjustments for employees</p>
        </div>
        {canManage && (
          <Button onClick={openAddDialog} className="bg-amber-700 hover:bg-amber-800 text-white">
            <Plus className="h-4 w-4 mr-2" />
            ADD ADJUSTMENT
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('employeeId')}>
                  <div className="flex items-center gap-1">
                    EMPLOYEE ID <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1">
                    EMPLOYEE NAME <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('adjustmentName')}>
                  <div className="flex items-center gap-1">
                    ADJUSTMENT NAME <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead>TYPE</TableHead>
                <TableHead className="text-right">AMOUNT</TableHead>
                <TableHead>PAYROLL CUT-OFF</TableHead>
                <TableHead>ADDED BY</TableHead>
                {canManage && <TableHead>ACTIONS</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAdjustments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    No adjustments found
                  </TableCell>
                </TableRow>
              ) : (
                sortedAdjustments.map((adj) => (
                  <TableRow key={adj.id}>
                    <TableCell className="font-mono text-sm">{adj.employee?.employeeId || '-'}</TableCell>
                    <TableCell>
                      {adj.employee
                        ? `${adj.employee.lastName}, ${adj.employee.firstName}`
                        : 'Unknown'}
                    </TableCell>
                    <TableCell>{adj.adjustmentName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{adj.adjustmentType}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(adj.amount)}
                    </TableCell>
                    <TableCell className="text-sm">{getCutoffLabel(adj.payrollCutoff)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{userName}</TableCell>
                    {canManage && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(adj)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(adj.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      {/* ADD / EDIT ADJUSTMENT DIALOG */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'EDIT ADJUSTMENT' : 'ADD ADJUSTMENT'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-[160px_1fr] items-center gap-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Employee Name</Label>
              <Select
                value={form.employeeId}
                onValueChange={(v) => setForm({ ...form, employeeId: v })}
                disabled={!!editing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an Employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.lastName}, {emp.firstName} ({emp.employeeId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-[160px_1fr] items-center gap-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Employee ID</Label>
              <Input readOnly value={selectedEmployee?.employeeId || ''} className="bg-gray-50" />
            </div>

            <div className="grid grid-cols-[160px_1fr] items-center gap-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Adjustment Name</Label>
              <Input
                value={form.adjustmentName}
                onChange={e => setForm({ ...form, adjustmentName: e.target.value })}
                placeholder="e.g., P. Bonus 2026 (50%)"
              />
            </div>

            <div className="grid grid-cols-[160px_1fr] items-center gap-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Adjustment Type</Label>
              <Select value={form.adjustmentType} onValueChange={v => setForm({ ...form, adjustmentType: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Adjustment Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BONUS">Bonus</SelectItem>
                  <SelectItem value="COMMISSION">Commission</SelectItem>
                  <SelectItem value="REIMBURSEMENT">Reimbursement</SelectItem>
                  <SelectItem value="INCENTIVE">Incentive</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-[160px_1fr] items-center gap-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Amount</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                placeholder="Enter amount"
              />
            </div>

            <div className="grid grid-cols-[160px_1fr] items-center gap-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Payroll Cut-off</Label>
              <Select value={form.payrollCutoff} onValueChange={v => setForm({ ...form, payrollCutoff: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Payroll Cut-off" />
                </SelectTrigger>
                <SelectContent>
                  {payrollCutoffs.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Checkbox
                id="includeInGross"
                checked={form.includeInGross}
                onCheckedChange={(checked) => setForm({ ...form, includeInGross: !!checked })}
              />
              <label htmlFor="includeInGross" className="text-sm cursor-pointer">
                Include in Gross Actual Pay during Tax Annualization
              </label>
            </div>
          </div>

          <DialogFooter className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>CLOSE</Button>
            <Button
              variant="link"
              className="text-teal-600 font-semibold uppercase"
              onClick={handleSave}
            >
              {editing ? 'UPDATE ADJUSTMENT' : 'ADD ADJUSTMENT'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
