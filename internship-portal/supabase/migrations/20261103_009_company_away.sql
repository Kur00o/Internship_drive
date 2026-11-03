-- A company can be marked as not coming on a drive day (Schedule tab): allotment
-- skips it, its open slots that day are cancelled and the Slots board drops its column.

alter table public.drive_sessions
  add column if not exists away boolean not null default false;
