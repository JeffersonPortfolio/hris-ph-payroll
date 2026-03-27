// Payslip HTML Generator
export function generatePayslipHTML(payroll: any, period: any): string {
  const employee = payroll.employee;
  const periodLabel = period.periodType === 'FIRST_HALF' 
    ? `1st Cutoff (${getMonthName(period.month)} 1-15, ${period.year})`
    : `2nd Cutoff (${getMonthName(period.month)} 16-${new Date(period.year, period.month, 0).getDate()}, ${period.year})`;
  
  const payDate = new Date(period.payDate).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formatCurrency = (amount: number) => {
    return '₱' + amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payslip - ${employee.firstName} ${employee.lastName} - ${periodLabel}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: Arial, sans-serif;
      font-size: 12px;
      line-height: 1.4;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    .payslip {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border: 1px solid #ddd;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    .company-name {
      font-size: 20px;
      font-weight: bold;
      color: #2563eb;
      margin-bottom: 5px;
    }
    .payslip-title {
      font-size: 16px;
      font-weight: bold;
      color: #666;
    }
    .period-info {
      font-size: 14px;
      color: #888;
      margin-top: 5px;
    }
    .employee-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
      padding: 15px;
      background: #f8fafc;
      border-radius: 8px;
    }
    .info-group {
      flex: 1;
    }
    .info-row {
      margin-bottom: 5px;
    }
    .info-label {
      font-weight: bold;
      color: #666;
      display: inline-block;
      width: 120px;
    }
    .info-value {
      color: #333;
    }
    .earnings-deductions {
      display: flex;
      gap: 20px;
      margin-bottom: 20px;
    }
    .section {
      flex: 1;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      overflow: hidden;
    }
    .section-header {
      background: #2563eb;
      color: white;
      padding: 10px 15px;
      font-weight: bold;
      font-size: 13px;
    }
    .section-header.deductions {
      background: #dc2626;
    }
    .section-content {
      padding: 15px;
    }
    .item-row {
      display: flex;
      justify-content: space-between;
      padding: 5px 0;
      border-bottom: 1px dashed #e5e7eb;
    }
    .item-row:last-child {
      border-bottom: none;
    }
    .item-label {
      color: #666;
    }
    .item-value {
      font-weight: 500;
      text-align: right;
    }
    .subtotal-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      margin-top: 10px;
      border-top: 2px solid #e5e7eb;
      font-weight: bold;
    }
    .summary {
      background: #1e40af;
      color: white;
      padding: 20px;
      border-radius: 8px;
      margin-top: 20px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid rgba(255,255,255,0.2);
    }
    .summary-row:last-child {
      border-bottom: none;
    }
    .summary-row.net-pay {
      font-size: 18px;
      font-weight: bold;
      padding-top: 15px;
      margin-top: 10px;
      border-top: 2px solid rgba(255,255,255,0.3);
    }
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #888;
      font-size: 11px;
    }
    .confidential {
      color: #dc2626;
      font-weight: bold;
      margin-bottom: 5px;
    }
    @media print {
      body {
        background: white;
        padding: 0;
      }
      .payslip {
        box-shadow: none;
        border: none;
      }
    }
  </style>
