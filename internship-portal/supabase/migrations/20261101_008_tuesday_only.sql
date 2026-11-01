-- All companies now interview on Tuesday 3 November; nothing runs on Monday 2 November.
-- Interviews already booked are left alone: move or cancel any Monday ones by hand.

alter table public.drive_settings
  alter column drive_days set default array['2026-11-03']::date[];

update public.drive_settings set drive_days = array['2026-11-03']::date[];

-- a company with sessions on both days keeps Tuesday's
delete from public.drive_sessions m
 where m.day = '2026-11-02'
   and exists (select 1 from public.drive_sessions t where t.company_code = m.company_code and t.day = '2026-11-03');

update public.drive_sessions set day = '2026-11-03' where day = '2026-11-02';
