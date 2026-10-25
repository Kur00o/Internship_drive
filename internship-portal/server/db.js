import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure database directory exists
const dbDir = path.join(__dirname, '..', 'database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'college_portal.sqlite');
console.log(`[SQL Database] Initializing SQLite database at: ${dbPath}`);

export const db = new DatabaseSync(dbPath);

// Enable WAL mode for better concurrency and foreign keys
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

/**
 * Initialize the three required SQL tables:
 * 1. user_credentials (user credentials)
 * 2. job_data (internship opportunities)
 * 3. user_data (student candidate profiles and submitted applications)
 */
export function initDatabase() {
  // Table 1: user_credentials
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_credentials (
      id TEXT PRIMARY KEY,
      identifier TEXT UNIQUE NOT NULL,
      roll_number TEXT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student',
      created_at TEXT NOT NULL
    );
  `);

  // Table 2: job_data
  db.exec(`
    CREATE TABLE IF NOT EXISTS job_data (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      department_or_company TEXT NOT NULL,
      description TEXT NOT NULL,
      skills TEXT NOT NULL,
      stipend TEXT NOT NULL,
      duration TEXT NOT NULL,
      work_mode TEXT NOT NULL,
      domain TEXT NOT NULL,
      eligibility TEXT NOT NULL,
      posted_date TEXT NOT NULL
    );
  `);

  // Table 3: user_data
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_data (
      id TEXT PRIMARY KEY,
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
      skills TEXT NOT NULL,
      projects TEXT,
      experience TEXT,
      preferred_domain TEXT,
      availability TEXT,
      github TEXT,
      linkedin TEXT,
      portfolio TEXT,
      resume_filename TEXT,
      resume_filepath TEXT,
      internship_id TEXT,
      internship_title TEXT,
      submitted_at TEXT NOT NULL
    );
  `);

  // Seed secret administrator account if not already present
  const adminCheck = db.prepare('SELECT id FROM user_credentials WHERE identifier = ?').get('admin');
  if (!adminCheck) {
    db.prepare(`
      INSERT INTO user_credentials (id, identifier, roll_number, name, email, password, role, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'admin-root-01',
      'admin',
      'ADMIN',
      'Placement Administrator',
      'placement-cell@college.edu',
      'admin@college2026',
      'admin',
      new Date().toISOString()
    );
    console.log('[SQL Database] Seeded secret admin credentials into user_credentials table.');
  }

  console.log('[SQL Database] Verified tables: user_credentials, job_data, user_data');
}

// ========================
// 1. User Credentials Queries
// ========================
export function findUserByIdentifier(identifier) {
  const clean = identifier.trim().toLowerCase();
  return db.prepare(`
    SELECT * FROM user_credentials
    WHERE LOWER(identifier) = ? OR LOWER(roll_number) = ? OR LOWER(email) = ?
  `).get(clean, clean, clean);
}

export function createUserCredential({ id, rollNumber, name, email, password, role = 'student' }) {
  const cleanRoll = rollNumber ? rollNumber.trim().toUpperCase() : email.trim().toLowerCase();
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO user_credentials (id, identifier, roll_number, name, email, password, role, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, cleanRoll, cleanRoll, cleanName, cleanEmail, password, role, now);

  return findUserByIdentifier(cleanRoll);
}

// ========================
// 2. Job Data Queries
// ========================
export function getAllJobs() {
  const rows = db.prepare('SELECT * FROM job_data ORDER BY posted_date DESC, id DESC').all();
  return rows.map((row) => ({
    ...row,
    skills: JSON.parse(row.skills || '[]'),
    departmentOrCompany: row.department_or_company,
    workMode: row.work_mode,
    postedDate: row.posted_date,
  }));
}

export function createJob({
  id,
  title,
  departmentOrCompany,
  description,
  skills,
  stipend,
  duration,
  workMode,
  domain,
  eligibility,
  postedDate,
}) {
  const skillsJson = JSON.stringify(Array.isArray(skills) ? skills : []);
  db.prepare(`
    INSERT INTO job_data (id, title, department_or_company, description, skills, stipend, duration, work_mode, domain, eligibility, posted_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    title.trim(),
    departmentOrCompany.trim(),
    description.trim(),
    skillsJson,
    stipend.trim(),
    duration.trim(),
    workMode,
    domain,
    eligibility.trim(),
    postedDate || new Date().toISOString().split('T')[0]
  );

  return {
    id,
    title,
    departmentOrCompany,
    description,
    skills: Array.isArray(skills) ? skills : [],
    stipend,
    duration,
    workMode,
    domain,
    eligibility,
    postedDate: postedDate || new Date().toISOString().split('T')[0],
  };
}

export function deleteJob(id) {
  return db.prepare('DELETE FROM job_data WHERE id = ?').run(id);
}

// ========================
// 3. User Data Queries (Applications & Profiles)
// ========================
export function getAllUserData() {
  const rows = db.prepare('SELECT * FROM user_data ORDER BY submitted_at DESC, id DESC').all();
  return rows.map((row) => ({
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
      skills: JSON.parse(row.skills || '[]'),
      projects: row.projects,
      experience: row.experience,
      preferredDomain: row.preferred_domain,
      availability: row.availability,
      github: row.github,
      linkedin: row.linkedin,
      portfolio: row.portfolio,
      resumeFileName: row.resume_filename,
      resumeFileUrl: row.resume_filename ? `/api/resumes/${row.resume_filename}` : undefined,
    },
    internshipId: row.internship_id,
    internshipTitle: row.internship_title,
    appliedDate: row.submitted_at.split('T')[0],
  }));
}

export function createUserData({
  id,
  candidate,
  internshipId,
  internshipTitle,
  resumeFileName,
  resumeFilePath,
}) {
  const skillsJson = JSON.stringify(Array.isArray(candidate.skills) ? candidate.skills : []);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO user_data (
      id, roll_number, name, email, phone, college_name, degree, department,
      academic_year, graduation_year, cgpa, skills, projects, experience,
      preferred_domain, availability, github, linkedin, portfolio,
      resume_filename, resume_filepath, internship_id, internship_title, submitted_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    candidate.rollNumber.trim().toUpperCase(),
    candidate.name.trim(),
    candidate.email.trim(),
    candidate.phone.trim(),
    candidate.collegeName.trim(),
    candidate.degree.trim(),
    candidate.department.trim(),
    candidate.academicYear,
    candidate.graduationYear,
    candidate.cgpa || '',
    skillsJson,
    candidate.projects || '',
    candidate.experience || '',
    candidate.preferredDomain || '',
    candidate.availability || '',
    candidate.github || '',
    candidate.linkedin || '',
    candidate.portfolio || '',
    resumeFileName || '',
    resumeFilePath || '',
    internshipId || '',
    internshipTitle || '',
    now
  );

  return {
    id,
    candidate: {
      ...candidate,
      resumeFileName,
      resumeFileUrl: resumeFileName ? `/api/resumes/${resumeFileName}` : undefined,
    },
    internshipId,
    internshipTitle,
    appliedDate: now.split('T')[0],
  };
}
