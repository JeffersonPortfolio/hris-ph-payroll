import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { generatePayslipHTML } from '@/lib/payslip-generator';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const payrollId = searchParams.get('payrollId');

    if (!payrollId) {
      return NextResponse.json({ error: 'Payroll ID required' }, { status: 400 });
    }

    // Fetch payroll with employee and period details
    const payroll = await prisma.payroll.findUnique({
      where: { id: payrollId },
      include: {
        payrollPeriod: true,
      },
    });

    if (!payroll) {
      return NextResponse.json({ error: 'Payroll not found' }, { status: 404 });
    }

    // Security: non-admin/HR can only download their own payslip
    const role = (session.user as any).role;
    if (!['ADMIN', 'HR'].includes(role)) {
      const userEmployeeId = (session.user as any).employeeId;
      if (payroll.employeeId !== userEmployeeId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Get employee details with department and role
    const employee = await prisma.employee.findUnique({
      where: { id: payroll.employeeId },
      include: { department: true, role: true },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Build payroll object with employee for HTML generator
    const payrollWithEmployee = {
      ...payroll,
      employee,
    };

    // Generate HTML
    const html = generatePayslipHTML(payrollWithEmployee, payroll.payrollPeriod);

    // Step 1: Create the PDF generation request
    const createResponse = await fetch('https://apps.abacus.ai/api/createConvertHtmlToPdfRequest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deployment_token: process.env.ABACUSAI_API_KEY,
        html_content: html,
        pdf_options: {
          format: 'A4',
          print_background: true,
          margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
        },
        base_url: process.env.NEXTAUTH_URL || '',
      }),
    });

    if (!createResponse.ok) {
      const error = await createResponse.json().catch(() => ({ error: 'Failed to create PDF request' }));
      console.error('PDF create error:', error);
      return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
    }

    const { request_id } = await createResponse.json();
    if (!request_id) {
      return NextResponse.json({ error: 'No request ID returned' }, { status: 500 });
    }

    // Step 2: Poll for status until completion
    const maxAttempts = 120; // 2 minutes max
    let attempts = 0;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const statusResponse = await fetch('https://apps.abacus.ai/api/getConvertHtmlToPdfStatus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id,
          deployment_token: process.env.ABACUSAI_API_KEY,
        }),
      });

      const statusResult = await statusResponse.json();
      const status = statusResult?.status || 'FAILED';
      const result = statusResult?.result || null;

      if (status === 'SUCCESS') {
        if (result && result.result) {
          const pdfBuffer = Buffer.from(result.result, 'base64');
          const periodLabel = payroll.payrollPeriod.periodType === 'FIRST_HALF' ? '1st-Half' : '2nd-Half';
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const fileName = `Payslip_${employee.lastName}_${employee.firstName}_${monthNames[payroll.payrollPeriod.month - 1]}-${payroll.payrollPeriod.year}_${periodLabel}.pdf`;

          return new NextResponse(pdfBuffer, {
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment; filename="${fileName}"`,
            },
          });
        }
        return NextResponse.json({ error: 'PDF generated but no data returned' }, { status: 500 });
      } else if (status === 'FAILED') {
        const errorMsg = result?.error || 'PDF generation failed';
        console.error('PDF generation failed:', errorMsg);
        return NextResponse.json({ error: errorMsg }, { status: 500 });
      }

      attempts++;
    }

    return NextResponse.json({ error: 'PDF generation timed out' }, { status: 500 });
  } catch (error) {
    console.error('Payslip PDF error:', error);
    return NextResponse.json({ error: 'Failed to generate payslip PDF' }, { status: 500 });
  }
}
