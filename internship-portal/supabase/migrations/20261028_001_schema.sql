-- =====================================================================
-- Yi MIT-WPU Internship Drive 2026 · schema
-- Mirrors the Operations Plan (25 Oct 2026): role codes, student/app/
-- interview IDs, status values (§5.4) and eligibility reason codes (§5.5).
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

create sequence if not exists public.applicant_seq;
create sequence if not exists public.application_seq;
create sequence if not exists public.interview_seq;

-- ---------- drive settings (single row) ----------
create table if not exists public.drive_settings (
  id boolean primary key default true check (id),
  drive_name text not null default 'Internship Drive 2026',
  chapter_name text not null default 'Young Indians · MIT-WPU Student Chapter',
  drive_days date[] not null default array['2026-11-02','2026-11-03']::date[],
  timings_note text default 'Timings to be announced',
  venue text default 'MIT-WPU, Pune · rooms to be announced',
  applications_open boolean not null default true,
  applications_close_at timestamptz,
  whatsapp_url text default 'https://chat.whatsapp.com/ILP99hC5UXC6dDzbtQXCy5',
  contact_email text,
  contact_phone text,
  announcement text,
  min_duration text not null default '3 months minimum',
  joining text not null default 'As soon as possible',
  selection_process text not null default 'Interviews only',
  updated_at timestamptz not null default now()
);

-- ---------- companies & roles (public) ----------
create table if not exists public.companies (
  code text primary key check (code ~ '^[A-Z]{3}$'),
  name text not null,
  short_name text not null,
  about text,
  website text,
  office_location text,
  work_mode text,
  jd_folder_url text,
  jd_status text not null default 'published' check (jd_status in ('published','pending')),
  sort_order int not null default 100,
  created_at timestamptz not null default now()
);

create table if not exists public.company_private (
  company_code text primary key references public.companies(code) on delete cascade on update cascade,
  access_token text not null unique default encode(extensions.gen_random_bytes(18), 'hex'),
  contact_name text,
  contact_phone text,
  contact_email text,
  coordinator text,
  share_unscreened boolean not null default true,
  notes text,
  updated_at timestamptz not null default now()
);

create table if not exists public.roles (
  code text primary key check (code ~ '^[A-Z]{3}-[A-Z]{2,4}$'),
  company_code text not null references public.companies(code) on update cascade,
  title text not null,
  track text not null check (track in ('Tech','Finance','Business & Sales','Human Resources','Psychology','Creative & Media')),
  tags text[] not null default '{}',
  programmes text[] not null default '{Any}',
  summary text not null,
  about text,
  responsibilities text[] not null default '{}',
  requirements text[] not null default '{}',
  good_to_have text[] not null default '{}',
  perks text[] not null default '{}',
  eligibility text not null,
  openings int,
  stipend text not null default 'To be confirmed',
  duration text not null,
  work_mode text not null,
  location text not null,
  joining text,
  needs_portfolio boolean not null default false,
  portfolio_hint text,
  challenge text,
  challenge_materials_url text,
  jd_url text,
  interview_minutes int not null default 15,
  is_open boolean not null default true,
  sort_order int not null default 100,
  updated_at timestamptz not null default now()
);
create index if not exists roles_company_idx on public.roles(company_code);

create table if not exists public.drive_sessions (
  id uuid primary key default gen_random_uuid(),
  company_code text not null references public.companies(code) on delete cascade on update cascade,
  day date not null,
  starts_at time,
  ends_at time,
  venue text,
  mode text not null default 'On campus' check (mode in ('On campus','Online','On campus + online')),
  panels int not null default 1 check (panels between 1 and 10),
  note text,
  created_at timestamptz not null default now()
);
create index if not exists drive_sessions_day_idx on public.drive_sessions(day);

-- ---------- people (private) ----------
create table if not exists public.organizers (
  email text primary key check (email = lower(email)),
  name text,
  added_at timestamptz not null default now()
);

