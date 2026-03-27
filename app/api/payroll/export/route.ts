import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June', 
                     'July', 'August', 'September', 'October', 'November', 'December'];

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'HR'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const periodId = searchParams.get('periodId');
    const format = searchParams.get('format') || 'excel'; // csv, excel, json

    if (!periodId) {
      return NextResponse.json({ error: 'Period ID required' }, { status: 400 });
    }

    // Get payroll period
    const period = await prisma.payrollPeriod.findUnique({
      where: { id: periodId },
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
      
      // Sheet 1: Payroll Details
      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // Set column widths
      const colWidths = [
        { wch: 15 }, // Employee ID
        { wch: 25 }, // Employee Name
        { wch: 15 }, // Department
        { wch: 12 }, // Basic Salary
        { wch: 12 }, // Days Worked
        { wch: 12 }, // Hours Worked
        { wch: 12 }, // Basic Pay
        { wch: 12 }, // Overtime Pay
        { wch: 12 }, // Holiday Pay
        { wch: 12 }, // Night Diff Pay
        { wch: 12 }, // Rest Day Pay
        { wch: 15 }, // Mobile Allowance
        { wch: 15 }, // Performance Pay
        { wch: 15 }, // Other Allowances
        { wch: 12 }, // Adjustments
        { wch: 12 }, // Employer SSS
        { wch: 15 }, // Employer PhilHealth
        { wch: 15 }, // Employer Pag-IBIG
        { wch: 15 }, // Total Gross Pay
        { wch: 12 }, // Salary Loan
        { wch: 15 }, // Computer Loan
        { wch: 18 }, // Other Loan Deductions
        { wch: 15 }, // Other Deductions
        { wch: 15 }, // Total Deductions
        { wch: 12 }, // Net Pay
        { wch: 10 }, // Status
      ];
      ws['!cols'] = colWidths;
      
      XLSX.utils.book_append_sheet(wb, ws, 'Payroll Details');

      // Sheet 2: Summary
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

      // Sheet 3: By Department (if multiple departments)
      const deptGroups: Record<string, any[]> = {};
      payrolls.forEach(p => {
        const emp = employeeMap.get(p.employeeId);
        const dept = emp?.department?.name || 'No Department';
        if (!deptGroups[dept]) deptGroups[dept] = [];
        deptGroups[dept].push({
          ...p,
          employeeName: emp ? `${emp.lastName}, ${emp.firstName}` : '',
          employeeId: emp?.employeeId || '',
        });
      });

      const deptSummaryData: (string | number)[][] = [
        ['PAYROLL BY DEPARTMENT'],
        ['Period:', periodTitle],
        [''],
        ['Department', 'Employees', 'Gross Earnings', 'Deductions', 'Net Pay', 'Employer Contributions'],
      ];

      Object.entries(deptGroups).forEach(([dept, records]) => {
        const deptGross = records.reduce((sum, r) => sum + r.grossEarnings, 0);
        const deptDeductions = records.reduce((sum, r) => sum + r.totalDeductions, 0);
        const deptNet = records.reduce((sum, r) => sum + r.netPay, 0);
        const deptEmployerContrib = records.reduce((sum, r) => sum + r.employerSSS + r.employerPhilHealth + r.employerPagIbig, 0);
        deptSummaryData.push([dept, records.length, deptGross, deptDeductions, deptNet, deptEmployerContrib]);
      });

      deptSummaryData.push(['']);
      deptSummaryData.push(['TOTAL', summary.totalEmployees, summary.totalGrossPay, summary.totalDeductions, summary.totalNetPay, 
        summary.totalEmployerSSS + summary.totalEmployerPhilHealth + summary.totalEmployerPagIbig]);

      const wsDept = XLSX.utils.aoa_to_sheet(deptSummaryData);
      wsDept['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, wsDept, 'By Department');

      // Generate buffer
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
