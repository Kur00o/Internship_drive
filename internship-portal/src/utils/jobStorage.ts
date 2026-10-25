import type { Internship, SubmittedApplication } from '../types';
import { initialInternships } from '../data/internships';

const INTERNSHIPS_KEY = 'college_portal_internships';
const APPLICATIONS_KEY = 'college_portal_applications';

export function getStoredInternships(): Internship[] {
  try {
    const raw = localStorage.getItem(INTERNSHIPS_KEY);
    if (!raw) {
      return initialInternships;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return initialInternships;
  }
}

export function saveStoredInternships(internships: Internship[]): void {
  try {
    localStorage.setItem(INTERNSHIPS_KEY, JSON.stringify(internships));
  } catch (err) {
    console.error('Failed to save internships to storage:', err);
  }
}

export function addStoredInternship(
  data: Omit<Internship, 'id' | 'postedDate'>
): Internship {
  const current = getStoredInternships();
  const newInternship: Internship = {
    ...data,
    id: 'intern-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
    postedDate: new Date().toISOString().split('T')[0],
  };
  const updated = [newInternship, ...current];
  saveStoredInternships(updated);
  return newInternship;
}

export function deleteStoredInternship(id: string): void {
  const current = getStoredInternships();
  const updated = current.filter((job) => job.id !== id);
  saveStoredInternships(updated);
}

export function getStoredApplications(): SubmittedApplication[] {
  try {
    const raw = localStorage.getItem(APPLICATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredApplication(
  app: Omit<SubmittedApplication, 'id' | 'appliedDate'>
): SubmittedApplication {
  const current = getStoredApplications();
  const newApp: SubmittedApplication = {
    ...app,
    id: 'app-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
    appliedDate: new Date().toISOString().split('T')[0],
  };
  const updated = [newApp, ...current];
  try {
    localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save application to storage:', err);
  }
  return newApp;
}
