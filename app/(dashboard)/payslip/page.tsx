'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FileText, DollarSign, TrendingUp, TrendingDown, Download, Loader2 } from 'lucide-react';

interface PayrollPeriod {
  id: string;
  periodType: string;
  month: number;
  year: number;
  status: string;
}

interface Payroll {
  id: string;
  basicSalary: number;
  dailyRate: number;
  hourlyRate: number;
  daysWorked: number;
  hoursWorked: number;
  basicPay: number;
  overtimePay: number;
  holidayPay: number;
  nightDiffPay: number;
  restDayPay: number;
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
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function PayslipPage() {
  const { data: session } = useSession() || {};
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (session?.user) {
      fetchPayslips();
    }
  }, [session]);

  const fetchPayslips = async () => {
    setLoading(true);
    try {
      // Pass employeeId so we only get this employee's payrolls
      const empId = (session?.user as any)?.employeeId;
      const url = empId ? `/api/payroll?employeeId=${empId}` : '/api/payroll';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const allPayrolls = data?.payrolls ?? [];
        // Filter only paid or approved payrolls
        const visiblePayrolls = allPayrolls.filter((p: Payroll) => 
          ['APPROVED', 'PAID'].includes(p.status)
        );
        setPayrolls(visiblePayrolls);
        if (visiblePayrolls.length > 0) {
          setSelectedPayroll(visiblePayrolls[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching payslips:', error);
      toast.error('Failed to load payslips');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  const formatPeriodLabel = (period: PayrollPeriod) => {
    return `${MONTHS[period.month - 1]} ${period.year} - ${period.periodType === 'FIRST_HALF' ? '1st Half' : '2nd Half'}`;
  };

  const handleDownloadPDF = async () => {
    if (!selectedPayroll) return;
    setDownloading(true);
    try {
      const res = await fetch(`/api/payslip/pdf?payrollId=${selectedPayroll.id}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to generate PDF' }));
        toast.error(err.error || 'Failed to generate PDF');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Payslip_${formatPeriodLabel(selectedPayroll.payrollPeriod).replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Payslip downloaded successfully!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download payslip');
    } finally {
      setDownloading(false);
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">My Payslips</h1>
          <p className="text-muted-foreground">View your salary details and deductions</p>
        </div>
      </div>

      {/* Period Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <label className="font-medium">Select Payroll Period:</label>
            <Select
              value={selectedPayroll?.id || ''}
              onValueChange={(value) => {
                const payroll = payrolls.find(p => p.id === value);
                setSelectedPayroll(payroll || null);
              }}
            >
              <SelectTrigger className="w-72">
                <SelectValue placeholder="Select a period" />
              </SelectTrigger>
              <SelectContent>
                {payrolls.map((payroll) => (
                  <SelectItem key={payroll.id} value={payroll.id}>
                    {formatPeriodLabel(payroll.payrollPeriod)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedPayroll && (
              <Button
                onClick={handleDownloadPDF}
                disabled={downloading}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                {downloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {downloading ? 'Generating PDF...' : 'Download PDF'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {payrolls.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg">No Payslips Available</h3>
            <p className="text-muted-foreground">
              Your payslips will appear here once payroll is processed and approved.
            </p>
          </CardContent>
        </Card>
      ) : selectedPayroll ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Summary Cards */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Gross Earnings</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(selectedPayroll.grossEarnings)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 rounded-lg">
                  <TrendingDown className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Deductions</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(selectedPayroll.totalDeductions)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Net Pay</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(selectedPayroll.netPay)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Payslip */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Payslip Details</CardTitle>
                  <Badge variant={selectedPayroll.status === 'PAID' ? 'default' : 'secondary'}>
                    {selectedPayroll.status}
                  </Badge>
                </div>
                <p className="text-muted-foreground">
                  {formatPeriodLabel(selectedPayroll.payrollPeriod)}
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Earnings Column */}
                  <div>
                    <h3 className="font-semibold text-lg mb-4 text-green-700">Earnings</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Basic Pay</span>
                        <span className="font-medium">{formatCurrency(selectedPayroll.basicPay)}</span>
                      </div>
                      {selectedPayroll.overtimePay > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Overtime Pay</span>
                          <span className="font-medium">{formatCurrency(selectedPayroll.overtimePay)}</span>
                        </div>
                      )}
                      {selectedPayroll.holidayPay > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Holiday Pay</span>
                          <span className="font-medium">{formatCurrency(selectedPayroll.holidayPay)}</span>
                        </div>
                      )}
                      {selectedPayroll.nightDiffPay > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Night Differential</span>
                          <span className="font-medium">{formatCurrency(selectedPayroll.nightDiffPay)}</span>
                        </div>
                      )}
                      {selectedPayroll.restDayPay > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Rest Day Pay</span>
                          <span className="font-medium">{formatCurrency(selectedPayroll.restDayPay)}</span>
                        </div>
                      )}
                      
                      <Separator />
                      <h4 className="font-medium mt-4">Allowances</h4>
                      {selectedPayroll.mobileAllowance > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Mobile/Load Allowance</span>
                          <span className="font-medium">{formatCurrency(selectedPayroll.mobileAllowance)}</span>
                        </div>
                      )}
                      {selectedPayroll.performancePay > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Performance Pay</span>
                          <span className="font-medium">{formatCurrency(selectedPayroll.performancePay)}</span>
                        </div>
                      )}
                      {selectedPayroll.otherAllowances > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Other Allowances</span>
                          <span className="font-medium">{formatCurrency(selectedPayroll.otherAllowances)}</span>
                        </div>
                      )}
                      
                      <Separator />
                      <div className="flex justify-between font-bold text-lg pt-2">
                        <span>Total Gross Pay</span>
                        <span className="text-green-600">{formatCurrency(selectedPayroll.grossEarnings)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Adjustments & Employer Share Column */}
                  <div>
                    {selectedPayroll.adjustmentTotal > 0 && (
                      <>
                        <h3 className="font-semibold text-lg mb-4 text-blue-700">Adjustments</h3>
                        <div className="space-y-3 mb-6">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Payroll Adjustments</span>
                            <span className="font-medium text-blue-600">+{formatCurrency(selectedPayroll.adjustmentTotal)}</span>
                          </div>
                        </div>
                      </>
                    )}

                    {(selectedPayroll.employerSSS + selectedPayroll.employerPhilHealth + selectedPayroll.employerPagIbig) > 0 && (
                      <>
                        <h3 className="font-semibold text-lg mb-4 text-green-700">Employer Share</h3>
                        <div className="space-y-3">
                          {selectedPayroll.employerSSS > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Employer SSS</span>
                              <span className="font-medium text-green-600">+{formatCurrency(selectedPayroll.employerSSS)}</span>
                            </div>
                          )}
                          {selectedPayroll.employerPhilHealth > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Employer PhilHealth</span>
                              <span className="font-medium text-green-600">+{formatCurrency(selectedPayroll.employerPhilHealth)}</span>
                            </div>
                          )}
                          {selectedPayroll.employerPagIbig > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Employer Pag-IBIG</span>
                              <span className="font-medium text-green-600">+{formatCurrency(selectedPayroll.employerPagIbig)}</span>
                            </div>
                          )}
                          <Separator />
                          <div className="flex justify-between font-bold pt-2">
                            <span>Total Employer Share</span>
                            <span className="text-green-600">
                              +{formatCurrency(selectedPayroll.employerSSS + selectedPayroll.employerPhilHealth + selectedPayroll.employerPagIbig)}
                            </span>
                          </div>
                        </div>
                      </>
                    )}

                    {selectedPayroll.totalDeductions > 0 && (
                      <>
                        <Separator className="my-4" />
                        <h3 className="font-semibold text-lg mb-4 text-red-700">Deductions</h3>
                        <div className="space-y-3">
                          {selectedPayroll.salaryLoanDeduction > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Salary Loan</span>
                              <span className="font-medium text-red-600">-{formatCurrency(selectedPayroll.salaryLoanDeduction)}</span>
                            </div>
                          )}
                          {selectedPayroll.computerLoanDeduction > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Computer/Laptop Loan</span>
                              <span className="font-medium text-red-600">-{formatCurrency(selectedPayroll.computerLoanDeduction)}</span>
                            </div>
                          )}
                          {selectedPayroll.otherLoanDeductions > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Other Loans</span>
                              <span className="font-medium text-red-600">-{formatCurrency(selectedPayroll.otherLoanDeductions)}</span>
                            </div>
                          )}
                          {selectedPayroll.otherDeductions > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Other Deductions</span>
                              <span className="font-medium text-red-600">-{formatCurrency(selectedPayroll.otherDeductions)}</span>
                            </div>
                          )}
                          <Separator />
                          <div className="flex justify-between font-bold pt-2">
                            <span>Total Deductions</span>
                            <span className="text-red-600">-{formatCurrency(selectedPayroll.totalDeductions)}</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Net Pay */}
                <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-blue-600 font-medium">TOTAL NET PAY</p>
                      <p className="text-xs text-blue-500">Total Gross + Adjustments + Employer Share - Deductions</p>
                    </div>
                    <p className="text-4xl font-bold text-blue-700">
                      {formatCurrency(selectedPayroll.netPay)}
                    </p>
                  </div>
                </div>

                {/* Work Summary */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">Work Summary</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Days Worked:</span>
                      <span className="ml-2 font-medium">{selectedPayroll.daysWorked.toFixed(1)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Hours Worked:</span>
                      <span className="ml-2 font-medium">{selectedPayroll.hoursWorked.toFixed(1)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Daily Rate:</span>
                      <span className="ml-2 font-medium">{formatCurrency(selectedPayroll.dailyRate)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
}