</head>
<body>
  <div class="payslip">
    <div class="header">
      <div class="company-name">HRIS PAYROLL SYSTEM</div>
      <div class="payslip-title">PAYSLIP</div>
      <div class="period-info">${periodLabel} | Pay Date: ${payDate}</div>
    </div>

    <div class="employee-info">
      <div class="info-group">
        <div class="info-row">
          <span class="info-label">Employee ID:</span>
          <span class="info-value">${employee.employeeId}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Name:</span>
          <span class="info-value">${employee.lastName}, ${employee.firstName} ${employee.middleName || ''}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Department:</span>
          <span class="info-value">${employee.department?.name || 'N/A'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Position:</span>
          <span class="info-value">${employee.role?.name || 'N/A'}</span>
        </div>
      </div>
      <div class="info-group">
        <div class="info-row">
          <span class="info-label">SSS No:</span>
          <span class="info-value">${employee.sssNumber || 'N/A'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">PhilHealth No:</span>
          <span class="info-value">${employee.philHealthNumber || 'N/A'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Pag-IBIG No:</span>
          <span class="info-value">${employee.pagIbigNumber || 'N/A'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">TIN:</span>
          <span class="info-value">${employee.tinNumber || 'N/A'}</span>
        </div>
      </div>
    </div>

    <div class="earnings-deductions">
      <div class="section">
        <div class="section-header">EARNINGS</div>
        <div class="section-content">
          <div class="item-row">
            <span class="item-label">Basic Pay (${payroll.daysWorked.toFixed(1)} days)</span>
            <span class="item-value">${formatCurrency(payroll.basicPay)}</span>
          </div>
          ${payroll.overtimePay > 0 ? `
          <div class="item-row">
            <span class="item-label">Overtime Pay</span>
            <span class="item-value">${formatCurrency(payroll.overtimePay)}</span>
          </div>` : ''}
          ${payroll.holidayPay > 0 ? `
          <div class="item-row">
            <span class="item-label">Holiday Pay</span>
            <span class="item-value">${formatCurrency(payroll.holidayPay)}</span>
          </div>` : ''}
          ${payroll.nightDiffPay > 0 ? `
          <div class="item-row">
            <span class="item-label">Night Differential</span>
            <span class="item-value">${formatCurrency(payroll.nightDiffPay)}</span>
          </div>` : ''}
          ${payroll.mobileAllowance > 0 ? `
          <div class="item-row">
            <span class="item-label">Mobile/Load Allowance</span>
            <span class="item-value">${formatCurrency(payroll.mobileAllowance)}</span>
          </div>` : ''}
          ${payroll.performancePay > 0 ? `
          <div class="item-row">
            <span class="item-label">Performance Pay</span>
            <span class="item-value">${formatCurrency(payroll.performancePay)}</span>
          </div>` : ''}
          ${payroll.otherAllowances > 0 ? `
          <div class="item-row">
            <span class="item-label">Other Allowances</span>
            <span class="item-value">${formatCurrency(payroll.otherAllowances)}</span>
          </div>` : ''}
          <div class="subtotal-row">
            <span>TOTAL GROSS PAY</span>
            <span>${formatCurrency(payroll.grossEarnings)}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-header" style="background-color: #2563eb; color: white;">ADJUSTMENTS & EMPLOYER SHARE</div>
        <div class="section-content">
          ${payroll.adjustmentTotal > 0 ? `
          <div class="item-row">
            <span class="item-label">Payroll Adjustments</span>
            <span class="item-value">${formatCurrency(payroll.adjustmentTotal)}</span>
          </div>` : ''}
          ${payroll.employerSSS > 0 ? `
          <div class="item-row">
            <span class="item-label">Employer SSS</span>
            <span class="item-value">${formatCurrency(payroll.employerSSS)}</span>
          </div>` : ''}
          ${payroll.employerPhilHealth > 0 ? `
          <div class="item-row">
            <span class="item-label">Employer PhilHealth</span>
            <span class="item-value">${formatCurrency(payroll.employerPhilHealth)}</span>
          </div>` : ''}
          ${payroll.employerPagIbig > 0 ? `
          <div class="item-row">
            <span class="item-label">Employer Pag-IBIG</span>
            <span class="item-value">${formatCurrency(payroll.employerPagIbig)}</span>
          </div>` : ''}
          <div class="subtotal-row">
            <span>TOTAL ADDITIONS</span>
            <span>${formatCurrency((payroll.adjustmentTotal || 0) + payroll.employerSSS + payroll.employerPhilHealth + payroll.employerPagIbig)}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-header deductions">DEDUCTIONS</div>
        <div class="section-content">
          ${payroll.salaryLoanDeduction > 0 ? `
          <div class="item-row">
            <span class="item-label">Salary Loan</span>
            <span class="item-value">${formatCurrency(payroll.salaryLoanDeduction)}</span>
          </div>` : ''}
          ${payroll.computerLoanDeduction > 0 ? `
          <div class="item-row">
            <span class="item-label">Computer/Laptop Loan</span>
            <span class="item-value">${formatCurrency(payroll.computerLoanDeduction)}</span>
          </div>` : ''}
          ${payroll.otherLoanDeductions > 0 ? `
          <div class="item-row">
            <span class="item-label">Other Loan Deductions</span>
            <span class="item-value">${formatCurrency(payroll.otherLoanDeductions)}</span>
          </div>` : ''}
          ${payroll.otherDeductions > 0 ? `
          <div class="item-row">
            <span class="item-label">Other Deductions</span>
            <span class="item-value">${formatCurrency(payroll.otherDeductions)}</span>
          </div>` : ''}
          ${payroll.totalDeductions === 0 ? `
          <div class="item-row">
            <span class="item-label" style="color: #888;">No deductions this period</span>
            <span class="item-value">${formatCurrency(0)}</span>
          </div>` : ''}
          <div class="subtotal-row">
            <span>TOTAL DEDUCTIONS</span>
            <span>${formatCurrency(payroll.totalDeductions)}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="summary">
      <div class="summary-row">
        <span>Total Gross Pay</span>
        <span>${formatCurrency(payroll.grossEarnings)}</span>
      </div>
      <div class="summary-row">
        <span>Adjustments + Employer Share</span>
        <span>+ ${formatCurrency((payroll.adjustmentTotal || 0) + payroll.employerSSS + payroll.employerPhilHealth + payroll.employerPagIbig)}</span>
      </div>
      <div class="summary-row">
        <span>Total Deductions</span>
        <span>- ${formatCurrency(payroll.totalDeductions)}</span>
      </div>
      <div class="summary-row net-pay">
        <span>TOTAL NET PAY</span>
        <span>${formatCurrency(payroll.netPay)}</span>
      </div>
    </div>

    <div class="footer">
      <div class="confidential">CONFIDENTIAL</div>
      <p>This payslip is computer-generated and does not require a signature.</p>
      <p>For questions about your pay, please contact HR Department.</p>
      <p>Generated on: ${new Date().toLocaleString('en-PH')}</p>
    </div>
  </div>
</body>
</html>
`;

  return html;
}

function getMonthName(month: number): string {
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
  return months[month - 1] || '';
}
