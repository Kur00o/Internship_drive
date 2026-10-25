-- ========================================================
-- Supabase SQL Schema for Campus Internship Portal
-- Run this in your Supabase Dashboard -> SQL Editor
-- ========================================================

-- 1. Table: user_credentials (User credentials for student & admin)
CREATE TABLE IF NOT EXISTS public.user_credentials (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  identifier TEXT UNIQUE NOT NULL,       -- roll number or email or 'admin'
  roll_number TEXT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student',  -- 'student' or 'admin'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed secret admin into user_credentials
INSERT INTO public.user_credentials (id, identifier, roll_number, name, email, password, role)
VALUES (
  'admin-root-01',
  'admin',
  'ADMIN',
  'Placement Administrator',
  'placement-cell@college.edu',
  'admin@college2026',
  'admin'
)
ON CONFLICT (identifier) DO NOTHING;

-- 2. Table: job_data (Internship job postings)
CREATE TABLE IF NOT EXISTS public.job_data (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  department_or_company TEXT NOT NULL,
  description TEXT NOT NULL,
  skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  stipend TEXT NOT NULL,
  duration TEXT NOT NULL,
  work_mode TEXT NOT NULL,               -- 'On-Campus', 'Remote', 'Hybrid'
  domain TEXT NOT NULL,
  eligibility TEXT NOT NULL,
  posted_date DATE DEFAULT CURRENT_DATE
);

-- 3. Table: user_data (Student profiles, applications, and resume file links)
CREATE TABLE IF NOT EXISTS public.user_data (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  roll_number TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  college_name TEXT NOT NULL,
  degree TEXT NOT NULL,
  department TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  graduation_year TEXT NOT NULL,
  cgpa TEXT,
  skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  projects TEXT,
  experience TEXT,
  preferred_domain TEXT,
  availability TEXT,
  github TEXT,
  linkedin TEXT,
  portfolio TEXT,
  resume_filename TEXT,
  resume_url TEXT,
  internship_id TEXT,
  internship_title TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security (RLS) with full read/write policies for the portal
ALTER TABLE public.user_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access user_credentials" ON public.user_credentials;
CREATE POLICY "Public access user_credentials" ON public.user_credentials FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access job_data" ON public.job_data;
CREATE POLICY "Public access job_data" ON public.job_data FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access user_data" ON public.user_data;
CREATE POLICY "Public access user_data" ON public.user_data FOR ALL USING (true) WITH CHECK (true);

-- 4. Storage Bucket: resumes (for uploaded PDF and DOCX files)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('resumes', 'resumes', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Allow public resume uploads" ON storage.objects;
CREATE POLICY "Allow public resume uploads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'resumes');

DROP POLICY IF EXISTS "Allow public resume downloads" ON storage.objects;
CREATE POLICY "Allow public resume downloads" ON storage.objects FOR SELECT USING (bucket_id = 'resumes');
