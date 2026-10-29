import { windowFor, type Rules, type Taken, type Window } from '../../lib/allot';
import { isoToIstDate } from '../../lib/format';
import type { Application, DriveSession, DriveSettings, Role } from '../../lib/types';

export const DEFAULT_RULES: Rules = { slotMin: 30, bufferMin: 20, dayStart: '09:30', dayEnd: '17:00', lunchStart: '13:00', lunchEnd: '14:00' };

export function rulesFrom(s?: DriveSettings): Rules {
  if (!s || s.slot_minutes == null) return DEFAULT_RULES;
  return {
    slotMin: s.slot_minutes,
    bufferMin: s.buffer_minutes,
    dayStart: s.day_start.slice(0, 5),
    dayEnd: s.day_end.slice(0, 5),
    lunchStart: s.lunch_start?.slice(0, 5) ?? null,
    lunchEnd: s.lunch_end?.slice(0, 5) ?? null,
  };
}

export function windowsFor(day: string, rules: Rules, companyCodes: string[], sessions: DriveSession[]) {
  const m = new Map<string, Window>();
  for (const c of companyCodes) m.set(c, windowFor(day, rules, sessions.filter((s) => s.company_code === c && s.day === day)));
  return m;
}

export function venueOf(company: string, day: string, sessions: DriveSession[]) {
  return sessions.find((s) => s.company_code === company && s.day === day && s.venue)?.venue ?? null;
}

/** Live (not cancelled) interviews on a day, with their company. */
export function liveInterviews(apps: Application[], roleBy: Map<string, Role>, day: string) {
  return apps.flatMap((a) =>
    a.interviews
      .filter((i) => !i.cancelled && isoToIstDate(i.starts_at) === day)
      .map((i) => ({ iv: i, app: a, company: roleBy.get(a.role_code)?.company_code ?? '' })),
  );
}

export function takenFrom(live: ReturnType<typeof liveInterviews>): Taken[] {
  return live.map((l) => ({ company: l.company, start: new Date(l.iv.starts_at).getTime(), panel: l.iv.panel }));
}

/** Student typed "stu-12", "12" or a PRN. */
export function findStudent(apps: Application[], raw: string) {
  const q = raw.trim().toUpperCase();
  if (!q) return null;
  const code = /^\d{1,4}$/.test(q) ? `STU-${q.padStart(4, '0')}` : q;
  return apps.find((a) => a.applicant.student_code === code || a.applicant.prn.toUpperCase() === q)?.applicant ?? null;
}

const OUT = new Set(['Duplicate', 'Not Eligible', 'Rejected (Company Screen)', 'Assignment Not Submitted', 'Not Selected', 'Selected', 'Offer Accepted', 'Offer Declined', 'Withdrawn', 'No-show', 'Interviewed']);

/** One wanted slot per company: the student's highest-ranked live application there. */
export function wantsFor(apps: Application[], roleBy: Map<string, Role>, applicantId: string) {
  const best = new Map<string, Application>();
  for (const a of apps) {
    if (a.applicant_id !== applicantId || OUT.has(a.status) || a.company_decision === 'Rejected') continue;
    if (a.interviews.some((i) => !i.cancelled)) continue;
    const c = roleBy.get(a.role_code)?.company_code;
    if (!c) continue;
    const cur = best.get(c);
    if (!cur || a.preference < cur.preference) best.set(c, a);
  }
  return [...best.entries()].sort((x, y) => x[1].preference - y[1].preference).map(([company, a]) => ({ company, appId: a.id }));
}
