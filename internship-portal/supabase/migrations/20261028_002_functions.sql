-- =====================================================================
-- Yi MIT-WPU Internship Drive 2026 · public RPCs, company portal, storage
-- =====================================================================

-- ---------- students: submit one application (up to 3 ranked roles) ----------
create or replace function public.submit_application(p jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  s public.drive_settings;
  v_prn text := upper(regexp_replace(coalesce(p->>'prn', ''), '\s', '', 'g'));
  v_email text := lower(trim(coalesce(p->>'email', '')));
  v_phone text := regexp_replace(coalesce(p->>'phone', ''), '[^0-9]', '', 'g');
  v_name text := trim(coalesce(p->>'full_name', ''));
  v_roles jsonb := coalesce(p->'roles', '[]'::jsonb);
  v_portfolio text := nullif(trim(coalesce(p->>'portfolio_url', '')), '');
  v_linkedin text := nullif(trim(coalesce(p->>'linkedin_url', '')), '');
  v_resume text := coalesce(p->>'resume_path', '');
  v_cgpa numeric;
  v_grad int;
  v_role public.roles;
  v_item jsonb;
  v_idx int;
  v_codes text[] := '{}';
  v_needs_portfolio boolean := false;
  v_applicant public.applicants;
  v_app public.applications;
  v_out jsonb := '[]'::jsonb;
begin
  select * into s from public.drive_settings where id;
  if s.id is null or not s.applications_open
     or (s.applications_close_at is not null and now() > s.applications_close_at) then
    raise exception 'Applications for the drive are closed.';
  end if;

  if length(v_phone) = 12 and left(v_phone, 2) = '91' then v_phone := right(v_phone, 10); end if;
  if length(v_phone) = 11 and left(v_phone, 1) = '0' then v_phone := right(v_phone, 10); end if;

  if v_name = '' or length(v_name) > 120 then raise exception 'Enter your full name as on your ID card.'; end if;
  if v_prn !~ '^[0-9A-Z]{8,14}$' then raise exception 'Enter your PRN (8 to 14 letters or digits, no spaces).'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 160 then raise exception 'Enter a valid email address.'; end if;
  if v_phone !~ '^[6-9][0-9]{9}$' then raise exception 'Enter a 10-digit Indian mobile number.'; end if;
  if coalesce(trim(p->>'school'), '') = '' then raise exception 'Choose your school or faculty.'; end if;
  if coalesce(trim(p->>'programme'), '') = '' then raise exception 'Choose your programme.'; end if;
  if coalesce(trim(p->>'specialisation'), '') = '' then raise exception 'Enter your specialisation or branch.'; end if;
  if coalesce(trim(p->>'year_of_study'), '') = '' then raise exception 'Choose your current year of study.'; end if;

  begin
    v_grad := (p->>'graduation_year')::int;
  exception when others then v_grad := null;
  end;
  if v_grad is null or v_grad < 2025 or v_grad > 2032 then raise exception 'Choose your expected graduation year.'; end if;

  begin
    v_cgpa := nullif(p->>'cgpa', '')::numeric;
  exception when others then
    raise exception 'CGPA should be a number between 0 and 10.';
  end;
  if v_cgpa is null or v_cgpa < 0 or v_cgpa > 10 then raise exception 'CGPA should be a number between 0 and 10.'; end if;

  if v_portfolio is not null and v_portfolio !~* '^https?://' then raise exception 'Portfolio / GitHub link should start with https://'; end if;
  if v_linkedin is not null and v_linkedin !~* '^https?://' then raise exception 'LinkedIn link should start with https://'; end if;

  if coalesce((p->>'consent')::boolean, false) is not true then
    raise exception 'Please accept the declaration to submit.';
  end if;

  if coalesce(trim(p->>'office_availability'), '') = '' then raise exception 'Tell us whether you can work from an office in Pune.'; end if;
  if jsonb_typeof(p->'interview_availability') is distinct from 'array'
     or jsonb_array_length(p->'interview_availability') = 0 then
    raise exception 'Pick at least one interview slot you can attend.';
  end if;

  if jsonb_typeof(v_roles) <> 'array' or jsonb_array_length(v_roles) < 1 or jsonb_array_length(v_roles) > 3 then
    raise exception 'Choose between one and three roles.';
  end if;

  if coalesce(trim(p->>'why_fit'), '') = '' then raise exception 'Tell us why you fit your first-choice role.'; end if;
  if length(p->>'why_fit') > 600 then raise exception 'Keep “why you fit” under 600 characters.'; end if;

  -- resume must already be uploaded to the private bucket
  if v_resume !~ '^incoming/[0-9a-f-]{36}/[^/]+\.pdf$' then raise exception 'Upload your resume as a PDF.'; end if;
  if not exists (select 1 from storage.objects o where o.bucket_id = 'resumes' and o.name = v_resume) then
    raise exception 'Your resume did not finish uploading. Please attach it again.';
  end if;

  for v_item, v_idx in select e, i from jsonb_array_elements(v_roles) with ordinality as t(e, i) loop
    select * into v_role from public.roles where code = upper(v_item->>'code');
    if v_role.code is null then raise exception 'Role % does not exist.', v_item->>'code'; end if;
    if not v_role.is_open then raise exception '% is not taking applications now.', v_role.title; end if;
    if v_role.code = any(v_codes) then raise exception 'Each role can be chosen only once.'; end if;
    v_codes := v_codes || v_role.code;
    if v_role.needs_portfolio then v_needs_portfolio := true; end if;
    if v_role.challenge is not null and coalesce(trim(v_item->>'challenge'), '') = '' then
      raise exception '% asks for its application task with your application.', v_role.title;
    end if;
    if length(coalesce(v_item->>'challenge', '')) > 5000 then
      raise exception 'Keep the task answer for % under 5,000 characters, or share a link.', v_role.title;
    end if;
  end loop;

  if v_needs_portfolio and v_portfolio is null then
    raise exception 'One of your roles needs a portfolio or GitHub link.';
  end if;

  if exists (select 1 from public.applicants a where a.prn = v_prn) then
    raise exception 'An application with this PRN already exists. Open “Track my application” to see it, or message the team on WhatsApp to change it.';
  end if;

  perform set_config('app.actor', 'student:' || v_prn, true);

  insert into public.applicants (
    prn, full_name, email, phone, school, programme, specialisation, year_of_study,
    graduation_year, cgpa, professional_courses, linkedin_url, portfolio_url,
    resume_path, resume_name, available_from, office_availability,
    interview_availability, prior_experience, consent)
  values (
    v_prn, v_name, v_email, v_phone,
    left(trim(p->>'school'), 160), left(trim(p->>'programme'), 80), left(trim(p->>'specialisation'), 120),
    left(trim(p->>'year_of_study'), 40), v_grad, v_cgpa,
    coalesce((select array_agg(left(x, 20)) from jsonb_array_elements_text(coalesce(p->'professional_courses', '[]'::jsonb)) x), '{}'),
    left(v_linkedin, 300), left(v_portfolio, 300),
    v_resume, left(coalesce(p->>'resume_name', ''), 200),
    nullif(p->>'available_from', '')::date,
    left(trim(p->>'office_availability'), 60),
    (select array_agg(left(x, 60)) from jsonb_array_elements_text(p->'interview_availability') x),
    left(nullif(trim(coalesce(p->>'prior_experience', '')), ''), 600),
    true)
  returning * into v_applicant;

  for v_item, v_idx in select e, i from jsonb_array_elements(v_roles) with ordinality as t(e, i) loop
    insert into public.applications (applicant_id, role_code, preference, why_fit, challenge_response)
    values (
      v_applicant.id, upper(v_item->>'code'), v_idx,
      case when v_idx = 1 then left(trim(p->>'why_fit'), 600) else null end,
      nullif(trim(coalesce(v_item->>'challenge', '')), ''))
    returning * into v_app;
    v_out := v_out || jsonb_build_object('app_code', v_app.app_code, 'role_code', v_app.role_code, 'preference', v_app.preference);
  end loop;

  return jsonb_build_object(
    'student_code', v_applicant.student_code,
    'full_name', v_applicant.full_name,
    'applications', v_out);
end $$;

-- ---------- students: track (PRN + email + mobile must all match) ----------
create or replace function public.track_application(p_prn text, p_email text, p_phone text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_phone text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  a public.applicants;
begin
  if length(v_phone) > 10 then v_phone := right(v_phone, 10); end if;
  select * into a from public.applicants
   where prn = upper(regexp_replace(coalesce(p_prn, ''), '\s', '', 'g'))
     and lower(email) = lower(trim(coalesce(p_email, '')))
     and phone = v_phone;
  if a.id is null then return null; end if;

  return jsonb_build_object(
    'student_code', a.student_code,
    'full_name', a.full_name,
    'submitted_at', a.created_at,
    'applications', coalesce((
      select jsonb_agg(jsonb_build_object(
        'app_code', ap.app_code,
        'role_code', ap.role_code,
        'role_title', r.title,
        'company', c.name,
        'preference', ap.preference,
        'status', ap.status,
        'interviews', coalesce((
          select jsonb_agg(jsonb_build_object(
            'interview_code', iv.interview_code,
            'starts_at', iv.starts_at, 'ends_at', iv.ends_at, 'reporting_at', iv.reporting_at,
            'mode', iv.mode, 'room', iv.room, 'meet_url', iv.meet_url, 'panel', iv.panel)
            order by iv.starts_at)
          from public.interviews iv
          where iv.application_id = ap.id and not iv.cancelled), '[]'::jsonb)
      ) order by ap.preference)
      from public.applications ap
      join public.roles r on r.code = ap.role_code
      join public.companies c on c.code = r.company_code
      where ap.applicant_id = a.id), '[]'::jsonb));
end $$;

-- ---------- public: live counts (no personal data) ----------
create or replace function public.public_counts()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'applicants', (select count(*) from public.applicants),
    'applications', (select count(*) from public.applications where status <> 'Duplicate'));
$$;

-- ---------- company portal (private link token) ----------
create or replace function public.company_code_for_token(p_token text)
returns text language sql stable security definer set search_path = '' as $$
  select company_code from public.company_private where access_token = p_token and length(p_token) >= 24;
$$;

create or replace function public.company_portal(p_token text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_code text := public.company_code_for_token(p_token);
  v_share boolean;
begin
  if v_code is null then raise exception 'This company link is not valid. Ask the Yi team for a new one.'; end if;
  select share_unscreened into v_share from public.company_private where company_code = v_code;

  return jsonb_build_object(
    'company', (select to_jsonb(c) from public.companies c where c.code = v_code),
    'settings', (select jsonb_build_object('drive_name', s.drive_name, 'drive_days', s.drive_days, 'venue', s.venue, 'timings_note', s.timings_note) from public.drive_settings s where s.id),
    'roles', coalesce((select jsonb_agg(jsonb_build_object(
        'code', r.code, 'title', r.title, 'openings', r.openings, 'track', r.track,
        'interview_minutes', r.interview_minutes) order by r.sort_order)
      from public.roles r where r.company_code = v_code), '[]'::jsonb),
    'sessions', coalesce((select jsonb_agg(to_jsonb(ds) order by ds.day, ds.starts_at)
      from public.drive_sessions ds where ds.company_code = v_code), '[]'::jsonb),
    'applications', coalesce((select jsonb_agg(jsonb_build_object(
        'id', ap.id, 'app_code', ap.app_code, 'role_code', ap.role_code, 'preference', ap.preference,
        'status', ap.status, 'company_decision', ap.company_decision,
        'company_rating', ap.company_rating, 'company_comment', ap.company_comment,
        'why_fit', ap.why_fit, 'challenge_response', ap.challenge_response,
        'student', jsonb_build_object(
          'student_code', a.student_code, 'full_name', a.full_name, 'school', a.school,
          'programme', a.programme, 'specialisation', a.specialisation,
          'year_of_study', a.year_of_study, 'graduation_year', a.graduation_year, 'cgpa', a.cgpa,
          'professional_courses', a.professional_courses,
          'portfolio_url', a.portfolio_url, 'linkedin_url', a.linkedin_url,
          'available_from', a.available_from, 'office_availability', a.office_availability,
          'interview_availability', a.interview_availability, 'prior_experience', a.prior_experience,
          'has_resume', a.resume_path is not null,
          'email', case when ap.company_decision in ('Shortlisted','Selected','Waitlisted','Next Round')
                          or ap.status in ('Interview Scheduled','Interviewed','Selected','Waitlisted','Offer Accepted','Offer Declined')
                        then a.email end,
          'phone', case when ap.company_decision in ('Shortlisted','Selected','Waitlisted','Next Round')
                          or ap.status in ('Interview Scheduled','Interviewed','Selected','Waitlisted','Offer Accepted','Offer Declined')
                        then a.phone end),
        'interviews', coalesce((select jsonb_agg(jsonb_build_object(
            'interview_code', iv.interview_code, 'starts_at', iv.starts_at, 'ends_at', iv.ends_at,
            'mode', iv.mode, 'room', iv.room, 'meet_url', iv.meet_url, 'panel', iv.panel,
            'checked_in_at', iv.checked_in_at, 'done', iv.done, 'no_show', iv.no_show) order by iv.starts_at)
          from public.interviews iv where iv.application_id = ap.id and not iv.cancelled), '[]'::jsonb)
      ) order by r.sort_order, ap.preference, a.full_name)
      from public.applications ap
      join public.applicants a on a.id = ap.applicant_id
      join public.roles r on r.code = ap.role_code
      where r.company_code = v_code
        and ap.status not in ('Duplicate','Not Eligible','Withdrawn')
        and (v_share or ap.status <> 'Applied')), '[]'::jsonb));
end $$;

create or replace function public.company_set_decision(
  p_token text, p_application uuid, p_decision text, p_rating int default null, p_comment text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_code text := public.company_code_for_token(p_token);
  ap public.applications;
  v_status text;
  v_after_interview boolean;
begin
  if v_code is null then raise exception 'This company link is not valid.'; end if;
  select a.* into ap from public.applications a join public.roles r on r.code = a.role_code
   where a.id = p_application and r.company_code = v_code;
  if ap.id is null then raise exception 'That applicant is not in your list.'; end if;
  if p_decision is not null and p_decision not in ('Shortlisted','Rejected','Selected','Waitlisted','Not Selected','Next Round') then
    raise exception 'Unknown decision.';
  end if;
  if p_rating is not null and (p_rating < 1 or p_rating > 5) then raise exception 'Rating is 1 to 5.'; end if;

  v_after_interview := ap.status in ('Interviewed','No-show','Selected','Waitlisted','Not Selected','Offer Accepted','Offer Declined');
  v_status := case p_decision
    when 'Rejected' then case when v_after_interview then 'Not Selected' else 'Rejected (Company Screen)' end
    when 'Selected' then 'Selected'
    when 'Waitlisted' then 'Waitlisted'
    when 'Not Selected' then 'Not Selected'
    when 'Next Round' then 'Interviewed'
    when 'Shortlisted' then case when ap.status in ('Rejected (Company Screen)') then 'Eligible' else ap.status end
    else ap.status end;

  perform set_config('app.actor', 'company:' || v_code, true);
  update public.applications
     set company_decision = p_decision,
         company_rating = coalesce(p_rating, company_rating),
         company_comment = coalesce(left(p_comment, 1000), company_comment),
         status = case when status in ('Offer Accepted','Offer Declined','Withdrawn') then status else v_status end
   where id = ap.id
  returning * into ap;

  return jsonb_build_object('id', ap.id, 'status', ap.status, 'company_decision', ap.company_decision,
                            'company_rating', ap.company_rating, 'company_comment', ap.company_comment);
end $$;

-- an anonymous session that opened the company link may read that company's resumes
create or replace function public.claim_company_access(p_token text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_code text := public.company_code_for_token(p_token);
begin
  if v_code is null then raise exception 'This company link is not valid.'; end if;
  if auth.uid() is null then raise exception 'Sign-in session missing.'; end if;
  insert into public.company_viewers(user_id, company_code) values (auth.uid(), v_code)
  on conflict do nothing;
  return v_code;
end $$;

create or replace function public.company_resume_path(p_token text, p_application uuid)
returns text language sql stable security definer set search_path = '' as $$
  select a.resume_path
  from public.applications ap
  join public.applicants a on a.id = ap.applicant_id
  join public.roles r on r.code = ap.role_code
  where ap.id = p_application
    and r.company_code = public.company_code_for_token(p_token)
    and ap.status not in ('Duplicate','Not Eligible','Withdrawn');
$$;

create or replace function public.can_read_resume(p_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_organizer() or exists (
    select 1
    from public.company_viewers cv
    join public.roles r on r.company_code = cv.company_code
    join public.applications ap on ap.role_code = r.code
    join public.applicants a on a.id = ap.applicant_id
    where cv.user_id = auth.uid()
      and a.resume_path = p_name
      and ap.status not in ('Duplicate','Not Eligible','Withdrawn'));
$$;

-- ---------- grants ----------
revoke all on function public.submit_application(jsonb) from public;
revoke all on function public.track_application(text, text, text) from public;
revoke all on function public.public_counts() from public;
revoke all on function public.company_portal(text) from public;
revoke all on function public.company_set_decision(text, uuid, text, int, text) from public;
revoke all on function public.claim_company_access(text) from public;
revoke all on function public.company_resume_path(text, uuid) from public;
revoke all on function public.company_code_for_token(text) from public, anon, authenticated;
revoke all on function public.actor_name() from public, anon, authenticated;

grant execute on function public.submit_application(jsonb) to anon, authenticated;
grant execute on function public.track_application(text, text, text) to anon, authenticated;
grant execute on function public.public_counts() to anon, authenticated;
grant execute on function public.company_portal(text) to anon, authenticated;
grant execute on function public.company_set_decision(text, uuid, text, int, text) to anon, authenticated;
grant execute on function public.claim_company_access(text) to authenticated;
grant execute on function public.company_resume_path(text, uuid) to anon, authenticated;
grant execute on function public.is_organizer() to anon, authenticated;
grant execute on function public.can_read_resume(text) to authenticated;

-- ---------- storage: private resume bucket ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resumes', 'resumes', false, 5242880, array['application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = array['application/pdf'];

drop policy if exists "resumes: anyone uploads into incoming" on storage.objects;
create policy "resumes: anyone uploads into incoming" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = 'incoming' and lower(storage.extension(name)) = 'pdf');

drop policy if exists "resumes: organisers and company viewers read" on storage.objects;
create policy "resumes: organisers and company viewers read" on storage.objects
  for select to authenticated
  using (bucket_id = 'resumes' and public.can_read_resume(name));

drop policy if exists "resumes: organisers delete" on storage.objects;
create policy "resumes: organisers delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'resumes' and public.is_organizer());
