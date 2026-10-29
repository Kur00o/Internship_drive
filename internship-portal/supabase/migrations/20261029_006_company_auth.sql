-- Company logins. Organisers already sign in with Supabase Auth (public.organizers);
-- this gives each company the same: a Supabase Auth user whose confirmed email is
-- listed in public.company_users sees only that company's dashboard.
-- The private /company/<token> links keep working unless a company's link is switched off.

create table if not exists public.company_users (
  email text primary key check (email = lower(email)),
  company_code text not null references public.companies(code) on delete cascade on update cascade,
  name text,
  added_at timestamptz not null default now()
);
create index if not exists company_users_company_idx on public.company_users(company_code);

alter table public.company_users enable row level security;
drop policy if exists "organisers only" on public.company_users;
create policy "organisers only" on public.company_users
  for all to authenticated using (public.is_organizer()) with check (public.is_organizer());

-- let an organiser turn the private link off once a company uses its login
alter table public.company_private add column if not exists link_enabled boolean not null default true;

-- company of the signed-in (non-anonymous, email-confirmed) user, or null
create or replace function public.current_company_code()
returns text language sql stable security definer set search_path = '' as $$
  select cu.company_code
  from auth.users u
  join public.company_users cu on cu.email = lower(u.email)
  where u.id = auth.uid()
    and u.email_confirmed_at is not null
    and coalesce(u.is_anonymous, false) = false
  limit 1;
$$;

-- Every company RPC resolves its company here. A blank token means "use my login";
-- otherwise it is the private link token, as before.
create or replace function public.company_code_for_token(p_token text)
returns text language sql stable security definer set search_path = '' as $$
  select case
    when coalesce(p_token, '') = '' then public.current_company_code()
    else (select company_code from public.company_private
          where access_token = p_token and length(p_token) >= 24 and link_enabled)
  end;
$$;

revoke all on function public.current_company_code() from public, anon;
grant execute on function public.current_company_code() to authenticated;
revoke all on function public.company_code_for_token(text) from public, anon, authenticated;

-- /api/resume forwards the company user's own JWT, so the check runs as that user
grant execute on function public.company_resume_path(text, uuid) to authenticated;
