"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Users, Building2, FileText, Calculator } from "lucide-react";

const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

function formatPeso(amount: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount);
}

export default function FinancePage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear.toString());
  const [quarter, setQuarter] = useState("Annual");
  const [activeTab, setActiveTab] = useState("summary");
  const [summary, setSummary] = useState<any>(null);
  const [expenses, setExpenses] = useState<any>(null);
  const [tables, setTables] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab === "summary" || activeTab === "tax") fetchSummary();
    if (activeTab === "employer") fetchExpenses();
    if (activeTab === "tables") fetchTables();
  }, [year, quarter, activeTab]);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      let url = `/api/finance/summary?year=${year}`;
      if (quarter !== "Annual" && quarter.startsWith("Q")) url += `&quarter=${quarter}`;
      else if (quarter !== "Annual") url += `&month=${quarter}`;
      const res = await fetch(url);
      const data = await res.json();
      setSummary(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      let url = `/api/finance/employer-expenses?year=${year}`;
      if (quarter !== "Annual" && quarter.startsWith("Q")) url += `&quarter=${quarter}`;
      else if (quarter !== "Annual") url += `&month=${quarter}`;
      const res = await fetch(url);
      const data = await res.json();
      setExpenses(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchTables = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/finance/contribution-tables");
      const data = await res.json();
      setTables(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finance</h1>
          <p className="text-gray-500 mt-1">Contribution tables, tax summaries & employer expenses</p>
        </div>
        <div className="flex gap-2">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={quarter} onValueChange={setQuarter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Annual">Annual</SelectItem>
              <SelectItem value="Q1">Q1 (Jan-Mar)</SelectItem>
              <SelectItem value="Q2">Q2 (Apr-Jun)</SelectItem>
              <SelectItem value="Q3">Q3 (Jul-Sep)</SelectItem>
              <SelectItem value="Q4">Q4 (Oct-Dec)</SelectItem>
              {MONTHS.map((m, i) => (
                <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="summary" className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4" /> Summary
          </TabsTrigger>
          <TabsTrigger value="tax" className="flex items-center gap-1">
            <FileText className="h-4 w-4" /> Tax
          </TabsTrigger>
          <TabsTrigger value="employer" className="flex items-center gap-1">
            <Building2 className="h-4 w-4" /> Employer Share
          </TabsTrigger>
          <TabsTrigger value="tables" className="flex items-center gap-1">
            <Calculator className="h-4 w-4" /> Tables
          </TabsTrigger>
        </TabsList>

        {/* SUMMARY TAB */}
        <TabsContent value="summary">
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
          ) : summary ? (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Employees</CardDescription>
                    <CardTitle className="text-2xl">{summary.totalEmployees}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Gross Earnings</CardDescription>
                    <CardTitle className="text-2xl text-green-600">{formatPeso(summary.totalGrossEarnings)}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Net Pay</CardDescription>
                    <CardTitle className="text-2xl text-blue-600">{formatPeso(summary.totalNetPay)}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Contributions</CardDescription>
                    <CardTitle className="text-2xl text-orange-600">{formatPeso(summary.totalContributions)}</CardTitle>
                  </CardHeader>
                </Card>
              </div>

              {/* Contribution Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Employee Contributions (Deducted from Salary)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between"><span className="text-gray-600">SSS</span><span className="font-medium">{formatPeso(summary.employeeContributions.sss)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">PhilHealth</span><span className="font-medium">{formatPeso(summary.employeeContributions.philhealth)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Pag-IBIG</span><span className="font-medium">{formatPeso(summary.employeeContributions.pagibig)}</span></div>
                      <div className="flex justify-between border-t pt-2"><span className="font-semibold">Total</span><span className="font-bold text-red-600">{formatPeso(summary.employeeContributions.total)}</span></div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Employer Contributions (Company Expense)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between"><span className="text-gray-600">SSS</span><span className="font-medium">{formatPeso(summary.employerContributions.sss)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">PhilHealth</span><span className="font-medium">{formatPeso(summary.employerContributions.philhealth)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Pag-IBIG</span><span className="font-medium">{formatPeso(summary.employerContributions.pagibig)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">EC</span><span className="font-medium">{formatPeso(summary.employerContributions.ec)}</span></div>
                      <div className="flex justify-between border-t pt-2"><span className="font-semibold">Total</span><span className="font-bold text-orange-600">{formatPeso(summary.employerContributions.total)}</span></div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Monthly Breakdown */}
              {summary.monthlyBreakdown && summary.monthlyBreakdown.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Monthly Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Month</TableHead>
                            <TableHead className="text-right">Employees</TableHead>
                            <TableHead className="text-right">Gross Earnings</TableHead>
                            <TableHead className="text-right">Employee Contributions</TableHead>
                            <TableHead className="text-right">Employer Contributions</TableHead>
                            <TableHead className="text-right">Withholding Tax</TableHead>
                            <TableHead className="text-right">Net Pay</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {summary.monthlyBreakdown.map((m: any) => (
                            <TableRow key={m.month}>
                              <TableCell className="font-medium">{MONTHS[m.month - 1]}</TableCell>
                              <TableCell className="text-right">{m.employeeCount}</TableCell>
                              <TableCell className="text-right">{formatPeso(m.grossEarnings)}</TableCell>
                              <TableCell className="text-right text-red-600">{formatPeso(m.employeeContributions.total)}</TableCell>
                              <TableCell className="text-right text-orange-600">{formatPeso(m.employerContributions.total)}</TableCell>
                              <TableCell className="text-right text-purple-600">{formatPeso(m.withholdingTax)}</TableCell>
                              <TableCell className="text-right text-blue-600">{formatPeso(m.netPay)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card><CardContent className="py-12 text-center text-gray-500">No data available. Generate payroll to see finance summary.</CardContent></Card>
          )}
        </TabsContent>

        {/* TAX TAB */}
        <TabsContent value="tax">
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
          ) : summary ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Withholding Tax</CardDescription>
                    <CardTitle className="text-2xl text-purple-600">{formatPeso(summary.totalWithholdingTax)}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500">Deducted from employee compensation per pay period based on BIR Withholding Tax Table 2026</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Period</CardDescription>
                    <CardTitle className="text-2xl">{year} — {summary.quarter}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500">Income tax computed using TRAIN Law annual tax brackets</p>
                  </CardContent>
                </Card>
              </div>

              {summary.monthlyBreakdown && summary.monthlyBreakdown.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Withholding Tax by Month</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Month</TableHead>
                          <TableHead className="text-right">Employees</TableHead>
                          <TableHead className="text-right">Taxable Compensation</TableHead>
                          <TableHead className="text-right">Withholding Tax</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {summary.monthlyBreakdown.map((m: any) => (
                          <TableRow key={m.month}>
                            <TableCell className="font-medium">{MONTHS[m.month - 1]}</TableCell>
                            <TableCell className="text-right">{m.employeeCount}</TableCell>
                            <TableCell className="text-right">{formatPeso(m.grossEarnings - m.employeeContributions.total)}</TableCell>
                            <TableCell className="text-right text-purple-600">{formatPeso(m.withholdingTax)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card><CardContent className="py-12 text-center text-gray-500">No tax data available.</CardContent></Card>
          )}
        </TabsContent>

        {/* EMPLOYER SHARE TAB */}
        <TabsContent value="employer">
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
          ) : expenses ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Employer Contribution Totals</CardTitle>
                  <CardDescription>Company expenses — NOT deducted from employee salary</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-gray-600">SSS</p>
                      <p className="text-lg font-bold text-blue-700">{formatPeso(expenses.totals.sss)}</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <p className="text-sm text-gray-600">PhilHealth</p>
                      <p className="text-lg font-bold text-green-700">{formatPeso(expenses.totals.philhealth)}</p>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <p className="text-sm text-gray-600">Pag-IBIG</p>
                      <p className="text-lg font-bold text-orange-700">{formatPeso(expenses.totals.pagibig)}</p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <p className="text-sm text-gray-600">EC</p>
                      <p className="text-lg font-bold text-purple-700">{formatPeso(expenses.totals.ec)}</p>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <p className="text-sm text-gray-600">Grand Total</p>
                      <p className="text-lg font-bold text-red-700">{formatPeso(expenses.totals.total)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Per-Employee Employer Expenses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee ID</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead className="text-right">SSS (ER)</TableHead>
                          <TableHead className="text-right">PhilHealth (ER)</TableHead>
                          <TableHead className="text-right">Pag-IBIG (ER)</TableHead>
                          <TableHead className="text-right">EC</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenses.expenses && expenses.expenses.length > 0 ? (
                          expenses.expenses.map((e: any) => (
                            <TableRow key={e.employeeId}>
                              <TableCell>{e.employeeId}</TableCell>
                              <TableCell className="font-medium">{e.name}</TableCell>
                              <TableCell>{e.department}</TableCell>
                              <TableCell className="text-right">{formatPeso(e.erSss)}</TableCell>
                              <TableCell className="text-right">{formatPeso(e.erPhilhealth)}</TableCell>
                              <TableCell className="text-right">{formatPeso(e.erPagibig)}</TableCell>
                              <TableCell className="text-right">{formatPeso(e.erEc)}</TableCell>
                              <TableCell className="text-right font-semibold">{formatPeso(e.total)}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow><TableCell colSpan={8} className="text-center text-gray-500 py-8">No employer expense data available.</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card><CardContent className="py-12 text-center text-gray-500">No employer expense data available.</CardContent></Card>
          )}
        </TabsContent>

        {/* CONTRIBUTION TABLES TAB */}
        <TabsContent value="tables">
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
          ) : tables ? (
            <div className="space-y-6">
              {/* SSS Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">SSS</Badge>
                    SSS Contribution Table 2025
                  </CardTitle>
                  <CardDescription>Social Security System — Monthly contributions with Regular SS, MPF, and EC</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Salary Range</TableHead>
                          <TableHead className="text-right">MSC</TableHead>
                          <TableHead className="text-right">EE Total</TableHead>
                          <TableHead className="text-right">ER SS+MPF</TableHead>
                          <TableHead className="text-right">ER EC</TableHead>
                          <TableHead className="text-right">ER Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tables.sss?.data?.map((row: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell className="text-sm">{formatPeso(row.minSalary)} — {row.maxSalary >= 999999999 ? 'Above' : formatPeso(row.maxSalary)}</TableCell>
                            <TableCell className="text-right">{formatPeso(row.msc)}</TableCell>
                            <TableCell className="text-right text-red-600">{formatPeso(row.employeeTotal)}</TableCell>
                            <TableCell className="text-right">{formatPeso(row.employerRegSS + row.employerMPF)}</TableCell>
                            <TableCell className="text-right">{formatPeso(row.employerEC)}</TableCell>
                            <TableCell className="text-right text-orange-600">{formatPeso(row.employerTotal)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* PhilHealth */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700">PhilHealth</Badge>
                    PhilHealth Contribution Table 2024
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {tables.philhealth?.data && (
                    <div className="space-y-2">
                      <p><span className="font-medium">Rate:</span> {(tables.philhealth.data.rate * 100)}% of Monthly Basic Salary</p>
                      <p><span className="font-medium">Salary Floor:</span> {formatPeso(tables.philhealth.data.floor)}</p>
                      <p><span className="font-medium">Salary Ceiling:</span> {formatPeso(tables.philhealth.data.ceiling)}</p>
                      <p><span className="font-medium">Employee Share:</span> Half of total premium (2.5%)</p>
                      <p><span className="font-medium">Employer Share:</span> Half of total premium (2.5%)</p>
                      <p className="text-sm text-gray-500 mt-3">Min Premium: {formatPeso(tables.philhealth.data.floor * tables.philhealth.data.rate)} | Max Premium: {formatPeso(tables.philhealth.data.ceiling * tables.philhealth.data.rate)}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Pag-IBIG */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Badge variant="outline" className="bg-orange-50 text-orange-700">Pag-IBIG</Badge>
                    Pag-IBIG Contribution Table 2021
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {tables.pagibig?.data && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Monthly Compensation</TableHead>
                          <TableHead className="text-right">Employee Share</TableHead>
                          <TableHead className="text-right">Employer Share</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell>{formatPeso(tables.pagibig.data.threshold)} and below</TableCell>
                          <TableCell className="text-right">{(tables.pagibig.data.eeRateLow * 100)}%</TableCell>
                          <TableCell className="text-right">{(tables.pagibig.data.erRate * 100)}%</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Over {formatPeso(tables.pagibig.data.threshold)}</TableCell>
                          <TableCell className="text-right">{(tables.pagibig.data.eeRateHigh * 100)}%</TableCell>
                          <TableCell className="text-right">{(tables.pagibig.data.erRate * 100)}%</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  )}
                  <p className="text-sm text-gray-500 mt-3">Max monthly compensation for computation: {tables.pagibig?.data ? formatPeso(tables.pagibig.data.maxComp) : 'N/A'}</p>
                </CardContent>
              </Card>

              {/* Withholding Tax */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Badge variant="outline" className="bg-purple-50 text-purple-700">BIR</Badge>
                    Withholding Tax Table 2026
                  </CardTitle>
                  <CardDescription>Based on TRAIN Law — Applied per pay period</CardDescription>
                </CardHeader>
                <CardContent>
                  {tables.withholding?.data && (
                    <div className="space-y-4">
                      {Object.entries(tables.withholding.data).map(([period, brackets]: [string, any]) => (
                        <div key={period}>
                          <h4 className="font-semibold text-sm mb-2 uppercase text-gray-700">{period.replace('_', '-')}</h4>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Compensation Range</TableHead>
                                <TableHead className="text-right">Base Tax</TableHead>
                                <TableHead className="text-right">Rate</TableHead>
                                <TableHead className="text-right">Over</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {brackets.map((b: any, i: number) => (
                                <TableRow key={i}>
                                  <TableCell className="text-sm">{formatPeso(b.minComp)} — {b.maxComp >= 999999999 ? 'Above' : formatPeso(b.maxComp)}</TableCell>
                                  <TableCell className="text-right">{formatPeso(b.baseTax)}</TableCell>
                                  <TableCell className="text-right">{(b.rate * 100)}%</TableCell>
                                  <TableCell className="text-right">{formatPeso(b.excessOver)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Income Tax */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Badge variant="outline" className="bg-red-50 text-red-700">BIR</Badge>
                    Income Tax Table 2026 (Annual)
                  </CardTitle>
                  <CardDescription>TRAIN Law annual income tax brackets</CardDescription>
                </CardHeader>
                <CardContent>
                  {tables.incometax?.data && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Annual Taxable Income</TableHead>
                          <TableHead className="text-right">Base Tax</TableHead>
                          <TableHead className="text-right">Rate</TableHead>
                          <TableHead className="text-right">Excess Over</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tables.incometax.data.map((b: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell className="text-sm">{formatPeso(b.minIncome)} — {b.maxIncome >= 999999999 ? 'Above' : formatPeso(b.maxIncome)}</TableCell>
                            <TableCell className="text-right">{formatPeso(b.baseTax)}</TableCell>
                            <TableCell className="text-right">{(b.rate * 100)}%</TableCell>
                            <TableCell className="text-right">{formatPeso(b.excessOver)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card><CardContent className="py-12 text-center text-gray-500">Loading contribution tables...</CardContent></Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
