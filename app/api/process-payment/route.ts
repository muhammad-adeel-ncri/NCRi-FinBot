import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { parsePayment } from '@/lib/parse-payment';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';

const FILENAME_PATTERN = /^Payroll_Payment_([A-Za-z]+)_(\d{4})\.xlsx$/;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const MONTH_NUMS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
    ?? req.headers.get('x-real-ip')
    ?? 'unknown';
  const rl = checkRateLimit(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many requests. Try again in ${rl.resetInSeconds}s.` },
      { status: 429, headers: { 'Retry-After': String(rl.resetInSeconds) } }
    );
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `File too large. Maximum 5 MB (your file: ${(file.size / 1024 / 1024).toFixed(1)} MB).` },
      { status: 413 }
    );
  }

  const match = file.name.match(FILENAME_PATTERN);
  if (!match) {
    return NextResponse.json(
      { error: 'Invalid filename. Expected: Payroll_Payment_Month_Year.xlsx' },
      { status: 400 }
    );
  }

  const [, month, year] = match;
  const salaryMonth    = `${month} ${year}`;
  const salaryMonthNum = MONTH_NUMS[month.toLowerCase()] ?? 0;

  const buffer   = await file.arrayBuffer();
  const workbook = XLSX.read(buffer);
  const { sheets, errors } = parsePayment(workbook, salaryMonth);

  if (sheets.length === 0) {
    return NextResponse.json({ error: 'No sheets could be processed.', sheetErrors: errors }, { status: 400 });
  }

  try {
    const { data: snapshot, error: snapErr } = await supabase
      .from('payment_snapshots')
      .insert({
        uploaded_by: user.id,
        salary_month: salaryMonth,
        salary_year: parseInt(year),
        salary_month_num: salaryMonthNum,
        filename: file.name,
      })
      .select('id')
      .single();

    if (snapErr) throw snapErr;

    const deptRows = sheets.flatMap((s) =>
      s.departments.map((d) => ({
        snapshot_id:      snapshot.id,
        region:           s.region,
        department:       d.name,
        gross_salary:     d.grossSalary,
        total_deduction:  d.totalDeduction,
        gross_up_1pct:    d.grossUp1pct,
        eobi:             d.eobi,
        tax:              d.tax,
        net_payable:      d.netPayable,
        employee_count:   d.employeeCount,
      }))
    );

    const { error: deptErr } = await supabase.from('payment_dept_data').insert(deptRows);
    if (deptErr) throw deptErr;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Database error.';
    return NextResponse.json({ error: `Failed to save data: ${msg}` }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    month: salaryMonth,
    regions: sheets.map((s) => s.region),
    sheetErrors: errors,
  });
}
