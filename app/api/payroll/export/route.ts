import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { getCompanyContext } from '@/lib/tenant';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June', 
                     'July', 'August', 'September', 'October', 'November', 'December'];

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'HR', 'SUPER_ADMIN'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ctx = await getCompanyContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const periodId = searchParams.get('periodId');
    const format = searchParams.get('format') || 'excel';

    if (!periodId) {
      return NextResponse.json({ error: 'Period ID required' }, { status: 400 });
    }

    // Get payroll period with company check
    const periodWhere: any = { id: periodId };
    if (ctx.companyId) {
      periodWhere.companyId = ctx.companyId;
    }

    const period = await prisma.payrollPeriod.findFirst({
      where: periodWhere,
    });

    if (!period) {
      return NextResponse.json({ error: 'Payroll period not found' }, { status: 404 });
    }

    // Get all payrolls for this period
    const payrolls = await prisma.payroll.findMany({
      where: { payrollPeriodId: periodId },
      orderBy: { createdAt: 'asc' },
    });

    // Get employee details
    const employeeIds = [...new Set(payrolls.map(p => p.employeeId))];
    const employees = await prisma.employee.findMany({
      where: { id: { in: employeeIds } },
      include: { department: true },
    });

    const employeeMap = new Map(employees.map(e => [e.id, e]));

    // Format data for export
    const exportData = payrolls.map(p => {
      const emp = employeeMap.get(p.employeeId);
      return {
        'Employee ID': emp?.employeeId || '',
        'Employee Name': emp ? `${emp.lastName}, ${emp.firstName}` : '',
        'Department': emp?.department?.name || '',
        'Basic Salary': p.basicSalary,
        'Days Worked': p.daysWorked,
        'Hours Worked': p.hoursWorked,
        'Basic Pay': p.basicPay,
        'Overtime Pay': p.overtimePay,
        'Holiday Pay': p.holidayPay,
        'Night Diff Pay': p.nightDiffPay,
        'Rest Day Pay': p.restDayPay,
        'Mobile Allowance': p.mobileAllowance,
        'Performance Pay': p.performancePay,
        'Other Allowances': p.otherAllowances,
        'Adjustments': p.adjustmentTotal || 0,
        'Employer SSS': p.employerSSS,
        'Employer PhilHealth': p.employerPhilHealth,
        'Employer Pag-IBIG': p.employerPagIbig,
        'Total Gross Pay': p.grossEarnings,
        'Salary Loan': p.salaryLoanDeduction,
        'Computer Loan': p.computerLoanDeduction,
        'Other Loan Deductions': p.otherLoanDeductions,
        'Other Deductions': p.otherDeductions,
        'Total Deductions': p.totalDeductions,
        'Net Pay': p.netPay,
        'Status': p.status,
      };
    });

    // Generate summary
    const summary = {
      totalEmployees: payrolls.length,
      totalGrossPay: payrolls.reduce((sum, p) => sum + p.grossEarnings, 0),
      totalAdjustments: payrolls.reduce((sum, p) => sum + (p.adjustmentTotal || 0), 0),
      totalDeductions: payrolls.reduce((sum, p) => sum + p.totalDeductions, 0),
      totalNetPay: payrolls.reduce((sum, p) => sum + p.netPay, 0),
      totalSSS: payrolls.reduce((sum, p) => sum + p.sssContribution, 0),
      totalPhilHealth: payrolls.reduce((sum, p) => sum + p.philHealthContribution, 0),
      totalPagIbig: payrolls.reduce((sum, p) => sum + p.pagIbigContribution, 0),
      totalEmployerSSS: payrolls.reduce((sum, p) => sum + p.employerSSS, 0),
      totalEmployerPhilHealth: payrolls.reduce((sum, p) => sum + p.employerPhilHealth, 0),
      totalEmployerPagIbig: payrolls.reduce((sum, p) => sum + p.employerPagIbig, 0),
    };

    const periodLabel = period.periodType === 'FIRST_HALF' ? '1st Half' : '2nd Half';
    const periodTitle = `${MONTH_NAMES[period.month]} ${period.year} - ${periodLabel}`;

    if (format === 'json') {
      return NextResponse.json({
        period: {
          periodType: period.periodType,
          month: period.month,
          year: period.year,
          startDate: period.startDate,
          endDate: period.endDate,
        },
        payrolls: exportData,
        summary,
      });
    }

    // Generate Excel file
    if (format === 'excel' || format === 'xlsx') {
      const wb = XLSX.utils.book_new();
      
      const ws = XLSX.utils.json_to_sheet(exportData);
      const colWidths = [
        { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
        { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
        { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 },
        { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 },
        { wch: 15 }, { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 12 },
        { wch: 10 },
      ];
      ws['!cols'] = colWidths;
      XLSX.utils.book_append_sheet(wb, ws, 'Payroll Details');

      const summaryData = [
        ['PAYROLL SUMMARY'],
        ['Period:', periodTitle],
        ['Pay Date:', period.payDate.toLocaleDateString()],
        [''],
        ['OVERVIEW'],
        ['Total Employees', summary.totalEmployees],
        ['Total Gross Pay', summary.totalGrossPay],
        ['Total Adjustments', summary.totalAdjustments],
        ['Total Deductions', summary.totalDeductions],
        ['Total Net Pay', summary.totalNetPay],
        [''],
        ['EMPLOYER CONTRIBUTIONS (Added to Net Pay)'],
        ['Total SSS (Employer)', summary.totalEmployerSSS],
        ['Total PhilHealth (Employer)', summary.totalEmployerPhilHealth],
        ['Total Pag-IBIG (Employer)', summary.totalEmployerPagIbig],
        ['Total Employer Contributions', summary.totalEmployerSSS + summary.totalEmployerPhilHealth + summary.totalEmployerPagIbig],
        [''],
        ['NET PAY FORMULA: Total Gross + Adjustments + Employer Share - Deductions'],
      ];
      
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      wsSummary['!cols'] = [{ wch: 30 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

      const deptGroups: Record<string, any[]> = {};
      payrolls.forEach(p => {
        const emp = employeeMap.get(p.employeeId);
        const dept = emp?.department?.name || 'No Department';
        if (!deptGroups[dept]) deptGroups[dept] = [];
        deptGroups[dept].push(p);
      });

      const deptSummaryData: (string | number)[][] = [
        ['PAYROLL BY DEPARTMENT'],
        ['Period:', periodTitle],
        [''],
        ['Department', 'Employees', 'Gross Earnings', 'Deductions', 'Net Pay', 'Employer Contributions'],
      ];

      Object.entries(deptGroups).forEach(([dept, records]) => {
        const deptGross = records.reduce((sum: number, r: any) => sum + r.grossEarnings, 0);
        const deptDeductions = records.reduce((sum: number, r: any) => sum + r.totalDeductions, 0);
        const deptNet = records.reduce((sum: number, r: any) => sum + r.netPay, 0);
        const deptEmployerContrib = records.reduce((sum: number, r: any) => sum + r.employerSSS + r.employerPhilHealth + r.employerPagIbig, 0);
        deptSummaryData.push([dept, records.length, deptGross, deptDeductions, deptNet, deptEmployerContrib]);
      });

      deptSummaryData.push(['']);
      deptSummaryData.push(['TOTAL', summary.totalEmployees, summary.totalGrossPay, summary.totalDeductions, summary.totalNetPay, 
        summary.totalEmployerSSS + summary.totalEmployerPhilHealth + summary.totalEmployerPagIbig]);

      const wsDept = XLSX.utils.aoa_to_sheet(deptSummaryData);
      wsDept['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, wsDept, 'By Department');

      const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      const filename = `payroll_${period.periodType}_${MONTH_NAMES[period.month]}_${period.year}.xlsx`;

      return new NextResponse(excelBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // Generate CSV
    if (format === 'csv') {
      const headers = Object.keys(exportData[0] || {});
      const csvRows = [
        headers.join(','),
        ...exportData.map(row => 
          headers.map(h => {
            const value = (row as any)[h];
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        ),
      ];

      csvRows.push('');
      csvRows.push('SUMMARY');
      csvRows.push(`Total Employees,${summary.totalEmployees}`);
      csvRows.push(`Total Gross Earnings,${summary.totalGrossPay.toFixed(2)}`);
      csvRows.push(`Total Deductions,${summary.totalDeductions.toFixed(2)}`);
      csvRows.push(`Total Net Pay,${summary.totalNetPay.toFixed(2)}`);

      const csv = csvRows.join('\n');
      const filename = `payroll_${period.periodType}_${MONTH_NAMES[period.month]}_${period.year}.csv`;

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
  } catch (error) {
    console.error('Error exporting payroll:', error);
    return NextResponse.json({ error: 'Failed to export payroll' }, { status: 500 });
  }
}
