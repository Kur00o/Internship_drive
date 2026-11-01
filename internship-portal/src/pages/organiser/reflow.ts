// Re-lays booked slots after a start time changes, and links a student's extra
// roles at a company to their slot there. Students keep their arrival order;
// anyone checked in, done or marked no-show stays where they are.

import { allotStudent, EXTEND_MS, type Placed, type Rules } from '../../lib/allot';
import { createInterviews, loadApplications, loadAttendance, loadPublicData, moveInterviews, updateInterview } from '../../lib/api';
import type { Application, Attendance, DriveSession, Interview, Role } from '../../lib/types';
import { attendsOn, linkedTo, linksFor, liveInterviews, primaries, rulesFrom, takenFrom, venueOf, wantsFor, windowsFor } from './slotkit';

const REPORT_MS = 30 * 60000;
const iso = (ms: number) => new Date(ms).toISOString();
const length = (iv: Interview) => new Date(iv.ends_at).getTime() - new Date(iv.starts_at).getTime();

type Link = Pick<Placed, 'appId' | 'start' | 'end'> & Pick<Interview, 'room' | 'mode' | 'meet_url'>;

export function planDay(args: {
  day: string;
  apps: Application[];
  attendance: Attendance[];
  sessions: DriveSession[];
  roleBy: Map<string, Role>;
  rules: Rules;
  company?: string;
  student?: string; // only this student's new and linked slots; everyone else stays put
  notBefore: number;
}) {
  const { day, apps, sessions, roleBy, rules, company, student, notBefore } = args;
  const all = liveInterviews(apps, roleBy, day);
  const live = primaries(all);
  const open = live.filter(
    (l) =>
      (!company || l.company === company) &&
      (!student || (l.app.applicant_id === student && linksFor(apps, roleBy, student).has(l.company))) &&
      !l.iv.checked_in_at &&
      !l.iv.done &&
      !l.iv.no_show,
  );
  const fixed = live.filter((l) => !open.includes(l));
  const taken = takenFrom(fixed);
  const seq = new Map(args.attendance.filter((a) => a.day === day).map((a) => [a.applicant_id, a.seq]));

  const earliest = (id: string) => Math.min(...open.filter((l) => l.app.applicant_id === id).map((l) => new Date(l.iv.starts_at).getTime()));
  const students = student
    ? [student]
    : [...new Set([...seq.keys(), ...open.map((l) => l.app.applicant_id)])].sort((a, b) => (seq.get(a) ?? Infinity) - (seq.get(b) ?? Infinity) || earliest(a) - earliest(b));

  const moves: { id: string; start: number; end: number; panel: string; linked: string[] }[] = [];
  const adds: Placed[] = [];
  const links: Link[] = [];
  const unplaced: string[] = [];
  const away: string[] = [];
  for (const id of students) {
    const mine = open.filter((l) => l.app.applicant_id === id);
    const pending = linksFor(apps, roleBy, id);
    // a present student who is missing a company gets that slot now
    const wanted = student || seq.has(id) ? wantsFor(apps, roleBy, id).filter((w) => !company || w.company === company) : [];
    away.push(...wanted.filter((w) => !attendsOn(w.company, day, sessions)).map((w) => w.company));
    const wants = [
      ...mine.map((l) => {
        const also = pending.get(l.company) ?? [];
        return { company: l.company, appId: l.app.id, also, ms: length(l.iv) + also.length * EXTEND_MS, from: student ? new Date(l.iv.starts_at).getTime() : 0 };
      }),
      ...wanted.filter((w) => attendsOn(w.company, day, sessions)),
    ];
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
      taken.push({ company: p.company, start: p.start, end: p.end, panel: p.panel });
      const was = mine.find((l) => l.app.id === p.appId);
      if (!was) adds.push(p);
      else if (new Date(was.iv.starts_at).getTime() !== p.start || new Date(was.iv.ends_at).getTime() !== p.end || was.iv.panel !== p.panel) {
        moves.push({ id: was.iv.id, start: p.start, end: p.end, panel: p.panel, linked: linkedTo(all, was).map((l) => l.iv.id) });
      }
      const room = was ? was.iv.room : venueOf(p.company, day, sessions);
      for (const appId of p.also ?? []) links.push({ appId, start: p.start, end: p.end, room, mode: was?.iv.mode ?? 'Campus', meet_url: was?.iv.meet_url ?? null });
    }
    for (const w of result.unplaced) {
      const was = mine.find((l) => l.app.id === w.appId);
      if (was) taken.push(...takenFrom([was])); // no room in the new grid: it stays put
      unplaced.push(w.company);
    }
  }
  return { moves, adds, links, unplaced, away: [...new Set(away)] };
}

