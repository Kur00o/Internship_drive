-- Security advisor follow-up: only the RPCs the site calls stay executable
-- by the API roles. Trigger functions run without EXECUTE, and the
-- anonymous-session claim path is not used (company resumes go through
-- the /api/resume Vercel Function instead).

revoke execute on function public.applications_after_insert()  from public, anon, authenticated;
revoke execute on function public.applications_before_update() from public, anon, authenticated;
revoke execute on function public.companies_after_insert()     from public, anon, authenticated;
revoke execute on function public.interviews_sync_status()     from public, anon, authenticated;
revoke execute on function public.touch_updated_at()           from public, anon, authenticated;
revoke execute on function public.claim_company_access(text)   from public, anon, authenticated;
revoke execute on function public.can_read_resume(text)        from public, anon;
revoke execute on function public.is_organizer()               from public, anon;
grant  execute on function public.is_organizer()               to authenticated;
grant  execute on function public.can_read_resume(text)        to authenticated;
