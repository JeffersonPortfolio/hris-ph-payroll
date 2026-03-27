'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ArrowLeft, Pencil } from 'lucide-react';
import { format } from 'date-fns';

interface LoanPayment {
  id: string;
  amount: number;
  paymentDate: string;
  cutoffLabel: string | null;
  cutoffStart: string | null;
  cutoffEnd: string | null;
  paymentStatus: 'PAID' | 'UNPAID';
  notes: string | null;
}

interface LoanDetail {
  id: string;
  employeeId: string;
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
  notes: string | null;
  applicationDate: string | null;
  loanDate: string | null;
  referenceNumber: string | null;
  firstAmortizationDate: string | null;
  payrollCutoff: string | null;
  remarks: string | null;
  isActive: boolean;
  loanType: { id: string; name: string; interestRate: number };
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    middleName?: string | null;
    employeeId: string;
    email: string;
    department: { name: string } | null;
    role: { name: string } | null;
  };
  payments: LoanPayment[];
}

export default function LoanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession() || {};
  const [loan, setLoan] = useState<LoanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDetailsOpen, setEditDetailsOpen] = useState(false);
  const [editAmountsOpen, setEditAmountsOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    applicationDate: '',
    loanDate: '',
    referenceNumber: '',
    firstAmortizationDate: '',
    payrollCutoff: '',
    remarks: '',
  });
  const [editPayments, setEditPayments] = useState<{ id: string; amount: string }[]>([]);

  const userRole = (session?.user as any)?.role;
  const canManage = ['ADMIN', 'HR'].includes(userRole);

  const fetchLoan = useCallback(async () => {
    try {
      const res = await fetch(`/api/loans/employee/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setLoan(data);
      } else {
        toast.error('Loan not found');
        router.push('/loans');
      }
    } catch (error) {
      console.error('Error fetching loan:', error);
      toast.error('Failed to load loan details');
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    fetchLoan();
  }, [fetchLoan]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), 'dd MMM yyyy');
    } catch {
      return '-';
    }
  };

  const handleToggleActive = async () => {
    if (!loan) return;
    try {
      const res = await fetch(`/api/loans/employee/${loan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggleActive' }),
      });
      if (res.ok) {
        toast.success(loan.isActive ? 'Loan deactivated' : 'Loan activated');
        fetchLoan();
      }
    } catch {
      toast.error('Failed to toggle loan status');
    }
  };

  const handleMarkPaid = async (paymentId: string) => {
    if (!loan) return;
    try {
      const res = await fetch(`/api/loans/employee/${loan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'markPaid', paymentId }),
      });
      if (res.ok) {
        toast.success('Payment status updated');
        fetchLoan();
      }
    } catch {
      toast.error('Failed to update payment');
    }
  };

  const handleEditDetails = () => {
    if (!loan) return;
    setEditForm({
      applicationDate: loan.applicationDate ? new Date(loan.applicationDate).toISOString().split('T')[0] : '',
      loanDate: loan.loanDate ? new Date(loan.loanDate).toISOString().split('T')[0] : '',
      referenceNumber: loan.referenceNumber || '',
      firstAmortizationDate: loan.firstAmortizationDate ? new Date(loan.firstAmortizationDate).toISOString().split('T')[0] : '',
      payrollCutoff: loan.payrollCutoff || '',
      remarks: loan.remarks || '',
    });
    setEditDetailsOpen(true);
  };

  const handleSaveDetails = async () => {
    if (!loan) return;
    try {
      const res = await fetch(`/api/loans/employee/${loan.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        toast.success('Details updated');
        setEditDetailsOpen(false);
        fetchLoan();
      } else {
        toast.error('Failed to update');
      }
    } catch {
      toast.error('Failed to update details');
    }
  };

  const handleOpenEditAmounts = () => {
    if (!loan) return;
    setEditPayments(loan.payments.map(p => ({ id: p.id, amount: p.amount.toString() })));
    setEditAmountsOpen(true);
  };

  const handleSaveAmounts = async () => {
    if (!loan) return;
    try {
      const payments = editPayments.map(p => ({
        id: p.id,
        amount: parseFloat(p.amount) || 0,
      }));
      const res = await fetch(`/api/loans/employee/${loan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateAmounts', payments }),
      });
      if (res.ok) {
        toast.success('Amounts updated');
        setEditAmountsOpen(false);
        fetchLoan();
      } else {
        toast.error('Failed to update amounts');
      }
    } catch {
      toast.error('Failed to update amounts');
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

  if (!loan) {
    return (
      <div>
        <p>Loan not found.</p>
      </div>
    );
  }

  const paidPayments = loan.payments.filter(p => p.paymentStatus === 'PAID');
  const totalPayment = loan.payments.reduce((s, p) => s + p.amount, 0);
  const amountPaid = paidPayments.reduce((s, p) => s + p.amount, 0);
  const remaining = totalPayment - amountPaid;
  const lastPayment = loan.payments[loan.payments.length - 1];
  const payoffDate = lastPayment ? formatDate(lastPayment.cutoffEnd) : '-';

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/loans')} className="self-start">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold truncate">
            {loan.loanType.name} - {loan.employee.firstName} {loan.employee.lastName}
          </h1>
          <p className="text-sm text-muted-foreground">
            {loan.employee.employeeId} &bull; {loan.employee.department?.name || 'No Department'}
          </p>
        </div>
        <div className="self-start sm:self-auto">
          <Badge variant={loan.status === 'ACTIVE' ? 'default' : loan.status === 'FULLY_PAID' ? 'outline' : 'secondary'}>
            {loan.status}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Loan Details */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Loan Details</CardTitle>
            {canManage && (
              <button
                onClick={handleEditDetails}
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                <Pencil className="h-3 w-3" /> Edit Details
              </button>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Employee Name</p>
                <p className="font-medium">{loan.employee.firstName} {loan.employee.middleName ? loan.employee.middleName + ' ' : ''}{loan.employee.lastName}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Employee Number</p>
                <p className="font-medium">{loan.employee.employeeId}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Department</p>
                <p className="font-medium">{loan.employee.department?.name || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Designation</p>
                <p className="font-medium">{loan.employee.role?.name || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Payroll Frequency</p>
                <p className="font-medium">Semi-Monthly</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Loan Type</p>
                <p className="font-medium">{loan.loanType.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Application Date</p>
                <p className="font-medium">{formatDate(loan.applicationDate)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Loan Date</p>
                <p className="font-medium">{formatDate(loan.loanDate || loan.startDate)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Reference Number</p>
                <p className="font-medium">{loan.referenceNumber || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Loan Amount</p>
                <p className="font-medium">{formatCurrency(loan.principalAmount)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Loan Term</p>
                <p className="font-medium">{loan.termMonths} month{loan.termMonths !== 1 ? 's' : ''}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Monthly Amortization</p>
                <p className="font-medium">{formatCurrency(loan.monthlyDeduction)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">First Amortization Date</p>
                <p className="font-medium">{formatDate(loan.firstAmortizationDate || loan.startDate)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Payroll Cut-off</p>
                <p className="font-medium">{loan.payrollCutoff || 'Default'}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-muted-foreground text-xs">Remarks</p>
                <p className="font-medium">{loan.remarks || loan.notes || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Panel - Amortization Schedule */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Amortization Schedule</CardTitle>
            {canManage && (
              <Button variant="outline" size="sm" onClick={handleOpenEditAmounts}>
                Edit Amount
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payroll Cut-off</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loan.payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="text-sm">
                        {payment.cutoffLabel || formatDate(payment.paymentDate)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell className="text-center">
                        {canManage ? (
                          <button
                            onClick={() => handleMarkPaid(payment.id)}
                            className={`text-xs font-semibold px-2 py-1 rounded ${
                              payment.paymentStatus === 'PAID'
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-teal-50 text-teal-600 hover:bg-teal-100'
                            }`}
                          >
                            {payment.paymentStatus === 'PAID' ? 'Paid' : 'Unpaid'}
                          </button>
                        ) : (
                          <Badge variant={payment.paymentStatus === 'PAID' ? 'default' : 'secondary'}>
                            {payment.paymentStatus === 'PAID' ? 'Paid' : 'Unpaid'}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Summary */}
            <div className="border-t pt-4 space-y-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Total Payment</span>
                <span className="text-right font-semibold">{formatCurrency(totalPayment)}</span>
                <span className="text-muted-foreground">Amount Paid</span>
                <span className="text-right font-semibold text-green-600">{formatCurrency(amountPaid)}</span>
                <span className="text-muted-foreground">Remaining Balance</span>
                <span className="text-right font-semibold text-orange-600">{formatCurrency(remaining)}</span>
                <span className="text-muted-foreground">Pay-off Date</span>
                <span className="text-right font-semibold">{payoffDate}</span>
              </div>
            </div>

            {/* Active Toggle */}
            {canManage && (
              <div className="border-t pt-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Active</p>
                  <p className="text-xs text-muted-foreground">Enable/disable loan deductions</p>
                </div>
                <Switch
                  checked={loan.isActive}
                  onCheckedChange={handleToggleActive}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Details Dialog */}
      <Dialog open={editDetailsOpen} onOpenChange={setEditDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Loan Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Application Date</Label>
                <Input
                  type="date"
                  value={editForm.applicationDate}
                  onChange={(e) => setEditForm({ ...editForm, applicationDate: e.target.value })}
                />
              </div>
              <div>
                <Label>Loan Date</Label>
                <Input
                  type="date"
                  value={editForm.loanDate}
                  onChange={(e) => setEditForm({ ...editForm, loanDate: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Reference Number</Label>
              <Input
                value={editForm.referenceNumber}
                onChange={(e) => setEditForm({ ...editForm, referenceNumber: e.target.value })}
                placeholder="e.g., LN-2026-001"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>First Amortization Date</Label>
                <Input
                  type="date"
                  value={editForm.firstAmortizationDate}
                  onChange={(e) => setEditForm({ ...editForm, firstAmortizationDate: e.target.value })}
                />
              </div>
              <div>
                <Label>Payroll Cut-off</Label>
                <Input
                  value={editForm.payrollCutoff}
                  onChange={(e) => setEditForm({ ...editForm, payrollCutoff: e.target.value })}
                  placeholder="e.g., Every 10th & 25th"
                />
              </div>
            </div>
            <div>
              <Label>Remarks</Label>
              <Textarea
                value={editForm.remarks}
                onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
                placeholder="Optional remarks"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDetailsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDetails}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Amounts Dialog */}
      <Dialog open={editAmountsOpen} onOpenChange={setEditAmountsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Amortization Amounts</DialogTitle>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {editPayments.map((ep, idx) => {
              const original = loan.payments[idx];
              return (
                <div key={ep.id} className="flex items-center gap-3">
                  <span className="text-sm flex-1 text-muted-foreground">
                    {original?.cutoffLabel || `Period ${idx + 1}`}
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    className="w-32"
                    value={ep.amount}
                    onChange={(e) => {
                      const updated = [...editPayments];
                      updated[idx] = { ...updated[idx], amount: e.target.value };
                      setEditPayments(updated);
                    }}
                  />
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditAmountsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAmounts}>Save Amounts</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
