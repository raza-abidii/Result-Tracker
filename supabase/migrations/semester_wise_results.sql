-- Updated migration for semester-wise results with SGPA and backlogs
-- Enable required extensions
create extension if not exists "uuid-ossp";

-- Create enum for result status
create type public.result_status as enum ('PASS', 'FAIL');

-- Create enum for semester
create type public.semester as enum ('1', '2', '3', '4', '5', '6', '7', '8');

-- Create results table with semester support
create table public.results (
  id uuid primary key default gen_random_uuid(),
  hall_ticket bigint not null check (hall_ticket >= 160300000000 and hall_ticket <= 160399999999),
  student_name varchar(100) not null,
  semester semester not null,
  subject_code varchar(20) not null,
  subject_name varchar(100) not null,
  credits integer not null check (credits > 0 and credits <= 10),
  cie_marks integer not null check (cie_marks >= 0 and cie_marks <= 30),
  external_marks integer not null check (external_marks >= 0 and external_marks <= 70),
  total integer generated always as (cie_marks + external_marks) stored,
  grade varchar(2) generated always as (
    case 
      when (cie_marks + external_marks) >= 85 then 'S'
      when (cie_marks + external_marks) >= 70 then 'A'
      when (cie_marks + external_marks) >= 60 then 'B'
      when (cie_marks + external_marks) >= 55 then 'C'
      when (cie_marks + external_marks) >= 50 then 'D'
      when (cie_marks + external_marks) >= 40 and cie_marks >= 12 and external_marks >= 28 then 'E'
      else 'F'
    end
  ) stored,
  grade_points decimal(3,1) generated always as (
    case 
      when (cie_marks + external_marks) >= 85 then 10.0
      when (cie_marks + external_marks) >= 70 then 9.0
      when (cie_marks + external_marks) >= 60 then 8.0
      when (cie_marks + external_marks) >= 55 then 7.0
      when (cie_marks + external_marks) >= 50 then 6.0
      when (cie_marks + external_marks) >= 40 and cie_marks >= 12 and external_marks >= 28 then 5.0
      else 0.0
    end
  ) stored,
  result result_status not null,
  is_backlog boolean generated always as (
    case 
      when (cie_marks + external_marks) < 40 or cie_marks < 18 or external_marks < 18 then true
      else false
    end
  ) stored,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(hall_ticket, semester, subject_code)
);

-- Create index for faster searches by hall ticket
create index idx_results_hall_ticket on public.results(hall_ticket);
create index idx_results_semester on public.results(hall_ticket, semester);

-- Enable RLS
alter table public.results enable row level security;

-- Policy: Anyone can view results (students need to search)
create policy "Anyone can view results"
  on public.results for select
  using (true);

-- Policy: Only authenticated users can insert results
create policy "Authenticated users can insert results"
  on public.results for insert
  to authenticated
  with check (true);

-- Policy: Only authenticated users can update results
create policy "Authenticated users can update results"
  on public.results for update
  to authenticated
  using (true);

-- Policy: Only authenticated users can delete results
create policy "Authenticated users can delete results"
  on public.results for delete
  to authenticated
  using (true);

-- Create enum for user roles
create type public.app_role as enum ('admin', 'student');

-- Create user_roles table
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  created_at timestamp with time zone default now(),
  unique (user_id, role)
);

-- Enable RLS on user_roles
alter table public.user_roles enable row level security;

-- Policy: Users can view their own roles
create policy "Users can view own roles"
  on public.user_roles for select
  using (auth.uid() = user_id);

-- Policy: Only admins can manage roles
create policy "Admins can manage roles"
  on public.user_roles for all
  using (exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'admin'
  ));

-- Create security definer function to check admin role
create or replace function public.is_admin(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = 'admin'
  )
$$;

-- Create function to automatically update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Create trigger for updated_at
create trigger set_updated_at
  before update on public.results
  for each row
  execute function public.handle_updated_at();

-- Create profiles table for additional user info
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email varchar(255) not null,
  full_name varchar(100),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Policy: Users can view their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Policy: Users can update their own profile
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Function to handle new user creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$;

-- Trigger for new user creation
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Trigger for profiles updated_at
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.handle_updated_at();

-- Create view for semester-wise SGPA calculation
create or replace view public.semester_sgpa as
select 
  hall_ticket,
  semester,
  student_name,
  round(
    sum(grade_points * credits)::decimal / sum(credits)::decimal, 
    2
  ) as sgpa,
  count(*) as total_subjects,
  count(*) filter (where is_backlog = true) as backlogs,
  sum(credits) as total_credits
from public.results
group by hall_ticket, semester, student_name;

-- Create view for overall CGPA calculation
create or replace view public.student_cgpa as
select 
  hall_ticket,
  student_name,
  round(
    sum(grade_points * credits)::decimal / sum(credits)::decimal, 
    2
  ) as cgpa,
  count(distinct semester) as completed_semesters,
  count(*) as total_subjects,
  count(*) filter (where is_backlog = true) as total_backlogs,
  sum(credits) as total_credits
from public.results
group by hall_ticket, student_name;