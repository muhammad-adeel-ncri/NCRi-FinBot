-- Run this entire file in your Supabase SQL Editor (supabase.com → project → SQL Editor)

create table public.payroll_snapshots (
  id uuid default gen_random_uuid() primary key,
  uploaded_by uuid references auth.users(id) not null,
  salary_month text not null,
  salary_year integer not null,
  salary_month_num integer not null,
  filename text not null,
  uploaded_at timestamptz default now()
);

create table public.department_data (
  id uuid default gen_random_uuid() primary key,
  snapshot_id uuid references public.payroll_snapshots(id) on delete cascade not null,
  region text not null,
  department text not null,
  gross_salary numeric not null default 0,
  net_payable numeric not null default 0,
  eobi numeric not null default 0,
  tax numeric not null default 0,
  employee_count integer not null default 0,
  created_at timestamptz default now()
);

create table public.je_results (
  id uuid default gen_random_uuid() primary key,
  snapshot_id uuid references public.payroll_snapshots(id) on delete cascade not null,
  region text not null,
  balanced boolean not null,
  diff numeric not null default 0,
  total_debit numeric not null default 0,
  total_credit numeric not null default 0
);

-- Enable Row Level Security on all tables
alter table public.payroll_snapshots enable row level security;
alter table public.department_data enable row level security;
alter table public.je_results enable row level security;

-- Policies: any authenticated user reads all data (single-org tool)
create policy "auth_read_snapshots" on public.payroll_snapshots
  for select to authenticated using (true);

create policy "auth_insert_snapshots" on public.payroll_snapshots
  for insert to authenticated
  with check ((select auth.uid()) = uploaded_by);

create policy "auth_read_dept_data" on public.department_data
  for select to authenticated using (true);

create policy "auth_insert_dept_data" on public.department_data
  for insert to authenticated with check (true);

create policy "auth_read_je_results" on public.je_results
  for select to authenticated using (true);

create policy "auth_insert_je_results" on public.je_results
  for insert to authenticated with check (true);

-- ── Payment tables ────────────────────────────────────────────────────────────
-- Run these additional statements to enable the Payroll Payment Upload + Dashboard

create table public.payment_snapshots (
  id uuid default gen_random_uuid() primary key,
  uploaded_by uuid references auth.users(id) not null,
  salary_month text not null,
  salary_year integer not null,
  salary_month_num integer not null,
  filename text not null,
  uploaded_at timestamptz default now()
);

create table public.payment_dept_data (
  id uuid default gen_random_uuid() primary key,
  snapshot_id uuid references public.payment_snapshots(id) on delete cascade not null,
  region text not null,
  department text not null,
  gross_salary numeric not null default 0,
  total_deduction numeric default null,
  gross_up_1pct numeric default null,
  eobi numeric default null,
  tax numeric default null,
  net_payable numeric default null,
  employee_count integer not null default 0,
  created_at timestamptz default now()
);

alter table public.payment_snapshots enable row level security;
alter table public.payment_dept_data enable row level security;

create policy "auth_read_payment_snapshots" on public.payment_snapshots
  for select to authenticated using (true);

create policy "auth_insert_payment_snapshots" on public.payment_snapshots
  for insert to authenticated
  with check ((select auth.uid()) = uploaded_by);

create policy "auth_read_payment_dept_data" on public.payment_dept_data
  for select to authenticated using (true);

create policy "auth_insert_payment_dept_data" on public.payment_dept_data
  for insert to authenticated with check (true);
