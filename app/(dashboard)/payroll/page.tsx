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
import { toast } from 'sonner';
import { Plus, Play, Check, DollarSign, Calendar, Users, FileText, Eye, Lock, Unlock, Download, RefreshCw, FileSpreadsheet } from 'lucide-react';

interface PayrollPeriod {
  id: string;
  periodType: string;
  startDate: string;
  endDate: string;
  cutoffDate: string;
  payDate: string;
  month: number;
  year: number;
  status: string;
  isLocked: boolean;
  _count?: { payrolls: number };
}

interface Payroll {
  id: string;
  payrollPeriodId: string;
  employeeId: string;
  basicSalary: number;
  basicPay: number;
  overtimePay: number;
  holidayPay: number;
  nightDiffPay: number;
  mobileAllowance: number;
  performancePay: number;
  otherAllowances: number;
  adjustmentTotal: number;
  employerSSS: number;
  employerPhilHealth: number;
  employerPagIbig: number;
  sssContribution: number;
  philHealthContribution: number;
  pagIbigContribution: number;
  withholdingTax?: number;
  salaryLoanDeduction: number;
  computerLoanDeduction: number;
  otherLoanDeductions: number;
  otherDeductions: number;
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
  status: string;
  payrollPeriod: PayrollPeriod;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    department?: { name: string };
  };
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface CutoffSettings {
  cutoff1Start: string;
  cutoff1End: string;
  cutoff2Start: string;
  cutoff2End: string;
}