create table if not exists public.applicants (
  id uuid primary key default gen_random_uuid(),
  student_code text not null unique default ('STU-' || lpad(nextval('public.applicant_seq')::text, 4, '0')),
  prn text not null unique,
  full_name text not null,
  email text not null,
  phone text not null,
  school text not null,
  programme text not null,
  specialisation text not null,
  year_of_study text not null,
  graduation_year int not null,
  cgpa numeric(4,2) check (cgpa between 0 and 10),
  professional_courses text[] not null default '{}',
  linkedin_url text,
  portfolio_url text,
  resume_path text not null,
  resume_name text,
  available_from date,
  office_availability text,
  interview_availability text[] not null default '{}',
  prior_experience text,
  consent boolean not null default false,
  accepted_role_code text references public.roles(code),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists applicants_email_idx on public.applicants(lower(email));

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  app_code text not null unique default ('APP-' || lpad(nextval('public.application_seq')::text, 4, '0')),
  applicant_id uuid not null references public.applicants(id) on delete cascade,
  role_code text not null references public.roles(code) on update cascade,
  preference smallint not null check (preference between 1 and 3),
  why_fit text,
  challenge_response text,
  status text not null default 'Applied' check (status in (
    'Applied','Duplicate','Not Eligible','Eligible','Rejected (Company Screen)',
    'Assignment Sent','Assignment Submitted','Assignment Not Submitted',
    'Interview Scheduled','Interviewed','No-show','Selected','Waitlisted','Not Selected',
    'Offer Accepted','Offer Declined','Withdrawn')),
  reason_code text check (reason_code in ('E1','E2','E3','E4','E5','E6','E7')),
  company_decision text check (company_decision in ('Shortlisted','Rejected','Selected','Waitlisted','Not Selected','Next Round')),
  company_rating smallint check (company_rating between 1 and 5),
  company_comment text,
  remarks text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (applicant_id, role_code),
  unique (applicant_id, preference)
);
create index if not exists applications_role_idx on public.applications(role_code);
create index if not exists applications_status_idx on public.applications(status);

