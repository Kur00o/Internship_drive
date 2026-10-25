import type { Internship, SubmittedApplication, UserSession, CandidateProfile } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// ============================================
// 1. User Credentials Authentication
// ============================================
export const authApi = {
  async login(identifier: string, pass: string): Promise<{ success: boolean; user?: UserSession; error?: string }> {
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = pass;

    // --- Supabase Path ---
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('user_credentials')
          .select('*')
          .or(`identifier.ilike.${cleanId},roll_number.ilike.${cleanId},email.ilike.${cleanId}`)
          .maybeSingle();

        if (error) {
          console.error('[Supabase Auth Error]', error);
          return { success: false, error: 'Database connection error.' };
        }

        if (!data) {
          return {
            success: false,
            error: 'No account found with this Roll Number/Email. Please register first.',
          };
        }

        if (data.password !== cleanPass) {
          return { success: false, error: 'Incorrect password. Please try again.' };
        }

        return {
          success: true,
          user: {
            role: data.role as 'student' | 'admin',
            name: data.name,
            email: data.email,
            rollNumber: data.roll_number,
          },
        };
      } catch (err: any) {
        return { success: false, error: err.message || 'Supabase authentication failed.' };
      }
    }

    // --- Local SQL Server Fallback ---
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password: pass }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Login failed.' };
      }
      return { success: true, user: data.user };
    } catch {
      return { success: false, error: 'Cannot connect to SQL backend server.' };
    }
  },

  async register(
    rollNumber: string,
    name: string,
    email: string,
    pass: string
  ): Promise<{ success: boolean; user?: UserSession; error?: string }> {
    const cleanRoll = rollNumber.trim().toUpperCase();
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    if (cleanRoll.toLowerCase() === 'admin' || cleanEmail === 'admin') {
      return { success: false, error: 'This identifier is reserved.' };
    }

    // --- Supabase Path ---
    if (isSupabaseConfigured) {
      try {
        // Check duplicate
        const { data: existing } = await supabase
          .from('user_credentials')
          .select('id')
          .or(`identifier.ilike.${cleanRoll.toLowerCase()},email.ilike.${cleanEmail}`)
          .maybeSingle();

        if (existing) {
          return {
            success: false,
            error: 'An account with this Roll Number or Email already exists. Please log in.',
          };
        }

        const { data, error } = await supabase
          .from('user_credentials')
          .insert([
            {
              identifier: cleanRoll.toLowerCase(),
              roll_number: cleanRoll,
              name: cleanName,
              email: cleanEmail,
              password: pass,
              role: 'student',
            },
          ])
          .select()
          .single();

        if (error) {
          console.error('[Supabase Register Error]', error);
          return { success: false, error: error.message || 'Failed to save credentials in Supabase.' };
        }

        return {
          success: true,
          user: {
            role: 'student',
            name: data.name,
            email: data.email,
            rollNumber: data.roll_number,
          },
        };
      } catch (err: any) {
        return { success: false, error: err.message || 'Supabase registration failed.' };
      }
    }

    // --- Local SQL Server Fallback ---
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rollNumber, name, email, password: pass }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Registration failed.' };
      }
      return { success: true, user: data.user };
    } catch {
      return { success: false, error: 'Cannot connect to SQL backend server.' };
    }
  },
};

// ============================================
// 2. Job Data Management
// ============================================
export const jobsApi = {
  async getAll(): Promise<Internship[]> {
    // --- Supabase Path ---
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('job_data')
          .select('*')
          .order('posted_date', { ascending: false });

        if (error) {
          console.error('[Supabase Fetch Jobs Error]', error);
          return [];
        }

        return (data || []).map((row: any) => ({
          id: row.id,
          title: row.title,
          departmentOrCompany: row.department_or_company,
          description: row.description,
          skills: Array.isArray(row.skills) ? row.skills : JSON.parse(row.skills || '[]'),
          stipend: row.stipend,
          duration: row.duration,
          workMode: row.work_mode,
          domain: row.domain,
          eligibility: row.eligibility,
          postedDate: row.posted_date,
        }));
      } catch (err) {
        console.error('[Supabase Error]', err);
        return [];
      }
    }

    // --- Local SQL Server Fallback ---
    try {
      const res = await fetch('/api/jobs');
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  async create(job: Omit<Internship, 'id' | 'postedDate'>): Promise<Internship> {
    // --- Supabase Path ---
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('job_data')
        .insert([
          {
            title: job.title.trim(),
            department_or_company: job.departmentOrCompany.trim(),
            description: job.description.trim(),
            skills: job.skills,
            stipend: job.stipend.trim(),
            duration: job.duration.trim(),
            work_mode: job.workMode,
            domain: job.domain,
            eligibility: job.eligibility.trim(),
            posted_date: new Date().toISOString().split('T')[0],
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('[Supabase Create Job Error]', error);
        throw new Error(error.message || 'Failed to insert job into Supabase.');
      }

      return {
        id: data.id,
        title: data.title,
        departmentOrCompany: data.department_or_company,
        description: data.description,
        skills: Array.isArray(data.skills) ? data.skills : JSON.parse(data.skills || '[]'),
        stipend: data.stipend,
        duration: data.duration,
        workMode: data.work_mode,
        domain: data.domain,
        eligibility: data.eligibility,
        postedDate: data.posted_date,
      };
    }

    // --- Local SQL Server Fallback ---
    const res = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(job),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to save job to SQL database.');
    }
    return await res.json();
  },

  async delete(id: string): Promise<boolean> {
    // --- Supabase Path ---
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('job_data').delete().eq('id', id);
      return !error;
    }

    // --- Local SQL Server Fallback ---
    const res = await fetch(`/api/jobs/${id}`, {
      method: 'DELETE',
    });
    return res.ok;
  },
};