export default function PayrollPage() {
  const { data: session } = useSession() || {};
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('periods');
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null);
  
  // Cutoff settings from system settings
  const [cutoffSettings, setCutoffSettings] = useState<CutoffSettings>({
    cutoff1Start: '27',
    cutoff1End: '10',
    cutoff2Start: '11',
    cutoff2End: '25',
  });
  
  // Period Dialog
  const [periodDialogOpen, setPeriodDialogOpen] = useState(false);
  const [periodForm, setPeriodForm] = useState({
    month: (new Date().getMonth() + 1).toString(),
    year: new Date().getFullYear().toString(),
    periodType: 'FIRST_HALF',
  });

  // Payroll Detail Dialog
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null);

  const [processing, setProcessing] = useState(false);

  const userRole = (session?.user as any)?.role;
  const canManage = ['ADMIN', 'HR'].includes(userRole);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [periodsRes, settingsRes] = await Promise.all([
        fetch('/api/payroll/periods'),
        fetch('/api/settings'),
      ]);

      if (periodsRes.ok) {
        const data = await periodsRes.json();
        setPeriods(data);
      }
      
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setCutoffSettings({
          cutoff1Start: settingsData.payroll_cutoff_1_start || '27',
          cutoff1End: settingsData.payroll_cutoff_1_end || '10',
          cutoff2Start: settingsData.payroll_cutoff_2_start || '11',
          cutoff2End: settingsData.payroll_cutoff_2_end || '25',
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchPayrolls = async (periodId: string) => {
    try {
      const res = await fetch(`/api/payroll?periodId=${periodId}`);
      if (res.ok) {
        const data = await res.json();
        setPayrolls(data?.payrolls ?? []);
      }
    } catch (error) {
      console.error('Error fetching payrolls:', error);
    }
  };

  const handleCreatePeriod = async () => {
    try {
      const res = await fetch('/api/payroll/periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(periodForm),
      });

      if (res.ok) {
        toast.success('Payroll period created');
        setPeriodDialogOpen(false);
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to create period');
      }
    } catch (error) {
      toast.error('Failed to create period');
    }
  };

  const handleLockAttendance = async (periodId: string, lock: boolean) => {
    const confirmMsg = lock 
      ? 'Lock attendance for this period? Employees will not be able to edit attendance after locking.'
      : 'Unlock attendance for this period?';
    
    if (!confirm(confirmMsg)) return;
    
    try {
      const res = await fetch('/api/payroll/periods', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: periodId, isLocked: lock }),
      });

      if (res.ok) {
        toast.success(lock ? 'Attendance locked' : 'Attendance unlocked');
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update');
      }
    } catch (error) {
      toast.error('Failed to update lock status');
    }
  };

  const handleExportPayroll = async (periodId: string, format: string) => {
    try {
      const res = await fetch(`/api/payroll/export?periodId=${periodId}&format=${format}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const period = periods.find(p => p.id === periodId);
        const filename = `payroll_${period?.periodType}_${period?.month}_${period?.year}.${format === 'excel' ? 'csv' : format}`;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('Payroll exported');
      } else {
        toast.error('Failed to export payroll');
      }
    } catch (error) {
      toast.error('Failed to export payroll');
    }
  };

  const handleProcessPayroll = async (periodId: string) => {
    if (!confirm('Generate/Regenerate payroll for all employees in this period? This will recalculate all earnings and deductions.')) return;
    
    setProcessing(true);
    try {
      const res = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodId }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Payroll generated/regenerated for ${data.count} employees with updated contribution rates`);
        fetchData();
        if (selectedPeriod?.id === periodId) {
          fetchPayrolls(periodId);
        }
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to process payroll');
      }
    } catch (error) {
      toast.error('Failed to process payroll');
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdatePeriodStatus = async (periodId: string, status: string) => {
    const confirmMsg = status === 'APPROVED' 
      ? 'Approve this payroll? This will lock all payroll records.'
      : status === 'PAID'
      ? 'Mark as paid? This will record loan deductions and finalize the payroll.'
      : status === 'PROCESSING'
      ? 'Revert to Processing? This will allow you to regenerate payroll with updated rates.'
      : 'Update status?';

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch('/api/payroll/periods', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: periodId, status }),
      });

      if (res.ok) {
        toast.success(`Payroll ${status.toLowerCase()}`);
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update');
      }
    } catch (error) {
      toast.error('Failed to update status');
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
      case 'DRAFT': return 'secondary';
      case 'PROCESSING': return 'default';
      case 'APPROVED': return 'default';
      case 'PAID': return 'outline';
      case 'CANCELLED': return 'destructive';
      default: return 'secondary';
    }
  };

  const formatPeriodLabel = (period: PayrollPeriod) => {
    const cutoff1Label = `${cutoffSettings.cutoff1Start}-${cutoffSettings.cutoff1End}`;
    const cutoff2Label = `${cutoffSettings.cutoff2Start}-${cutoffSettings.cutoff2End}`;
    const typeLabels: Record<string, string> = {
      'FIRST_HALF': `1st Cutoff (${cutoff1Label})`,
      'SECOND_HALF': `2nd Cutoff (${cutoff2Label})`,
      'MONTHLY': 'Monthly',
      'BI_WEEKLY': 'Bi-Weekly',
    };
    return `${MONTHS[period.month - 1]} ${period.year} - ${typeLabels[period.periodType] || period.periodType}`;
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
        <h1 className="text-lg sm:text-2xl font-bold">Payroll Management</h1>
        <p className="text-sm text-muted-foreground">Process and manage employee payroll</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Periods</p>
                <p className="text-2xl font-bold">{periods.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <FileText className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">
                  {periods.filter(p => p.status === 'DRAFT').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Processing</p>
                <p className="text-2xl font-bold">
                  {periods.filter(p => p.status === 'PROCESSING').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Paid</p>
                <p className="text-2xl font-bold">
                  {periods.filter(p => p.status === 'PAID').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="periods">Payroll Periods</TabsTrigger>
          <TabsTrigger value="payrolls" disabled={!selectedPeriod}>
            Payroll Details {selectedPeriod && `(${formatPeriodLabel(selectedPeriod)})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="periods" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Payroll Periods</CardTitle>
              {canManage && (
                <Button onClick={() => setPeriodDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Period
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto"><Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead className="hidden sm:table-cell">Start Date</TableHead>
                    <TableHead className="hidden sm:table-cell">End Date</TableHead>
                    <TableHead>Cutoff</TableHead>
                    <TableHead>Pay Date</TableHead>
                    <TableHead>Employees</TableHead>
                    <TableHead className="hidden md:table-cell">Locked</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periods.map((period) => (
                    <TableRow key={period.id}>
                      <TableCell className="font-medium">
                        {formatPeriodLabel(period)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {new Date(period.startDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {new Date(period.endDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {new Date(period.cutoffDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {new Date(period.payDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{period._count?.payrolls || 0}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant={period.isLocked ? 'default' : 'secondary'}>
                          {period.isLocked ? (
                            <span className="flex items-center gap-1">
                              <Lock className="h-3 w-3" /> Locked
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Unlock className="h-3 w-3" /> Unlocked
                            </span>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(period.status) as any}>
                          {period.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            title="View Payrolls"
                            onClick={() => {
                              setSelectedPeriod(period);
                              fetchPayrolls(period.id);
                              setActiveTab('payrolls');
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canManage && period.status === 'DRAFT' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                title={period.isLocked ? 'Unlock Attendance' : 'Lock Attendance'}
                                onClick={() => handleLockAttendance(period.id, !period.isLocked)}
                              >
                                {period.isLocked ? (
                                  <Unlock className="h-4 w-4 text-orange-600" />
                                ) : (
                                  <Lock className="h-4 w-4 text-blue-600" />
                                )}
                              </Button>
                              {period.isLocked && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title="Generate Payroll"
                                  onClick={() => handleProcessPayroll(period.id)}
                                  disabled={processing}
                                >
                                  <Play className="h-4 w-4 text-green-600" />
                                </Button>
                              )}
                            </>
                          )}
                          {canManage && period.status === 'PROCESSING' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Regenerate Payroll"
                                onClick={() => handleProcessPayroll(period.id)}
                                disabled={processing}
                              >
                                <RefreshCw className="h-4 w-4 text-amber-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Approve Payroll"
                                onClick={() => handleUpdatePeriodStatus(period.id, 'APPROVED')}
                              >
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                            </>
                          )}
                          {canManage && period.status === 'APPROVED' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Revert to Processing (to regenerate)"
                                onClick={() => handleUpdatePeriodStatus(period.id, 'PROCESSING')}
                              >
                                <RefreshCw className="h-4 w-4 text-amber-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Mark as Paid"
                                onClick={() => handleUpdatePeriodStatus(period.id, 'PAID')}
                              >
                                <DollarSign className="h-4 w-4 text-green-600" />
                              </Button>
                            </>
                          )}
                          {(period.status === 'PROCESSING' || period.status === 'APPROVED' || period.status === 'PAID') && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Export Excel (.xlsx)"
                                onClick={() => handleExportPayroll(period.id, 'excel')}
                              >
                                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Export CSV"
                                onClick={() => handleExportPayroll(period.id, 'csv')}
                              >
                                <Download className="h-4 w-4 text-blue-600" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payrolls" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Employee Payrolls</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto"><Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead className="hidden sm:table-cell">Department</TableHead>
                    <TableHead className="text-right">Basic Pay</TableHead>
                    <TableHead className="hidden md:table-cell text-right">Allowances</TableHead>
                    <TableHead className="hidden md:table-cell text-right">Adjustments</TableHead>
                    <TableHead className="hidden md:table-cell text-right">Employer Contrib.</TableHead>
                    <TableHead className="hidden sm:table-cell text-right">Total Gross</TableHead>
                    <TableHead className="text-right">Deductions</TableHead>
                    <TableHead className="text-right">Net Pay</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrolls.map((payroll) => (
                    <TableRow key={payroll.id}>
                      <TableCell>
                        {payroll.employee ? 
                          `${payroll.employee.firstName} ${payroll.employee.lastName}` : 
                          'Unknown'}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {payroll.employee?.department?.name || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(payroll.basicPay)}
                      </TableCell>
<TableCell className="hidden md:table-cell text-right">
                        {formatCurrency(
                          payroll.mobileAllowance + 
                          payroll.performancePay + 
                          payroll.otherAllowances
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-right">
                        {formatCurrency(payroll.adjustmentTotal || 0)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-right">
                        {formatCurrency(
                          payroll.employerSSS + 
                          payroll.employerPhilHealth + 
                          payroll.employerPagIbig
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-right font-medium">
                        {formatCurrency(payroll.grossEarnings)}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {formatCurrency(payroll.totalDeductions)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-green-600">
                        {formatCurrency(payroll.netPay)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedPayroll(payroll);
                            setDetailDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table></div>

              {/* Summary */}
              {payrolls.length > 0 && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Total Employees</p>
                      <p className="text-xl font-bold">{payrolls.length}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Gross</p>
                      <p className="text-xl font-bold">
                        {formatCurrency(payrolls.reduce((sum, p) => sum + p.grossEarnings, 0))}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Deductions</p>
                      <p className="text-xl font-bold text-red-600">
                        {formatCurrency(payrolls.reduce((sum, p) => sum + p.totalDeductions, 0))}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Net Pay</p>
                      <p className="text-xl font-bold text-green-600">
                        {formatCurrency(payrolls.reduce((sum, p) => sum + p.netPay, 0))}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Period Dialog */}
      <Dialog open={periodDialogOpen} onOpenChange={setPeriodDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Payroll Period</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Month</Label>
                <Select
                  value={periodForm.month}
                  onValueChange={(value) => setPeriodForm({ ...periodForm, month: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month, index) => (
                      <SelectItem key={index} value={(index + 1).toString()}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Year</Label>
                <Input
                  type="number"
                  value={periodForm.year}
                  onChange={(e) => setPeriodForm({ ...periodForm, year: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Period Type</Label>
              <Select
                value={periodForm.periodType}
                onValueChange={(value) => setPeriodForm({ ...periodForm, periodType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FIRST_HALF">Semi-Monthly: 1st Cutoff ({cutoffSettings.cutoff1Start}th - {cutoffSettings.cutoff1End}th)</SelectItem>
                  <SelectItem value="SECOND_HALF">Semi-Monthly: 2nd Cutoff ({cutoffSettings.cutoff2Start}th - {cutoffSettings.cutoff2End}th)</SelectItem>
                  <SelectItem value="MONTHLY">Monthly (1st - End of Month)</SelectItem>
                  <SelectItem value="BI_WEEKLY">Bi-Weekly (14 days)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPeriodDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePeriod}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payroll Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Payslip - {selectedPayroll?.employee?.firstName} {selectedPayroll?.employee?.lastName}
            </DialogTitle>
          </DialogHeader>
          {selectedPayroll && (
            <div className="space-y-4">
              {/* Total Gross Pay */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Total Gross Pay</CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span>Basic Pay</span>
                    <span className="text-right">{formatCurrency(selectedPayroll.basicPay)}</span>
                    {selectedPayroll.overtimePay > 0 && (<>
                      <span>Overtime Pay</span>
                      <span className="text-right">{formatCurrency(selectedPayroll.overtimePay)}</span>
                    </>)}
                    {selectedPayroll.holidayPay > 0 && (<>
                      <span>Holiday Pay</span>
                      <span className="text-right">{formatCurrency(selectedPayroll.holidayPay)}</span>
                    </>)}
                    {selectedPayroll.nightDiffPay > 0 && (<>
                      <span>Night Differential</span>
                      <span className="text-right">{formatCurrency(selectedPayroll.nightDiffPay)}</span>
                    </>)}
                    {selectedPayroll.mobileAllowance > 0 && (<>
                      <span>Mobile Allowance</span>
                      <span className="text-right">{formatCurrency(selectedPayroll.mobileAllowance)}</span>
                    </>)}
                    {selectedPayroll.performancePay > 0 && (<>
                      <span>Performance Pay</span>
                      <span className="text-right">{formatCurrency(selectedPayroll.performancePay)}</span>
                    </>)}
                    {selectedPayroll.otherAllowances > 0 && (<>
                      <span>Other Allowances</span>
                      <span className="text-right">{formatCurrency(selectedPayroll.otherAllowances)}</span>
                    </>)}
                    <span className="font-bold border-t pt-2">Total Gross Pay</span>
                    <span className="text-right font-bold border-t pt-2">{formatCurrency(selectedPayroll.grossEarnings)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Adjustments */}
              {(selectedPayroll.adjustmentTotal || 0) > 0 && (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Adjustments</CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="font-medium text-blue-700">Adjustments</span>
                      <span className="text-right font-bold text-blue-600">{formatCurrency(selectedPayroll.adjustmentTotal)}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Employee Deductions (Mandatory Contributions) */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Employee Contributions (Deducted from Salary)</CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span>SSS (Employee Share)</span>
                    <span className="text-right text-red-600">{formatCurrency(selectedPayroll.sssContribution)}</span>
                    <span>PhilHealth (Employee Share)</span>
                    <span className="text-right text-red-600">{formatCurrency(selectedPayroll.philHealthContribution)}</span>
                    <span>Pag-IBIG (Employee Share)</span>
                    <span className="text-right text-red-600">{formatCurrency(selectedPayroll.pagIbigContribution)}</span>
                    <span>Withholding Tax</span>
                    <span className="text-right text-red-600">{formatCurrency(selectedPayroll.withholdingTax || 0)}</span>
                    {selectedPayroll.salaryLoanDeduction > 0 && (<>
                      <span>Salary Loan</span>
                      <span className="text-right text-red-600">{formatCurrency(selectedPayroll.salaryLoanDeduction)}</span>
                    </>)}
                    {selectedPayroll.computerLoanDeduction > 0 && (<>
                      <span>Computer Loan</span>
                      <span className="text-right text-red-600">{formatCurrency(selectedPayroll.computerLoanDeduction)}</span>
                    </>)}
                    {selectedPayroll.otherLoanDeductions > 0 && (<>
                      <span>Other Loans</span>
                      <span className="text-right text-red-600">{formatCurrency(selectedPayroll.otherLoanDeductions)}</span>
                    </>)}
                    {selectedPayroll.otherDeductions > 0 && (<>
                      <span>Other Deductions</span>
                      <span className="text-right text-red-600">{formatCurrency(selectedPayroll.otherDeductions)}</span>
                    </>)}
                    <span className="font-bold border-t pt-2">Total Deductions</span>
                    <span className="text-right font-bold text-red-600 border-t pt-2">{formatCurrency(selectedPayroll.totalDeductions)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Employer Share (NOT deducted from salary) */}
              {(selectedPayroll.employerSSS + selectedPayroll.employerPhilHealth + selectedPayroll.employerPagIbig) > 0 && (
                <Card className="border-orange-200 bg-orange-50/30">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Employer Share (Company Expense — NOT deducted from salary)</CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span>SSS (Employer)</span>
                      <span className="text-right text-orange-600">{formatCurrency(selectedPayroll.employerSSS)}</span>
                      <span>PhilHealth (Employer)</span>
                      <span className="text-right text-orange-600">{formatCurrency(selectedPayroll.employerPhilHealth)}</span>
                      <span>Pag-IBIG (Employer)</span>
                      <span className="text-right text-orange-600">{formatCurrency(selectedPayroll.employerPagIbig)}</span>
                      <span className="font-bold border-t pt-2">Total Employer Share</span>
                      <span className="text-right font-bold text-orange-600 border-t pt-2">
                        {formatCurrency(selectedPayroll.employerSSS + selectedPayroll.employerPhilHealth + selectedPayroll.employerPagIbig)}
                      </span>
                    </div>
                    <p className="text-xs text-orange-600 mt-2">Recorded in Finance module as company expense</p>
                  </CardContent>
                </Card>
              )}

              {/* Net Pay */}
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold">Total Net Pay</span>
                  <span className="text-2xl font-bold text-green-600">
                    {formatCurrency(selectedPayroll.netPay)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Gross Earnings + Adjustments − Employee Contributions − Withholding Tax − Loans
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}