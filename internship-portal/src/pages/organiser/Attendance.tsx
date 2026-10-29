import { useMemo, useRef, useState } from 'react';
import { allotStudent, type Placed } from '../../lib/allot';
import { cancelInterviews, createInterviews, loadApplications, loadAttendance, loadStatusLog, markAttendance, saveSettings, unmarkAttendance, updateApplication } from '../../lib/api';
import { formatDay, formatTime } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import type { Application } from '../../lib/types';
import { findStudent, liveInterviews, rulesFrom, takenFrom, venueOf, wantsFor, windowsFor } from './slotkit';
import { useStore } from './store';

const todayIst = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

export default function Attendance() {
  const { pub, apps, attendance, roleBy, companyBy, setApps, setAttendance, reload, reloadPublic } = useStore();
  const days = pub?.settings.drive_days ?? ['2026-11-02', '2026-11-03'];
  const [day, setDay] = useState(days.includes(todayIst()) ? todayIst() : days[0]);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'good' | 'bad'; text: string; slots?: Placed[]; name?: string } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const rules = rulesFrom(pub?.settings);
  const sessions = pub?.sessions ?? [];

  const roll = useMemo(() => {
    const byId = new Map(apps.map((a) => [a.applicant_id, a.applicant]));
    return attendance
      .filter((a) => a.day === day)
      .sort((x, y) => x.seq - y.seq)
      .map((a) => ({ at: a, student: byId.get(a.applicant_id) }));
  }, [attendance, apps, day]);

  async function admit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      // work from fresh data: another organiser may have admitted students a moment ago
      let fresh = await loadApplications();
      const student = findStudent(fresh, code);
      if (!student) throw new Error(`No student with ID or PRN “${code.trim()}”. Check the ID on the application receipt.`);

      const already = attendance.find((a) => a.applicant_id === student.id && a.day === day);
      if (already) {
        const mine = liveInterviews(fresh, roleBy, day).filter((l) => l.app.applicant_id === student.id);
        setMsg({
          tone: 'good',
          text: `${student.full_name} is already marked present${mine.length ? '' : ', but has no slots'}.`,
          name: student.full_name,
          slots: mine.map((l) => ({ company: l.company, appId: l.app.id, start: new Date(l.iv.starts_at).getTime(), end: new Date(l.iv.ends_at).getTime(), panel: l.iv.panel ?? '' })),
        });
        setCode('');
        return;
      }

      const by = (await supabase.auth.getUser()).data.user?.email ?? 'organiser';
      const mark = await markAttendance(student.id, day, by);
      setAttendance((list) => [...list, mark]);

      let result: { placed: Placed[]; unplaced: { company: string }[] } = { placed: [], unplaced: [] };
      for (let attempt = 0; attempt < 3; attempt++) {
        const wants = wantsFor(fresh, roleBy, student.id);
        const live = liveInterviews(fresh, roleBy, day);
        const companies = [...new Set(wants.map((w) => w.company))];
        result = allotStudent({
          day,
          rules,
          windows: windowsFor(day, rules, companies, sessions),
          taken: takenFrom(live),
          busy: live.filter((l) => l.app.applicant_id === student.id).map((l) => [new Date(l.iv.starts_at).getTime(), new Date(l.iv.ends_at).getTime()]),
          wants,
          notBefore: day === todayIst() ? Date.now() : 0,
        });
        if (!result.placed.length) break;
        try {
          await createInterviews(
            result.placed.map((p) => {
              const venue = venueOf(p.company, day, sessions);
              return {
                application_id: p.appId,
                starts_at: new Date(p.start).toISOString(),
                ends_at: new Date(p.end).toISOString(),
                reporting_at: new Date(p.start - 30 * 60000).toISOString(),
                panel: p.panel,
                mode: 'Campus' as const,
                room: venue,
                meet_url: null,
              };
            }),
          );
          break;
        } catch (err) {
          // someone took the same slot at the same moment: look again
          if (attempt === 2 || !/duplicate|unique/i.test((err as Error).message)) throw err;
          fresh = await loadApplications();
        }
      }
      setApps(await loadApplications());
      setAttendance(await loadAttendance());
      const names = result.unplaced.map((u) => companyBy.get(u.company)?.short_name ?? u.company).join(', ');
      setMsg({
        tone: result.unplaced.length || !result.placed.length ? 'bad' : 'good',
        name: student.full_name,
        slots: result.placed,
        text: !result.placed.length && !result.unplaced.length
          ? `${student.full_name} is marked present, but has no open application to schedule.`
          : result.unplaced.length
            ? `${student.full_name} is marked present. No free slot left at ${names}: widen the window, add a panel or move a slot.`
            : `${student.full_name} is marked present and has ${result.placed.length} slot${result.placed.length > 1 ? 's' : ''}.`,
      });
      setCode('');
    } catch (err) {
      setMsg({ tone: 'bad', text: (err as Error).message });
    } finally {
      setBusy(false);
      input.current?.focus();
    }
  }

  async function undo(attId: string, applicantId: string) {
    if (!confirm('Remove this attendance and free the student’s slots? Slots already checked in or done stay.')) return;
    setBusy(true);
    try {
      const mine = liveInterviews(apps, roleBy, day).filter((l) => l.app.applicant_id === applicantId && !l.iv.checked_in_at && !l.iv.done && !l.iv.no_show);
      await cancelInterviews(mine.map((l) => l.iv.id));
      for (const l of mine) {
        // put the application back to where it was before it was scheduled
        const log = await loadStatusLog(l.app.id);
        const prev = log.find((e) => e.to_status === 'Interview Scheduled')?.from_status;
        const stillLive = l.app.interviews.some((i) => !i.cancelled && i.id !== l.iv.id);
        if (prev && !stillLive && l.app.status === 'Interview Scheduled') await updateApplication(l.app.id, { status: prev as Application['status'] });
      }
      await unmarkAttendance(attId);
      await reload();
    } catch (e) {
      setMsg({ tone: 'bad', text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const dayInterviews = liveInterviews(apps, roleBy, day);

  return (
    <div className="grid gap-10">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Drive day">
        {days.map((d) => (
          <button key={d} role="tab" aria-selected={day === d} className={`px-4 py-2 font-medium ${day === d ? 'bg-ink text-paper' : 'bg-mist hover:bg-mist-deep'}`} onClick={() => setDay(d)}>
            {formatDay(d, { weekday: 'long' })}
          </button>
        ))}
      </div>

      <section className="grid gap-4 max-w-3xl">
        <h1 className="font-bold text-[1.5rem]">Mark attendance</h1>
        <p className="text-ink-soft max-w-[70ch]">
          Enter the student ID from their application receipt (for example STU-0012; the PRN works too). When they are marked present they get one slot at each company they applied to, in arrival order, {rules.slotMin} minutes each with {rules.bufferMin} minutes between slots.
        </p>
        <form onSubmit={admit} className="flex flex-wrap gap-2 items-end">
          <div className="grow max-w-sm">
            <label htmlFor="att_code" className="label">Student ID or PRN</label>
            <input id="att_code" ref={input} className="field num" value={code} onChange={(e) => setCode(e.target.value)} placeholder="STU-0012" autoFocus autoComplete="off" />
          </div>
          <button className="btn btn-ink" disabled={busy || !code.trim()}>{busy ? 'Allotting…' : 'Mark present'}</button>
        </form>
        {msg && (
          <div role="status" className={`p-4 ${msg.tone === 'good' ? 'bg-green-soft' : 'bg-saffron-soft'}`}>
            <p className="font-medium">{msg.text}</p>
            {!!msg.slots?.length && (
              <ul className="mt-2 grid gap-1 num">
                {[...msg.slots].sort((a, b) => a.start - b.start).map((p) => (
                  <li key={p.appId}>
                    {formatTime(new Date(p.start).toISOString())}–{formatTime(new Date(p.end).toISOString())} · {companyBy.get(p.company)?.short_name ?? p.company}
                    {venueOf(p.company, day, sessions) ? ` · ${venueOf(p.company, day, sessions)}` : ''}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-bold text-[1.5rem]">Present on {formatDay(day, { weekday: 'long' })} · <span className="num">{roll.length}</span></h2>
        {roll.length === 0 ? (
          <p className="mt-3 bg-mist p-5">Nobody marked present yet.</p>
        ) : (
          <div className="overflow-x-auto mt-3">
            <table className="w-full min-w-[760px] text-left">
              <thead className="small text-ink-soft">
                <tr>
                  <th className="py-2 pr-3 font-medium">#</th>
                  <th className="py-2 pr-3 font-medium">Student</th>
                  <th className="py-2 pr-3 font-medium">In at</th>
                  <th className="py-2 pr-3 font-medium">Slots</th>
                  <th className="py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {roll.map(({ at, student }, n) => {
                  const mine = dayInterviews.filter((l) => l.app.applicant_id === at.applicant_id).sort((a, b) => a.iv.starts_at.localeCompare(b.iv.starts_at));
                  return (
                    <tr key={at.id} className="border-t border-mist-deep align-top">
                      <td className="py-2.5 pr-3 num">{n + 1}</td>
                      <td className="py-2.5 pr-3">
                        <span className="font-medium">{student?.full_name ?? '—'}</span>
                        <span className="block small num text-ink-soft">{student?.student_code}</span>
                      </td>
                      <td className="py-2.5 pr-3 num">{formatTime(at.marked_at)}</td>
                      <td className="py-2.5 pr-3 num small">
                        {mine.length === 0 ? <span className="text-ink-soft">No slots</span> : mine.map((l) => (
                          <span key={l.iv.id} className="block">
                            {formatTime(l.iv.starts_at)}–{formatTime(l.iv.ends_at)} · {companyBy.get(l.company)?.short_name ?? l.company}{l.iv.room ? ` · ${l.iv.room}` : ''}
                          </span>
                        ))}
                      </td>
                      <td className="py-2.5 text-right">
                        <button className="link small" onClick={() => undo(at.id, at.applicant_id)} disabled={busy}>Undo</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <RulesEditor onSaved={reloadPublic} />
    </div>
  );
}

function RulesEditor({ onSaved }: { onSaved: () => Promise<void> }) {
  const { pub } = useStore();
  const r = rulesFrom(pub?.settings);
  const [v, setV] = useState(r);
  const [msg, setMsg] = useState('');
  async function save() {
    setMsg('');
    try {
      await saveSettings({
        slot_minutes: v.slotMin,
        buffer_minutes: v.bufferMin,
        day_start: v.dayStart,
        day_end: v.dayEnd,
        lunch_start: v.lunchStart || null,
        lunch_end: v.lunchEnd || null,
      });
      await onSaved();
      setMsg('Saved. New admissions use these rules; existing slots stay as they are.');
    } catch (e) {
      setMsg((e as Error).message);
    }
  }
  const num = (k: 'slotMin' | 'bufferMin') => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: Math.max(0, Number(e.target.value) || 0) });
  return (
    <details className="bg-mist p-4">
      <summary className="font-bold cursor-pointer">Slot rules</summary>
      <p className="small text-ink-soft mt-2 max-w-[70ch]">Used for every company without its own session times (set those on the Schedule tab). A company session’s from/to and panels override the day window.</p>
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mt-3">
        <label className="small">Slot (min)<input type="number" min={5} className="field mt-1" value={v.slotMin} onChange={num('slotMin')} /></label>
        <label className="small">Buffer (min)<input type="number" min={0} className="field mt-1" value={v.bufferMin} onChange={num('bufferMin')} /></label>
        <label className="small">Day starts<input type="time" className="field mt-1" value={v.dayStart} onChange={(e) => setV({ ...v, dayStart: e.target.value })} /></label>
        <label className="small">Day ends<input type="time" className="field mt-1" value={v.dayEnd} onChange={(e) => setV({ ...v, dayEnd: e.target.value })} /></label>
        <label className="small">Lunch from<input type="time" className="field mt-1" value={v.lunchStart ?? ''} onChange={(e) => setV({ ...v, lunchStart: e.target.value || null })} /></label>
        <label className="small">Lunch to<input type="time" className="field mt-1" value={v.lunchEnd ?? ''} onChange={(e) => setV({ ...v, lunchEnd: e.target.value || null })} /></label>
      </div>
      <div className="flex items-center gap-3 mt-3">
        <button className="btn btn-ink !min-h-[40px]" onClick={save}>Save rules</button>
        {msg && <p className="small font-medium">{msg}</p>}
      </div>
    </details>
  );
}
