-- Interview slot allotment: attendance (first come, first served), venues,
-- and the scheduling rules the allotment uses.

alter table public.drive_settings
  add column if not exists slot_minutes int not null default 30 check (slot_minutes between 5 and 180),
  add column if not exists buffer_minutes int not null default 20 check (buffer_minutes between 0 and 120),
  add column if not exists day_start time not null default '11:00',
  add column if not exists day_end time not null default '17:00',
  add column if not exists lunch_start time default '13:00',
  add column if not exists lunch_end time default '14:00';

create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  note text,
  sort_order int not null default 100,
  created_at timestamptz not null default now()
);

create sequence if not exists public.attendance_seq;

-- one row per student per drive day; seq is the arrival order
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.applicants(id) on delete cascade,
  day date not null,
  seq bigint not null default nextval('public.attendance_seq'),
  marked_at timestamptz not null default now(),
  marked_by text,
  unique (applicant_id, day)
);
create index if not exists attendance_day_idx on public.attendance(day, seq);

-- two live interviews can never take the same panel at the same time
-- (guards against two organisers marking attendance at once)
create unique index if not exists interviews_panel_slot_uq
  on public.interviews(panel, starts_at) where not cancelled and panel is not null;

alter table public.venues     enable row level security;
alter table public.attendance enable row level security;

drop policy if exists "public read" on public.venues;
create policy "public read" on public.venues for select to anon, authenticated using (true);
drop policy if exists "organisers write" on public.venues;
create policy "organisers write" on public.venues for all to authenticated
  using (public.is_organizer()) with check (public.is_organizer());

drop policy if exists "organisers only" on public.attendance;
create policy "organisers only" on public.attendance for all to authenticated
  using (public.is_organizer()) with check (public.is_organizer());

revoke insert, update, delete, truncate on public.venues, public.attendance from anon;
revoke all on public.attendance from anon;
grant usage, select on sequence public.attendance_seq to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.attendance;
    exception when duplicate_object then null;
    end;
  end if;
end $$;
