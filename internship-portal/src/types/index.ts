export interface Internship {
  id: string;
  title: string;
  departmentOrCompany: string; // College department, lab, or partner organization
  description: string;
  skills: string[];
  stipend: string;
  duration: string;
  workMode: 'On-Campus' | 'Remote' | 'Hybrid';
  domain: string;
  eligibility: string;
  postedDate: string;
}

export interface CandidateProfile {
  name: string;
  email: string;
  phone: string;
  rollNumber: string;
  collegeName: string;
  degree: string;
  department: string;
  academicYear: string;
  graduationYear: string;
  cgpa: string;
  skills: string[];
  projects: string;
  experience: string;
  preferredDomain: string;
  availability: string;
  github: string;
  linkedin: string;
  portfolio: string;
  resumeFileName?: string;
  resumeFileUrl?: string;
  resumeFile?: File | null;
}

export interface SubmittedApplication {
  id: string;
  candidate: CandidateProfile;
  internshipId?: string;
  internshipTitle?: string;
  appliedDate: string;
}

export interface UserSession {
  role: 'student' | 'admin';
  name: string;
  email: string;
  rollNumber?: string;
}

export interface JobMatch {
  internship: Internship;
  matchPercentage: number;
  reasons: string[];
}

export const DOMAINS = [
  'Web Development',
  'Mobile Development',
  'Data Science',
  'Machine Learning & AI',
  'UI/UX Design',
  'Cloud & DevOps',
  'Cybersecurity',
  'Internet of Things (IoT)',
  'Embedded Systems',
  'Robotics',
  'Research & Lab Assistant',
  'Database Management',
  'Campus Technical Lead',
] as const;

export const WORK_MODES = ['On-Campus', 'Remote', 'Hybrid'] as const;