export async function applyPlan(plan: ReturnType<typeof planDay>, day: string, sessions: DriveSession[]) {
  const when = (start: number, end: number) => ({ starts_at: iso(start), ends_at: iso(end), reporting_at: iso(start - REPORT_MS) });
  await moveInterviews(plan.moves.map((m) => ({ id: m.id, ...when(m.start, m.end), panel: m.panel })));
  await Promise.all(plan.moves.flatMap((m) => m.linked.map((id) => updateInterview(id, when(m.start, m.end)))));
  await createInterviews([
    ...plan.adds.map((p) => ({
      application_id: p.appId,
      ...when(p.start, p.end),
      panel: p.panel,
      mode: 'Campus' as const,
      room: venueOf(p.company, day, sessions),
      meet_url: null,
    })),
    ...plan.links.map((l) => ({ application_id: l.appId, ...when(l.start, l.end), panel: null, mode: l.mode, room: l.room, meet_url: l.meet_url })),
  ]);
}

/** Applies a new start time to booked slots on every drive day, for one company or all. */
export async function reflowSlots(company?: string) {
  const [pub, apps, attendance] = await Promise.all([loadPublicData(true), loadApplications(), loadAttendance()]);
  const roleBy = new Map(pub.roles.map((r) => [r.code, r]));
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const total = { moved: 0, added: 0, linked: 0, stuck: 0 };
  for (const day of pub.settings.drive_days) {
    const plan = planDay({ day, apps, attendance, sessions: pub.sessions, roleBy, rules: rulesFrom(pub.settings), company, notBefore: day === today ? Date.now() : 0 });
    await applyPlan(plan, day, pub.sessions);
    total.moved += plan.moves.length;
    total.added += plan.adds.length;
    total.linked += plan.links.length;
    total.stuck += plan.unplaced.length;
  }
  return total;
}

export function reflowSummary({ moved, added, linked, stuck }: { moved: number; added: number; linked: number; stuck: number }) {
  return [
    `${moved} slot${moved === 1 ? '' : 's'} moved`,
    added ? `${added} missing slot${added === 1 ? '' : 's'} added` : '',
    linked ? `${linked} role${linked === 1 ? '' : 's'} linked to an existing slot` : '',
    stuck ? `${stuck} did not fit` : '',
  ].filter(Boolean).join(', ') + '.';
}

/** Cancels one role's interview. A shared slot stays for the other roles, 15 minutes shorter. */
export async function cancelRole(apps: Application[], roleBy: Map<string, Role>, iv: Interview) {
  const all = liveInterviews(apps, roleBy, new Date(iv.starts_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
  const row = all.find((l) => l.iv.id === iv.id);
  const others = row ? linkedTo(all, row) : [];
  await updateInterview(iv.id, { cancelled: true });
  const ends_at = iso(new Date(iv.ends_at).getTime() - EXTEND_MS);
  await Promise.all(others.map((l, n) => updateInterview(l.iv.id, { ends_at, ...(n === 0 && iv.panel ? { panel: iv.panel } : {}) })));
}
