import { driveDayOf, windowFor, type Rules, type Taken, type Window } from '../../lib/allot';
import type { Application, DriveSession, Role } from '../../lib/types';

export { DEFAULT_RULES, rulesFrom } from '../../lib/allot';

export function windowsFor(day: string, rules: Rules, companyCodes: string[], sessions: DriveSession[]) {
  const m = new Map<string, Window>();
  for (const c of companyCodes) m.set(c, windowFor(day, rules, sessions.filter((s) => s.company_code === c && s.day === day)));
  return m;
}

/** False when a company is marked not coming that day, or has sessions only on other days. No sessions at all means the default day window. */
export function attendsOn(company: string, day: string, sessions: DriveSession[]) {
  const own = sessions.filter((s) => s.company_code === company);
  if (isAway(company, day, sessions)) return false;
  return !own.length || own.some((s) => s.day === day);
}

export function isAway(company: string, day: string, sessions: DriveSession[]) {
  return sessions.some((s) => s.company_code === company && s.day === day && s.away);
}

export function venueOf(company: string, day: string, sessions: DriveSession[]) {
  return sessions.find((s) => s.company_code === company && s.day === day && s.venue)?.venue ?? null;
}

/** Live (not cancelled) interviews on a drive day, with their company. Pass every drive day so a late slot lands on the right one. */
export function liveInterviews(apps: Application[], roleBy: Map<string, Role>, day: string, days: string[] = [day]) {
  return apps.flatMap((a) =>
    a.interviews
      .filter((i) => !i.cancelled && driveDayOf(i.starts_at, days) === day)
      .map((i) => ({ iv: i, app: a, company: roleBy.get(a.role_code)?.company_code ?? '' })),
  );
}

export function takenFrom(live: ReturnType<typeof liveInterviews>): Taken[] {
  return live.map((l) => ({ company: l.company, start: new Date(l.iv.starts_at).getTime(), end: new Date(l.iv.ends_at).getTime(), panel: l.iv.panel }));
}

type Live = ReturnType<typeof liveInterviews>[number];
const slotKey = (l: Live) => `${l.app.applicant_id}|${l.company}|${l.iv.starts_at}`;

/**
 * A student's other roles at a company share one slot: each has its own
 * interview row at the same time, and only the lead row holds the panel.
 * This keeps just the lead row of each slot.
 */
export function primaries(live: Live[]) {
  const lead = new Map<string, Live>();
  for (const l of live) {
    const cur = lead.get(slotKey(l));
    if (!cur || (!cur.iv.panel && l.iv.panel)) lead.set(slotKey(l), l);
  }
  return live.filter((l) => lead.get(slotKey(l)) === l);
}

/** The other rows sharing this slot. */
export function linkedTo(live: Live[], lead: Live) {
  return live.filter((l) => slotKey(l) === slotKey(lead) && l.iv.id !== lead.iv.id);
}

/** Student typed "stu-12", "12" or a PRN. */
export function findStudent(apps: Application[], raw: string) {
  const q = raw.trim().toUpperCase();
  if (!q) return null;
  const code = /^\d{1,4}$/.test(q) ? `STU-${q.padStart(4, '0')}` : q;
  return apps.find((a) => a.applicant.student_code === code || a.applicant.prn.toUpperCase() === q)?.applicant ?? null;
}

const OUT = new Set(['Duplicate', 'Not Eligible', 'Rejected (Company Screen)', 'Assignment Not Submitted', 'Not Selected', 'Selected', 'Offer Accepted', 'Offer Declined', 'Withdrawn', 'No-show', 'Interviewed']);

/** A student's live applications with no slot yet, by company, best preference first. */
function waiting(apps: Application[], roleBy: Map<string, Role>, applicantId: string) {
  const mine = apps.filter((a) => a.applicant_id === applicantId);
  const booked = new Set(mine.filter((a) => a.interviews.some((i) => !i.cancelled)).map((a) => roleBy.get(a.role_code)?.company_code));
  const byCompany = new Map<string, Application[]>();
  for (const a of [...mine].sort((x, y) => x.preference - y.preference)) {
    const c = roleBy.get(a.role_code)?.company_code;
    if (!c || OUT.has(a.status) || a.company_decision === 'Rejected' || a.interviews.some((i) => !i.cancelled)) continue;
    byCompany.set(c, [...(byCompany.get(c) ?? []), a]);
  }
  return { byCompany, booked };
}

/** One wanted slot per company: the student's highest-ranked live application there, with any others linked to it. */
export function wantsFor(apps: Application[], roleBy: Map<string, Role>, applicantId: string) {
  const { byCompany, booked } = waiting(apps, roleBy, applicantId);
  return [...byCompany.entries()]
    .filter(([c]) => !booked.has(c))
    .sort((x, y) => x[1][0].preference - y[1][0].preference)
    .map(([company, [lead, ...rest]]) => ({ company, appId: lead.id, also: rest.map((a) => a.id) }));
}

/** Roles waiting at a company where the student already has a slot: these link to that slot. */
export function linksFor(apps: Application[], roleBy: Map<string, Role>, applicantId: string) {
  const { byCompany, booked } = waiting(apps, roleBy, applicantId);
  return new Map([...byCompany.entries()].filter(([c]) => booked.has(c)).map(([c, list]) => [c, list.map((a) => a.id)]));
}
