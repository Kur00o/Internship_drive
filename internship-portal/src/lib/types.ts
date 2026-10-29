export const TRACKS = [
  'Tech',
  'Finance',
  'Business & Sales',
  'Human Resources',
  'Psychology',
  'Creative & Media',
] as const;
export type Track = (typeof TRACKS)[number];

export interface DriveSettings {
  drive_name: string;
  chapter_name: string;
  drive_days: string[];
  timings_note: string | null;
  venue: string | null;
  applications_open: boolean;
  applications_close_at: string | null;
  whatsapp_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  announcement: string | null;
  min_duration: string;
  joining: string;
  selection_process: string;
  slot_minutes: number;
  buffer_minutes: number;
  day_start: string;
  day_end: string;
  lunch_start: string | null;
  lunch_end: string | null;
  updated_at?: string;
}

export interface Venue {
  id: string;
  name: string;
  note: string | null;
  sort_order: number;
}

export interface Attendance {
  id: string;
  applicant_id: string;
  day: string;
  seq: number;
  marked_at: string;
  marked_by: string | null;
}

export interface Company {
  code: string;
  name: string;
  short_name: string;
  about: string | null;
  website: string | null;
  office_location: string | null;
  work_mode: string | null;
  jd_folder_url: string | null;
  jd_status: 'published' | 'pending';
  sort_order: number;
}

export interface Role {
  code: string;
  company_code: string;
  title: string;
  track: Track;
  tags: string[];
  programmes: string[];
  summary: string;
  about: string | null;
  responsibilities: string[];
  requirements: string[];
  good_to_have: string[];
  perks: string[];
  eligibility: string;
  openings: number | null;
  stipend: string;
  duration: string;
  work_mode: string;
  location: string;
  joining: string | null;
  needs_portfolio: boolean;
  portfolio_hint: string | null;
  challenge: string | null;
  challenge_materials_url: string | null;
  jd_url: string | null;
  interview_minutes: number;
  is_open: boolean;
  sort_order: number;
}

export interface DriveSession {
  id: string;
  company_code: string;
  day: string;
  starts_at: string | null;
  ends_at: string | null;
  venue: string | null;
  mode: 'On campus' | 'Online' | 'On campus + online';
  panels: number;
  note: string | null;
}

export const STATUSES = [
  'Applied',
  'Duplicate',
  'Not Eligible',
  'Eligible',
  'Rejected (Company Screen)',
  'Assignment Sent',
  'Assignment Submitted',
  'Assignment Not Submitted',
  'Interview Scheduled',
  'Interviewed',
  'No-show',
  'Selected',
  'Waitlisted',
  'Not Selected',
  'Offer Accepted',
  'Offer Declined',
  'Withdrawn',
] as const;
export type Status = (typeof STATUSES)[number];

export const REASON_CODES: Record<string, string> = {
  E1: 'Programme or specialisation not eligible',
  E2: 'Year of study not eligible',
  E3: 'Portfolio / GitHub missing or not accessible',
  E4: 'Resume missing or unreadable',
  E5: 'Cannot meet work mode or duration',
  E6: 'Incomplete or false information',
  E7: 'Other (see remarks)',
};

export const COMPANY_DECISIONS = [
  'Shortlisted',
  'Rejected',
  'Selected',
  'Waitlisted',
  'Not Selected',
  'Next Round',
] as const;
export type CompanyDecision = (typeof COMPANY_DECISIONS)[number];

export interface Applicant {
  id: string;
  student_code: string;
  prn: string;
  full_name: string;
  email: string;
  phone: string;
  school: string;
  programme: string;
  specialisation: string;
  year_of_study: string;
  graduation_year: number;
  cgpa: number | null;
  professional_courses: string[];
  linkedin_url: string | null;
  portfolio_url: string | null;
  resume_path: string;
  resume_name: string | null;
  available_from: string | null;
  office_availability: string | null;
  interview_availability: string[];
  prior_experience: string | null;
  accepted_role_code: string | null;
  notes: string | null;
  created_at: string;
}

export interface Interview {
  id: string;
  interview_code: string;
  application_id: string;
  panel: string | null;
  mode: 'Campus' | 'Online';
  room: string | null;
  meet_url: string | null;
  starts_at: string;
  ends_at: string;
  reporting_at: string | null;
  checked_in_at: string | null;
  done: boolean;
  no_show: boolean;
  cancelled: boolean;
}

export interface Application {
  id: string;
  app_code: string;
  applicant_id: string;
  role_code: string;
  preference: number;
  why_fit: string | null;
  challenge_response: string | null;
  status: Status;
  reason_code: string | null;
  company_decision: CompanyDecision | null;
  company_rating: number | null;
  company_comment: string | null;
  remarks: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  applicant: Applicant;
  interviews: Interview[];
}

export interface StatusLogEntry {
  id: number;
  application_id: string;
  from_status: string | null;
  to_status: string;
  changed_by: string;
  note: string | null;
  changed_at: string;
}

export interface CompanyPrivate {
  company_code: string;
  access_token: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  coordinator: string | null;
  share_unscreened: boolean;
  notes: string | null;
}

export interface PublicData {
  settings: DriveSettings;
  companies: Company[];
  roles: Role[];
  sessions: DriveSession[];
}

export interface RoleChoice {
  code: string;
  challenge?: string;
}

export interface ApplicationPayload {
  full_name: string;
  prn: string;
  email: string;
  phone: string;
  school: string;
  programme: string;
  specialisation: string;
  year_of_study: string;
  graduation_year: string;
  cgpa: string;
  professional_courses: string[];
  portfolio_url: string;
  linkedin_url: string;
  resume_path: string;
  resume_name: string;
  available_from: string;
  office_availability: string;
  interview_availability: string[];
  prior_experience: string;
  why_fit: string;
  consent: boolean;
  roles: RoleChoice[];
}

export interface SubmitResult {
  student_code: string;
  full_name: string;
  applications: { app_code: string; role_code: string; preference: number }[];
}

export interface TrackedInterview {
  interview_code: string;
  starts_at: string;
  ends_at: string;
  reporting_at: string | null;
  mode: 'Campus' | 'Online';
  room: string | null;
  meet_url: string | null;
  panel: string | null;
}

export interface TrackResult {
  student_code: string;
  full_name: string;
  submitted_at: string;
  applications: {
    app_code: string;
    role_code: string;
    role_title: string;
    company: string;
    preference: number;
    status: Status;
    interviews: TrackedInterview[];
  }[];
}

export interface PortalApplication {
  id: string;
  app_code: string;
  role_code: string;
  preference: number;
  status: Status;
  company_decision: CompanyDecision | null;
  company_rating: number | null;
  company_comment: string | null;
  why_fit: string | null;
  challenge_response: string | null;
  student: {
    student_code: string;
    full_name: string;
    school: string;
    programme: string;
    specialisation: string;
    year_of_study: string;
    graduation_year: number;
    cgpa: number | null;
    professional_courses: string[];
    portfolio_url: string | null;
    linkedin_url: string | null;
    available_from: string | null;
    office_availability: string | null;
    interview_availability: string[];
    prior_experience: string | null;
    has_resume: boolean;
    email: string | null;
    phone: string | null;
  };
  interviews: (TrackedInterview & { checked_in_at: string | null; done: boolean; no_show: boolean })[];
}

export interface PortalData {
  company: Company;
  settings: Pick<DriveSettings, 'drive_name' | 'drive_days' | 'venue' | 'timings_note'>;
  roles: { code: string; title: string; openings: number | null; track: Track; interview_minutes: number }[];
  sessions: DriveSession[];
  applications: PortalApplication[];
}
