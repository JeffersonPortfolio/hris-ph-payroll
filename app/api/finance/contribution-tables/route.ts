import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getSSSTable, getPhilHealthRates, getPagIbigRates, getWithholdingTaxTable, getIncomeTaxTable } from '@/lib/payroll-utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (!['ADMIN', 'HR', 'FINANCE', 'SUPER_ADMIN'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const table = searchParams.get('table');

    if (table === 'sss') {
      return NextResponse.json({ table: 'SSS Contribution Table 2025', data: getSSSTable() });
    } else if (table === 'philhealth') {
      return NextResponse.json({ table: 'PhilHealth Contribution Table 2024', data: getPhilHealthRates() });
    } else if (table === 'pagibig') {
      return NextResponse.json({ table: 'Pag-IBIG Contribution Table 2021', data: getPagIbigRates() });
    } else if (table === 'withholding') {
      return NextResponse.json({ table: 'Withholding Tax Table 2026', data: getWithholdingTaxTable() });
    } else if (table === 'incometax') {
      return NextResponse.json({ table: 'Income Tax Table 2026', data: getIncomeTaxTable() });
    } else {
      return NextResponse.json({
        sss: { table: 'SSS Contribution Table 2025', data: getSSSTable() },
        philhealth: { table: 'PhilHealth Contribution Table 2024', data: getPhilHealthRates() },
        pagibig: { table: 'Pag-IBIG Contribution Table 2021', data: getPagIbigRates() },
        withholding: { table: 'Withholding Tax Table 2026', data: getWithholdingTaxTable() },
        incometax: { table: 'Income Tax Table 2026', data: getIncomeTaxTable() },
      });
    }
  } catch (error) {
    console.error('Error fetching contribution tables:', error);
    return NextResponse.json({ error: 'Failed to fetch contribution tables' }, { status: 500 });
  }
}
