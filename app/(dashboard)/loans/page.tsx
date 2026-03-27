'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, CreditCard, DollarSign, TrendingDown } from 'lucide-react';

interface LoanType {
  id: string;
  name: string;
  description: string | null;
  maxAmount: number | null;
  maxTermMonths: number | null;
  interestRate: number;
  isActive: boolean;
  _count?: { employeeLoans: number };
}

interface EmployeeLoan {
  id: string;
  employeeId: string;
  loanTypeId: string;
  principalAmount: number;
  interestAmount: number;
  totalAmount: number;
  monthlyDeduction: number;
  termMonths: number;
  startDate: string;
  endDate: string | null;
  amountPaid: number;
  remainingBalance: number;
  status: string;
  isActive: boolean;
  notes: string | null;
  loanType: LoanType;
  payments: any[];
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
  };
}

interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
}

export default function LoansPage() {
  const { data: session } = useSession() || {};
  const router = useRouter();
  const [loanTypes, setLoanTypes] = useState<LoanType[]>([]);
  const [employeeLoans, setEmployeeLoans] = useState<EmployeeLoan[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('loans');
  
  // Type Dialog
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<LoanType | null>(null);
  const [typeForm, setTypeForm] = useState({
    name: '',
    description: '',
    maxAmount: '',
    maxTermMonths: '',
    interestRate: '0',
  });

  // Loan Dialog
  const [loanDialogOpen, setLoanDialogOpen] = useState(false);
  const [loanForm, setLoanForm] = useState({
    employeeId: '',
    loanTypeId: '',
    principalAmount: '',
    termMonths: '',
    startDate: '',
    notes: '',
    applicationDate: '',
    loanDate: '',
    referenceNumber: '',
    firstAmortizationDate: '',
    payrollCutoff: '',
    remarks: '',
  });

  const userRole = (session?.user as any)?.role;
  const canManage = ['ADMIN', 'HR'].includes(userRole);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [typesRes, loansRes, employeesRes] = await Promise.all([
        fetch('/api/loans/types'),
        fetch('/api/loans/employee'),
        fetch('/api/employees'),
      ]);

      if (typesRes.ok) {
        setLoanTypes(await typesRes.json());
      }
      if (loansRes.ok) {
        setEmployeeLoans(await loansRes.json());
      }
      if (employeesRes.ok) {
        const data = await employeesRes.json();
        setEmployees(data.employees || data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Type CRUD
  const handleSaveType = async () => {
    try {
      const url = '/api/loans/types';
      const method = editingType ? 'PUT' : 'POST';
      const body = editingType ? { id: editingType.id, ...typeForm } : typeForm;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(editingType ? 'Loan type updated' : 'Loan type created');
        setTypeDialogOpen(false);
        setEditingType(null);
        setTypeForm({ name: '', description: '', maxAmount: '', maxTermMonths: '', interestRate: '0' });
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to save');
      }
    } catch (error) {
      toast.error('Failed to save loan type');
    }
  };

  const handleDeleteType = async (id: string) => {
    if (!confirm('Are you sure you want to delete this loan type?')) return;
    try {
      const res = await fetch(`/api/loans/types?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Loan type deleted');
        fetchData();
      } else {
        toast.error('Failed to delete');
      }
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  // Loan CRUD
  const handleCreateLoan = async () => {
    try {
      const res = await fetch('/api/loans/employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loanForm),
      });

      if (res.ok) {
        toast.success('Loan created successfully');
        setLoanDialogOpen(false);
        setLoanForm({
          employeeId: '',
          loanTypeId: '',
          principalAmount: '',
          termMonths: '',
          startDate: '',
          notes: '',
          applicationDate: '',
          loanDate: '',
          referenceNumber: '',
          firstAmortizationDate: '',
          payrollCutoff: '',
          remarks: '',
        });
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to create loan');
      }
    } catch (error) {
      toast.error('Failed to create loan');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'secondary';
      case 'APPROVED': return 'default';
      case 'ACTIVE': return 'default';
      case 'FULLY_PAID': return 'outline';
      case 'CANCELLED': return 'destructive';
      default: return 'secondary';
    }
  };

  // Calculate loan preview
  const selectedLoanType = loanTypes.find(t => t.id === loanForm.loanTypeId);
  const principalAmount = parseFloat(loanForm.principalAmount) || 0;
  const termMonths = parseInt(loanForm.termMonths) || 0;
  const interestRate = selectedLoanType?.interestRate || 0;
  const interestAmount = principalAmount * (interestRate / 100) * (termMonths / 12);
  const totalAmount = principalAmount + interestAmount;
  const monthlyDeduction = termMonths > 0 ? totalAmount / termMonths : 0;

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

  const activeLoans = employeeLoans.filter(l => ['APPROVED', 'ACTIVE'].includes(l.status));
  const totalOutstanding = activeLoans.reduce((sum, l) => sum + l.remainingBalance, 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-lg sm:text-2xl font-bold">Loans Management</h1>
        <p className="text-sm text-muted-foreground">Manage loan types and employee loans</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <CreditCard className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Loan Types</p>
                <p className="text-2xl font-bold">{loanTypes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Loans</p>
                <p className="text-2xl font-bold">{activeLoans.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <TrendingDown className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Outstanding</p>
                <p className="text-2xl font-bold">{formatCurrency(totalOutstanding)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <CreditCard className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fully Paid</p>
                <p className="text-2xl font-bold">
                  {employeeLoans.filter(l => l.status === 'FULLY_PAID').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="loans">Employee Loans</TabsTrigger>
          <TabsTrigger value="types">Loan Types</TabsTrigger>
        </TabsList>

        <TabsContent value="loans" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Employee Loans</CardTitle>
              {canManage && (
                <Button onClick={() => setLoanDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Loan
                </Button>
              )}
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Employee</TableHead>
                    <TableHead className="whitespace-nowrap">Loan Type</TableHead>
                    <TableHead className="whitespace-nowrap">Principal</TableHead>
                    <TableHead className="whitespace-nowrap hidden sm:table-cell">Total Amount</TableHead>
                    <TableHead className="whitespace-nowrap hidden md:table-cell">Monthly Deduction</TableHead>
                    <TableHead className="whitespace-nowrap">Remaining</TableHead>
                    <TableHead className="whitespace-nowrap hidden sm:table-cell">Progress</TableHead>
                    <TableHead className="whitespace-nowrap">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeeLoans.map((loan) => {
                    const progress = ((loan.amountPaid / loan.totalAmount) * 100);
                    return (
                      <TableRow key={loan.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/loans/${loan.id}`)}>
                        <TableCell>
                          {loan.employee ? `${loan.employee.firstName} ${loan.employee.lastName}` : 'Unknown'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{loan.loanType.name}</TableCell>
                        <TableCell className="whitespace-nowrap">{formatCurrency(loan.principalAmount)}</TableCell>
                        <TableCell className="whitespace-nowrap hidden sm:table-cell">{formatCurrency(loan.totalAmount)}</TableCell>
                        <TableCell className="whitespace-nowrap hidden md:table-cell">{formatCurrency(loan.monthlyDeduction)}</TableCell>
                        <TableCell className="whitespace-nowrap">{formatCurrency(loan.remainingBalance)}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="w-24">
                            <Progress value={progress} className="h-2" />
                            <span className="text-xs text-muted-foreground">
                              {progress.toFixed(0)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge variant={getStatusColor(loan.status) as any}>
                              {loan.status}
                            </Badge>
                            {!loan.isActive && (
                              <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                                Disabled
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="types" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Loan Types</CardTitle>
              {canManage && (
                <Button onClick={() => {
                  setEditingType(null);
                  setTypeForm({ name: '', description: '', maxAmount: '', maxTermMonths: '', interestRate: '0' });
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
                    <TableHead>Max Amount</TableHead>
                    <TableHead>Max Term</TableHead>
                    <TableHead>Interest Rate</TableHead>
                    <TableHead>Active Loans</TableHead>
                    <TableHead>Status</TableHead>
                    {canManage && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loanTypes.map((type) => (
                    <TableRow key={type.id}>
                      <TableCell className="font-medium">{type.name}</TableCell>
                      <TableCell>{type.description || '-'}</TableCell>
                      <TableCell>
                        {type.maxAmount ? formatCurrency(type.maxAmount) : 'No limit'}
                      </TableCell>
                      <TableCell>
                        {type.maxTermMonths ? `${type.maxTermMonths} months` : 'No limit'}
                      </TableCell>
                      <TableCell>{type.interestRate}%</TableCell>
                      <TableCell>{type._count?.employeeLoans || 0}</TableCell>
                      <TableCell>
                        <Badge variant={type.isActive ? 'default' : 'destructive'}>
                          {type.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      {canManage && (
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingType(type);
                                setTypeForm({
                                  name: type.name,
                                  description: type.description || '',
                                  maxAmount: type.maxAmount?.toString() || '',
                                  maxTermMonths: type.maxTermMonths?.toString() || '',
                                  interestRate: type.interestRate.toString(),
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
      </Tabs>

      {/* Type Dialog */}
      <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingType ? 'Edit Loan Type' : 'Add Loan Type'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={typeForm.name}
                onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                placeholder="e.g., Salary Loan"
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Max Amount (₱)</Label>
                <Input
                  type="number"
                  value={typeForm.maxAmount}
                  onChange={(e) => setTypeForm({ ...typeForm, maxAmount: e.target.value })}
                  placeholder="Leave empty for no limit"
                />
              </div>
              <div>
                <Label>Max Term (Months)</Label>
                <Input
                  type="number"
                  value={typeForm.maxTermMonths}
                  onChange={(e) => setTypeForm({ ...typeForm, maxTermMonths: e.target.value })}
                  placeholder="Leave empty for no limit"
                />
              </div>
            </div>
            <div>
              <Label>Interest Rate (% per annum)</Label>
              <Input
                type="number"
                step="0.01"
                value={typeForm.interestRate}
                onChange={(e) => setTypeForm({ ...typeForm, interestRate: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTypeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveType}>
              {editingType ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Loan Dialog */}
      <Dialog open={loanDialogOpen} onOpenChange={setLoanDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Loan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Employee</Label>
              <Select
                value={loanForm.employeeId}
                onValueChange={(value) => setLoanForm({ ...loanForm, employeeId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Loan Type</Label>
              <Select
                value={loanForm.loanTypeId}
                onValueChange={(value) => setLoanForm({ ...loanForm, loanTypeId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select loan type" />
                </SelectTrigger>
                <SelectContent>
                  {loanTypes.filter(t => t.isActive).map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name} ({type.interestRate}% interest)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Principal Amount (₱)</Label>
                <Input
                  type="number"
                  value={loanForm.principalAmount}
                  onChange={(e) => setLoanForm({ ...loanForm, principalAmount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Term (Months)</Label>
                <Input
                  type="number"
                  value={loanForm.termMonths}
                  onChange={(e) => setLoanForm({ ...loanForm, termMonths: e.target.value })}
                  placeholder="12"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Application Date</Label>
                <Input
                  type="date"
                  value={loanForm.applicationDate}
                  onChange={(e) => setLoanForm({ ...loanForm, applicationDate: e.target.value })}
                />
              </div>
              <div>
                <Label>Loan Date / Start Date</Label>
                <Input
                  type="date"
                  value={loanForm.startDate}
                  onChange={(e) => setLoanForm({ ...loanForm, startDate: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Reference Number</Label>
                <Input
                  value={loanForm.referenceNumber}
                  onChange={(e) => setLoanForm({ ...loanForm, referenceNumber: e.target.value })}
                  placeholder="e.g., LN-2026-001"
                />
              </div>
              <div>
                <Label>First Amortization Date</Label>
                <Input
                  type="date"
                  value={loanForm.firstAmortizationDate}
                  onChange={(e) => setLoanForm({ ...loanForm, firstAmortizationDate: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Payroll Cut-off</Label>
              <Input
                value={loanForm.payrollCutoff}
                onChange={(e) => setLoanForm({ ...loanForm, payrollCutoff: e.target.value })}
                placeholder="e.g., Every 10th & 25th"
              />
            </div>
            <div>
              <Label>Remarks</Label>
              <Textarea
                value={loanForm.remarks}
                onChange={(e) => setLoanForm({ ...loanForm, remarks: e.target.value })}
                placeholder="Optional remarks"
              />
            </div>

            {/* Loan Preview */}
            {principalAmount > 0 && termMonths > 0 && (
              <Card className="bg-muted">
                <CardContent className="p-4 space-y-2">
                  <h4 className="font-semibold">Loan Summary</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span>Principal:</span>
                    <span className="text-right">{formatCurrency(principalAmount)}</span>
                    <span>Interest ({interestRate}%):</span>
                    <span className="text-right">{formatCurrency(interestAmount)}</span>
                    <span className="font-semibold">Total Amount:</span>
                    <span className="text-right font-semibold">{formatCurrency(totalAmount)}</span>
                    <span>Monthly Deduction:</span>
                    <span className="text-right">{formatCurrency(monthlyDeduction)}</span>
                    <span>Semi-Monthly Deduction:</span>
                    <span className="text-right">{formatCurrency(monthlyDeduction / 2)}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLoanDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateLoan}>
              Create Loan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