create table if not exists public.status_log (
  id bigint generated always as identity primary key,
  application_id uuid not null references public.applications(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by text not null,
  note text,
  changed_at timestamptz not null default now()
);
create index if not exists status_log_app_idx on public.status_log(application_id);

create table if not exists public.interviews (
  id uuid primary key default gen_random_uuid(),
  interview_code text not null unique default ('INT-' || lpad(nextval('public.interview_seq')::text, 3, '0')),
  application_id uuid not null references public.applications(id) on delete cascade,
  panel text,
  mode text not null default 'Campus' check (mode in ('Campus','Online')),
  room text,
  meet_url text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reporting_at timestamptz,
  checked_in_at timestamptz,
  done boolean not null default false,
  no_show boolean not null default false,
  cancelled boolean not null default false,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists interviews_app_idx on public.interviews(application_id);
create index if not exists interviews_start_idx on public.interviews(starts_at);

-- anonymous sessions that opened a company link (lets them sign resume URLs)
create table if not exists public.company_viewers (
  user_id uuid not null,
  company_code text not null references public.companies(code) on delete cascade on update cascade,
  claimed_at timestamptz not null default now(),
  primary key (user_id, company_code)
);

-- =====================================================================
-- Helper functions
-- =====================================================================
create or replace function public.is_organizer()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from auth.users u
    join public.organizers o on o.email = lower(u.email)
    where u.id = auth.uid()
      and u.email_confirmed_at is not null
      and coalesce(u.is_anonymous, false) = false
  );
$$;

create or replace function public.actor_name()
returns text language sql stable security definer set search_path = '' as $$
  select coalesce(
    nullif(current_setting('app.actor', true), ''),
    (select u.email from auth.users u where u.id = auth.uid()),
    'system');
$$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create or replace function public.applications_before_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.updated_at := now();
  if new.status is distinct from old.status then
    new.updated_by := public.actor_name();
    insert into public.status_log(application_id, from_status, to_status, changed_by, note)
    values (new.id, old.status, new.status, new.updated_by, new.remarks);
  end if;
  return new;
end $$;

drop trigger if exists applications_before_update on public.applications;
create trigger applications_before_update before update on public.applications
  for each row execute function public.applications_before_update();

create or replace function public.applications_after_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.status_log(application_id, from_status, to_status, changed_by, note)
  values (new.id, null, new.status, public.actor_name(), 'Application submitted');
  return new;
end $$;

drop trigger if exists applications_after_insert on public.applications;
create trigger applications_after_insert after insert on public.applications
  for each row execute function public.applications_after_insert();

-- interview rows move the application along
create or replace function public.interviews_sync_status()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' and not new.cancelled then
    update public.applications set status = 'Interview Scheduled'
     where id = new.application_id
       and status in ('Applied','Eligible','Assignment Submitted','Assignment Sent','Interviewed','No-show');
  elsif tg_op = 'UPDATE' then
    if new.done and not old.done then
      update public.applications set status = 'Interviewed'
       where id = new.application_id and status in ('Interview Scheduled','No-show');
    elsif new.no_show and not old.no_show then
      update public.applications set status = 'No-show'
       where id = new.application_id and status in ('Interview Scheduled','Interviewed');
    end if;
  end if;
  return new;
end $$;

drop trigger if exists interviews_sync_status on public.interviews;
create trigger interviews_sync_status after insert or update on public.interviews
  for each row execute function public.interviews_sync_status();

drop trigger if exists applicants_touch on public.applicants;
create trigger applicants_touch before update on public.applicants
  for each row execute function public.touch_updated_at();
drop trigger if exists roles_touch on public.roles;
create trigger roles_touch before update on public.roles
  for each row execute function public.touch_updated_at();
drop trigger if exists settings_touch on public.drive_settings;
create trigger settings_touch before update on public.drive_settings
  for each row execute function public.touch_updated_at();
drop trigger if exists company_private_touch on public.company_private;
create trigger company_private_touch before update on public.company_private
  for each row execute function public.touch_updated_at();

-- new companies get a private row (and token) automatically
create or replace function public.companies_after_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.company_private(company_code) values (new.code) on conflict do nothing;
  return new;
end $$;
drop trigger if exists companies_after_insert on public.companies;
create trigger companies_after_insert after insert on public.companies
  for each row execute function public.companies_after_insert();

-- =====================================================================
-- Row level security
-- =====================================================================
alter table public.drive_settings  enable row level security;
alter table public.companies       enable row level security;
alter table public.company_private enable row level security;
alter table public.roles           enable row level security;
alter table public.drive_sessions  enable row level security;
alter table public.organizers      enable row level security;
alter table public.applicants      enable row level security;
alter table public.applications    enable row level security;
alter table public.status_log      enable row level security;
alter table public.interviews      enable row level security;
alter table public.company_viewers enable row level security;

-- public reference data: anyone reads, organisers write
do $$
declare t text;
begin
  foreach t in array array['drive_settings','companies','roles','drive_sessions'] loop
    execute format('drop policy if exists "public read" on public.%I', t);
    execute format('create policy "public read" on public.%I for select to anon, authenticated using (true)', t);
    execute format('drop policy if exists "organisers write" on public.%I', t);
    execute format('create policy "organisers write" on public.%I for all to authenticated using (public.is_organizer()) with check (public.is_organizer())', t);
  end loop;
  foreach t in array array['company_private','organizers','applicants','applications','status_log','interviews'] loop
    execute format('drop policy if exists "organisers only" on public.%I', t);
    execute format('create policy "organisers only" on public.%I for all to authenticated using (public.is_organizer()) with check (public.is_organizer())', t);
  end loop;
end $$;

-- anon never writes directly anywhere
revoke insert, update, delete, truncate on all tables in schema public from anon;

-- realtime for the interview-day board
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.interviews;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.applications;
    exception when duplicate_object then null;
    end;
  end if;
end $$;