// ============================================
// 3. User Data (Applications & Resume Files)
// ============================================
export const applicationsApi = {
  async getAll(): Promise<SubmittedApplication[]> {
    // --- Supabase Path ---
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('user_data')
          .select('*')
          .order('submitted_at', { ascending: false });

        if (error) {
          console.error('[Supabase Fetch Applications Error]', error);
          return [];
        }

        return (data || []).map((row: any) => ({
          id: row.id,
          candidate: {
            rollNumber: row.roll_number,
            name: row.name,
            email: row.email,
            phone: row.phone,
            collegeName: row.college_name,
            degree: row.degree,
            department: row.department,
            academicYear: row.academic_year,
            graduationYear: row.graduation_year,
            cgpa: row.cgpa,
            skills: Array.isArray(row.skills) ? row.skills : JSON.parse(row.skills || '[]'),
            projects: row.projects,
            experience: row.experience,
            preferredDomain: row.preferred_domain,
            availability: row.availability,
            github: row.github,
            linkedin: row.linkedin,
            portfolio: row.portfolio,
            resumeFileName: row.resume_filename,
            resumeFileUrl: row.resume_url,
          },
          internshipId: row.internship_id,
          internshipTitle: row.internship_title,
          appliedDate: (row.submitted_at || new Date().toISOString()).split('T')[0],
        }));
      } catch (err) {
        console.error('[Supabase Applications Error]', err);
        return [];
      }
    }

    // --- Local SQL Server Fallback ---
    try {
      const res = await fetch('/api/applications');
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  async submit(
    candidate: CandidateProfile,
    resumeFile: File | null,
    internshipId?: string,
    internshipTitle?: string
  ): Promise<SubmittedApplication> {
    // --- Supabase Path ---
    if (isSupabaseConfigured) {
      let uploadedResumeUrl: string | undefined = undefined;
      let uploadedResumeFilename: string | undefined = candidate.resumeFileName;

      // 1. Upload physical resume file to Supabase Storage bucket 'resumes'
      if (resumeFile) {
        try {
          const fileExt = resumeFile.name.split('.').pop() || 'pdf';
          const safeName = `${candidate.rollNumber.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('resumes')
            .upload(safeName, resumeFile, {
              cacheControl: '3600',
              upsert: true,
            });

          if (!uploadError) {
            uploadedResumeFilename = resumeFile.name;
            const { data: publicData } = supabase.storage.from('resumes').getPublicUrl(safeName);
            uploadedResumeUrl = publicData?.publicUrl;
          } else {
            console.warn('[Supabase Storage Upload Warning]', uploadError);
          }
        } catch (uploadErr) {
          console.warn('[Supabase Storage Upload Error]', uploadErr);
        }
      }

      // 2. Insert User Data application record into Supabase table 'user_data'
      const { data, error } = await supabase
        .from('user_data')
        .insert([
          {
            roll_number: candidate.rollNumber.trim().toUpperCase(),
            name: candidate.name.trim(),
            email: candidate.email.trim(),
            phone: candidate.phone.trim(),
            college_name: candidate.collegeName.trim(),
            degree: candidate.degree.trim(),
            department: candidate.department.trim(),
            academic_year: candidate.academicYear,
            graduation_year: candidate.graduationYear,
            cgpa: candidate.cgpa || '',
            skills: candidate.skills,
            projects: candidate.projects || '',
            experience: candidate.experience || '',
            preferred_domain: candidate.preferredDomain || '',
            availability: candidate.availability || '',
            github: candidate.github || '',
            linkedin: candidate.linkedin || '',
            portfolio: candidate.portfolio || '',
            resume_filename: uploadedResumeFilename || '',
            resume_url: uploadedResumeUrl || '',
            internship_id: internshipId || '',
            internship_title: internshipTitle || '',
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('[Supabase Application Insert Error]', error);
        throw new Error(error.message || 'Failed to save application in Supabase.');
      }

      return {
        id: data.id,
        candidate: {
          ...candidate,
          resumeFileName: uploadedResumeFilename,
          resumeFileUrl: uploadedResumeUrl,
        },
        internshipId,
        internshipTitle,
        appliedDate: new Date().toISOString().split('T')[0],
      };
    }

    // --- Local SQL Server Fallback ---
    const formData = new FormData();
    const { resumeFile: _omitted, ...cleanCandidate } = candidate;
    formData.append('candidate', JSON.stringify(cleanCandidate));

    if (internshipId) formData.append('internshipId', internshipId);
    if (internshipTitle) formData.append('internshipTitle', internshipTitle);

    if (resumeFile) {
      formData.append('resume', resumeFile, resumeFile.name);
    }

    const res = await fetch('/api/applications', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to save application to SQL database.');
    }

    const data = await res.json();
    return data.application;
  },
};
