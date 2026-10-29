import { supabase } from './supabase';
import type {
  Application,
  ApplicationPayload,
  Attendance,
  Company,
  CompanyPrivate,
  DriveSession,
  DriveSettings,
  Interview,
  PortalData,
  PublicData,
  Role,
  StatusLogEntry,
  SubmitResult,
  TrackResult,
  Venue,
} from './types';

function fail(error: { message: string } | null): never {
  throw new Error(error?.message || 'Something went wrong. Please try again.');
}

// ---------------------------------------------------------------- public
let publicCache: Promise<PublicData> | null = null;

export function loadPublicData(force = false): Promise<PublicData> {
  if (!publicCache || force) {
    publicCache = (async () => {
      const [s, c, r, d] = await Promise.all([
        supabase.from('drive_settings').select('*').single(),
        supabase.from('companies').select('*').order('sort_order'),
        supabase.from('roles').select('*').order('sort_order'),
        supabase.from('drive_sessions').select('*').order('day').order('starts_at'),
      ]);
      if (s.error) fail(s.error);
      if (c.error) fail(c.error);
      if (r.error) fail(r.error);
      if (d.error) fail(d.error);
      return {
        settings: s.data as DriveSettings,
        companies: c.data as Company[],
        roles: r.data as Role[],
        sessions: d.data as DriveSession[],
      };
    })();
    publicCache.catch(() => {
      publicCache = null;
    });
  }
  return publicCache;
}

export async function publicCounts(): Promise<{ applicants: number; applications: number }> {
  const { data, error } = await supabase.rpc('public_counts');
  if (error) fail(error);
  return data as { applicants: number; applications: number };
}

// ---------------------------------------------------------------- students
function safeFileName(name: string) {
  const base = name.replace(/\.pdf$/i, '').replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 60) || 'resume';
  return `${base}.pdf`;
}

export async function uploadResume(file: File, prn: string, fullName: string): Promise<{ path: string; name: string }> {
  const id = crypto.randomUUID();
  const label = safeFileName(`${prn}_${fullName}_Resume`);
  const path = `incoming/${id}/${label}`;
  const { error } = await supabase.storage
    .from('resumes')
    .upload(path, file, { contentType: 'application/pdf', upsert: false, cacheControl: '3600' });
  if (error) fail(error);
  return { path, name: file.name };
}

export async function submitApplication(payload: ApplicationPayload): Promise<SubmitResult> {
  const { data, error } = await supabase.rpc('submit_application', { p: payload });
  if (error) fail(error);
  return data as SubmitResult;
}

export async function trackApplication(prn: string, email: string, phone: string): Promise<TrackResult | null> {
  const { data, error } = await supabase.rpc('track_application', { p_prn: prn, p_email: email, p_phone: phone });
  if (error) fail(error);
  return (data as TrackResult | null) ?? null;
}

// ---------------------------------------------------------------- company portal
export async function loadCompanyPortal(token: string): Promise<PortalData> {
  const { data, error } = await supabase.rpc('company_portal', { p_token: token });
  if (error) fail(error);
  return data as PortalData;
}

export async function setCompanyDecision(
  token: string,
  applicationId: string,
  decision: string | null,
  rating?: number | null,
  comment?: string | null,
) {
  const { data, error } = await supabase.rpc('company_set_decision', {
    p_token: token,
    p_application: applicationId,
    p_decision: decision,
    p_rating: rating ?? null,
    p_comment: comment ?? null,
  });
  if (error) fail(error);
  return data as { status: string; company_decision: string | null; company_rating: number | null; company_comment: string | null };
}

export function companyResumeUrl(token: string, applicationId: string) {
  return `/api/resume?t=${encodeURIComponent(token)}&a=${encodeURIComponent(applicationId)}`;
}

// ---------------------------------------------------------------- organisers
export async function amIOrganizer(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_organizer');
  if (error) return false;
  return Boolean(data);
}

export async function loadApplications(): Promise<Application[]> {
  const out: Application[] = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data, error } = await supabase
      .from('applications')
      .select('*, applicant:applicants(*), interviews(*)')
      .order('created_at', { ascending: false })
      .range(from, from + page - 1);
    if (error) fail(error);
    out.push(...((data ?? []) as Application[]));
    if (!data || data.length < page) break;
  }
  return out;
}

export async function updateApplication(id: string, patch: Partial<Pick<Application, 'status' | 'reason_code' | 'remarks' | 'company_decision'>>) {
  const { error } = await supabase.from('applications').update(patch).eq('id', id);
  if (error) fail(error);
}

