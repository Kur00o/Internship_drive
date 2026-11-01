// Re-lays booked slots after a start time changes. Students keep their arrival
// order; anyone checked in, done or marked no-show stays where they are.

import { allotStudent, type Placed, type Rules } from '../../lib/allot';
import { createInterviews, loadApplications, loadAttendance, loadPublicData, moveInterviews } from '../../lib/api';
import type { Application, Attendance, DriveSession, Role } from '../../lib/types';
import { attendsOn, liveInterviews, rulesFrom, takenFrom, venueOf, wantsFor, windowsFor } from './slotkit';

const REPORT_MS = 30 * 60000;

export function planDay(args: {
  day: string;
  apps: Application[];
  attendance: Attendance[];
  sessions: DriveSession[];
  roleBy: Map<string, Role>;
  rules: Rules;
  company?: string;
  notBefore: number;
}) {
  const { day, apps, sessions, roleBy, rules, company, notBefore } = args;
  const live = liveInterviews(apps, roleBy, day);
  const open = live.filter((l) => (!company || l.company === company) && !l.iv.checked_in_at && !l.iv.done && !l.iv.no_show);
  const fixed = live.filter((l) => !open.includes(l));
  const taken = takenFrom(fixed);
  const seq = new Map(args.attendance.filter((a) => a.day === day).map((a) => [a.applicant_id, a.seq]));

  const earliest = (id: string) => Math.min(...open.filter((l) => l.app.applicant_id === id).map((l) => new Date(l.iv.starts_at).getTime()));
  const students = [...new Set([...seq.keys(), ...open.map((l) => l.app.applicant_id)])].sort(
    (a, b) => (seq.get(a) ?? Infinity) - (seq.get(b) ?? Infinity) || earliest(a) - earliest(b),
  );

  const moves: { id: string; start: number; end: number; panel: string }[] = [];
  const adds: Placed[] = [];
  let stuck = 0;
  for (const id of students) {
    const mine = open.filter((l) => l.app.applicant_id === id);
    // a present student who is missing a company gets that slot now
    const missing = seq.has(id) ? wantsFor(apps, roleBy, id).filter((w) => (!company || w.company === company) && attendsOn(w.company, day, sessions)) : [];
    const wants = [...mine.map((l) => ({ company: l.company, appId: l.app.id })), ...missing];
    if (!wants.length) continue;
    const result = allotStudent({
      day,
      rules,
      windows: windowsFor(day, rules, [...new Set(wants.map((w) => w.company))], sessions),
      taken,
      busy: fixed.filter((l) => l.app.applicant_id === id).map((l) => [new Date(l.iv.starts_at).getTime(), new Date(l.iv.ends_at).getTime()]),
      wants,
      notBefore,
    });
    for (const p of result.placed) {
      taken.push({ company: p.company, start: p.start, panel: p.panel });
      const was = mine.find((l) => l.app.id === p.appId);
      if (!was) adds.push(p);
      else if (new Date(was.iv.starts_at).getTime() !== p.start || was.iv.panel !== p.panel) moves.push({ id: was.iv.id, start: p.start, end: p.end, panel: p.panel });
    }
    for (const w of result.unplaced) {
      const was = mine.find((l) => l.app.id === w.appId);
      if (was) taken.push(...takenFrom([was])); // no room in the new grid: it stays put
      stuck++;
    }
  }
  return { moves, adds, stuck };
}

const iso = (ms: number) => new Date(ms).toISOString();

/** Applies a new start time to booked slots on every drive day, for one company or all. */
export async function reflowSlots(company?: string) {
  const [pub, apps, attendance] = await Promise.all([loadPublicData(true), loadApplications(), loadAttendance()]);
  const roleBy = new Map(pub.roles.map((r) => [r.code, r]));
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const total = { moved: 0, added: 0, stuck: 0 };
  for (const day of pub.settings.drive_days) {
    const { moves, adds, stuck } = planDay({
      day,
      apps,
      attendance,
      sessions: pub.sessions,
      roleBy,
      rules: rulesFrom(pub.settings),
      company,
      notBefore: day === today ? Date.now() : 0,
    });
    await moveInterviews(moves.map((m) => ({ id: m.id, starts_at: iso(m.start), ends_at: iso(m.end), reporting_at: iso(m.start - REPORT_MS), panel: m.panel })));
    await createInterviews(
      adds.map((p) => ({
        application_id: p.appId,
        starts_at: iso(p.start),
        ends_at: iso(p.end),
        reporting_at: iso(p.start - REPORT_MS),
        panel: p.panel,
        mode: 'Campus' as const,
        room: venueOf(p.company, day, pub.sessions),
        meet_url: null,
      })),
    );
    total.moved += moves.length;
    total.added += adds.length;
    total.stuck += stuck;
  }
  return total;
}

export function reflowSummary({ moved, added, stuck }: { moved: number; added: number; stuck: number }) {
  return [`${moved} slot${moved === 1 ? '' : 's'} moved`, added ? `${added} missing slot${added === 1 ? '' : 's'} added` : '', stuck ? `${stuck} did not fit` : ''].filter(Boolean).join(', ') + '.';
}
