import type { Status } from './types';

const TZ = 'Asia/Kolkata';

export function formatDay(isoDate: string, opts: Intl.DateTimeFormatOptions = {}) {
  // isoDate is YYYY-MM-DD; anchor it at IST noon so it never shifts a day.
  const d = new Date(`${isoDate}T12:00:00+05:30`);
  return d.toLocaleDateString('en-IN', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short', ...opts });
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    timeZone: TZ,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatClock(hhmm: string | null) {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(Date.UTC(2026, 0, 1, h, m));
  return d.toLocaleTimeString('en-IN', { timeZone: 'UTC', hour: 'numeric', minute: '2-digit' });
}

/** Build an ISO timestamp from an IST date (YYYY-MM-DD) and time (HH:MM). */
export function istToIso(date: string, time: string) {
  return new Date(`${date}T${time}:00+05:30`).toISOString();
}

/** IST HH:MM for an ISO timestamp. */
export function isoToIstClock(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });
}

export function isoToIstDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ });
}

/** What a student sees for an internal status (Operations Plan §5.4). */
export function studentStatus(status: Status): { label: string; note: string; tone: 'neutral' | 'good' | 'bad' | 'wait' } {
  switch (status) {
    case 'Applied':
      return { label: 'Received', note: 'The team is checking eligibility.', tone: 'wait' };
    case 'Duplicate':
      return { label: 'Duplicate', note: 'A newer submission replaced this one.', tone: 'neutral' };
    case 'Not Eligible':
      return { label: 'Not eligible', note: 'This role’s eligibility does not match your profile.', tone: 'bad' };
    case 'Eligible':
      return { label: 'Shared with the company', note: 'Your application passed screening and is with the company.', tone: 'wait' };
    case 'Rejected (Company Screen)':
      return { label: 'Not shortlisted', note: 'The company did not shortlist this application.', tone: 'bad' };
    case 'Assignment Sent':
      return { label: 'Task sent', note: 'Check your email and WhatsApp for the task and deadline.', tone: 'wait' };
    case 'Assignment Submitted':
      return { label: 'Task received', note: 'Your task is with the company.', tone: 'wait' };
    case 'Assignment Not Submitted':
      return { label: 'Task missed', note: 'The task deadline passed without a submission.', tone: 'bad' };
    case 'Interview Scheduled':
      return { label: 'Interview scheduled', note: 'Report 30 minutes early with your college ID and two printed resumes.', tone: 'good' };
    case 'Interviewed':
      return { label: 'Interviewed', note: 'The company is deciding. Results come after they confirm.', tone: 'wait' };
    case 'No-show':
      return { label: 'Missed interview', note: 'Message the team on WhatsApp if this is wrong.', tone: 'bad' };
    case 'Selected':
      return { label: 'Selected', note: 'Congratulations. Accept or decline within 48 hours.', tone: 'good' };
    case 'Waitlisted':
      return { label: 'Waitlisted', note: 'The company may make an offer later.', tone: 'wait' };
    case 'Not Selected':
      return { label: 'Not selected', note: 'The company did not select you this time.', tone: 'bad' };
    case 'Offer Accepted':
      return { label: 'Offer accepted', note: 'Your other applications in this drive are withdrawn.', tone: 'good' };
    case 'Offer Declined':
      return { label: 'Offer declined', note: '', tone: 'neutral' };
    case 'Withdrawn':
      return { label: 'Withdrawn', note: '', tone: 'neutral' };
  }
}

export function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

export function toCsv(rows: (string | number | null | undefined)[][]) {
  return rows
    .map((r) =>
      r
        .map((v) => {
          const s = v == null ? '' : String(v);
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(','),
    )
    .join('\n');
}

export function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  const blob = new Blob(['﻿' + toCsv(rows)], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