export async function updateApplicant(id: string, patch: Record<string, unknown>) {
  const { error } = await supabase.from('applicants').update(patch).eq('id', id);
  if (error) fail(error);
}

export async function loadStatusLog(applicationId: string): Promise<StatusLogEntry[]> {
  const { data, error } = await supabase
    .from('status_log')
    .select('*')
    .eq('application_id', applicationId)
    .order('changed_at', { ascending: false });
  if (error) fail(error);
  return data as StatusLogEntry[];
}

export async function resumeSignedUrl(path: string) {
  const { data, error } = await supabase.storage.from('resumes').createSignedUrl(path, 600);
  if (error) fail(error);
  return data.signedUrl;
}

export async function createInterviews(rows: Omit<Interview, 'id' | 'interview_code' | 'checked_in_at' | 'done' | 'no_show' | 'cancelled'>[]) {
  if (!rows.length) return;
  const { error } = await supabase.from('interviews').insert(rows);
  if (error) fail(error);
}

export async function updateInterview(id: string, patch: Partial<Interview>) {
  const { error } = await supabase.from('interviews').update(patch).eq('id', id);
  if (error) fail(error);
}

export async function cancelInterviews(ids: string[]) {
  if (!ids.length) return;
  const { error } = await supabase.from('interviews').update({ cancelled: true }).in('id', ids);
  if (error) fail(error);
}

export async function loadVenues(): Promise<Venue[]> {
  const { data, error } = await supabase.from('venues').select('*').order('sort_order').order('name');
  if (error) fail(error);
  return data as Venue[];
}

export async function addVenue(name: string, note: string) {
  const { error } = await supabase.from('venues').insert({ name: name.trim(), note: note.trim() || null });
  if (error) fail(error.message.includes('duplicate') ? { message: 'That venue already exists.' } : error);
}

export async function deleteVenue(id: string) {
  const { error } = await supabase.from('venues').delete().eq('id', id);
  if (error) fail(error);
}

export async function loadAttendance(): Promise<Attendance[]> {
  const { data, error } = await supabase.from('attendance').select('*').order('seq');
  if (error) fail(error);
  return data as Attendance[];
}

export async function markAttendance(applicantId: string, day: string, by: string) {
  const { data, error } = await supabase
    .from('attendance')
    .insert({ applicant_id: applicantId, day, marked_by: by })
    .select()
    .single();
  if (error) fail(error);
  return data as Attendance;
}

export async function unmarkAttendance(id: string) {
  const { error } = await supabase.from('attendance').delete().eq('id', id);
  if (error) fail(error);
}

export async function saveSession(session: Partial<DriveSession> & { company_code: string; day: string }) {
  const q = session.id
    ? supabase.from('drive_sessions').update(session).eq('id', session.id)
    : supabase.from('drive_sessions').insert(session);
  const { error } = await q;
  if (error) fail(error);
}

export async function deleteSession(id: string) {
  const { error } = await supabase.from('drive_sessions').delete().eq('id', id);
  if (error) fail(error);
}

export async function saveRole(code: string, patch: Partial<Role>) {
  const { error } = await supabase.from('roles').update(patch).eq('code', code);
  if (error) fail(error);
}

export async function saveSettings(patch: Partial<DriveSettings>) {
  const { error } = await supabase.from('drive_settings').update(patch).eq('id', true);
  if (error) fail(error);
}

export async function loadCompanyPrivate(): Promise<CompanyPrivate[]> {
  const { data, error } = await supabase.from('company_private').select('*').order('company_code');
  if (error) fail(error);
  return data as CompanyPrivate[];
}

export async function saveCompanyPrivate(code: string, patch: Partial<CompanyPrivate>) {
  const { error } = await supabase.from('company_private').update(patch).eq('company_code', code);
  if (error) fail(error);
}

export async function rotateCompanyToken(code: string) {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  const token = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  await saveCompanyPrivate(code, { access_token: token });
  return token;
}

export async function loadOrganizers(): Promise<{ email: string; name: string | null; added_at: string }[]> {
  const { data, error } = await supabase.from('organizers').select('*').order('added_at');
  if (error) fail(error);
  return data as { email: string; name: string | null; added_at: string }[];
}

export async function addOrganizer(email: string, name: string) {
  const { error } = await supabase.from('organizers').insert({ email: email.trim().toLowerCase(), name: name.trim() || null });
  if (error) fail(error);
}

export async function removeOrganizer(email: string) {
  const { error } = await supabase.from('organizers').delete().eq('email', email);
  if (error) fail(error);
}
