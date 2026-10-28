import { useMemo, useState } from 'react';
import { createInterviews, deleteSession, saveSession } from '../../lib/api';
import { formatDay, formatTime, istToIso, isoToIstDate } from '../../lib/format';
import type { Application, DriveSession } from '../../lib/types';
import { useStore } from './store';

const GAP = 30 * 60000;
const BUFFER = 5;

export default function Schedule() {
  const { pub, apps, companyBy, reload, reloadPublic } = useStore();
  const days = pub?.settings.drive_days ?? ['2026-11-02', '2026-11-03'];
  const [day, setDay] = useState(days[0]);
  const sessions = (pub?.sessions ?? []).filter((s) => s.day === day);
  const companies = (pub?.companies ?? []).filter((c) => c.jd_status === 'published');
  const interviews = apps
    .flatMap((a) => a.interviews.filter((i) => !i.cancelled && isoToIstDate(i.starts_at) === day).map((i) => ({ ...i, app: a })))
    .sort((x, y) => x.starts_at.localeCompare(y.starts_at));

  return (
    <div className="grid gap-10">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Drive day">
        {days.map((d) => (
          <button key={d} role="tab" aria-selected={day === d} className={`px-4 py-2 font-medium ${day === d ? 'bg-ink text-paper' : 'bg-mist hover:bg-mist-deep'}`} onClick={() => setDay(d)}>
            {formatDay(d, { weekday: 'long' })}
          </button>
        ))}
      </div>

      <section>
        <h1 className="font-bold text-[1.5rem]">Company sessions on {formatDay(day, { weekday: 'long' })}</h1>
        <p className="mt-1 text-ink-soft">These show on the public schedule. Leave times empty until the company confirms.</p>
        <div className="mt-4 grid gap-3">
          {sessions.map((s) => (
            <SessionEditor key={s.id} session={s} companies={companies.map((c) => [c.code, c.short_name])} onSaved={reloadPublic} />
          ))}
          <SessionEditor key={`new-${day}-${sessions.length}`} session={{ id: '', company_code: '', day, starts_at: '09:30', ends_at: '17:00', venue: '', mode: 'On campus', panels: 1, note: '' }} companies={companies.map((c) => [c.code, c.short_name])} onSaved={reloadPublic} isNew />
        </div>
      </section>

      {sessions.length > 0 && (
        <section>
          <h2 className="font-bold text-[1.5rem]">Fill slots automatically</h2>
          <p className="mt-1 text-ink-soft max-w-[80ch]">
            Follows the Operations Plan: students with the most interviews first, their top preference first, {BUFFER}-minute buffer, lunch 1–2 pm, and 30 minutes between two interviews of the same student. You see the plan before anything is saved.
          </p>
          <div className="mt-4 grid gap-4">
            {sessions.map((s) => (
              <AutoPlan key={s.id} session={s} companyName={companyBy.get(s.company_code)?.name ?? s.company_code} onDone={reload} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="font-bold text-[1.5rem]">Interviews on {formatDay(day, { weekday: 'long' })}</h2>
        {interviews.length === 0 ? (
          <p className="mt-3 bg-mist p-5">No interviews scheduled for this day yet.</p>
        ) : (
          <div className="overflow-x-auto mt-3">
            <table className="w-full min-w-[720px] text-left">
              <thead className="small text-ink-soft">
                <tr>
                  <th className="py-2 pr-3 font-medium">Time</th>
                  <th className="py-2 pr-3 font-medium">Interview</th>
                  <th className="py-2 pr-3 font-medium">Student</th>
                  <th className="py-2 pr-3 font-medium">Role</th>
                  <th className="py-2 pr-3 font-medium">Panel</th>
                  <th className="py-2 font-medium">Room</th>
                </tr>
              </thead>
              <tbody>
                {interviews.map((i) => (
                  <tr key={i.id} className="border-t border-mist-deep">
                    <td className="py-2 pr-3 num">{formatTime(i.starts_at)}–{formatTime(i.ends_at)}</td>
                    <td className="py-2 pr-3 num">{i.interview_code}</td>
                    <td className="py-2 pr-3">{i.app.applicant.full_name} <span className="small text-ink-soft num">{i.app.applicant.phone}</span></td>
                    <td className="py-2 pr-3">{i.app.role_code}</td>
                    <td className="py-2 pr-3">{i.panel ?? '—'}</td>
                    <td className="py-2">{i.mode === 'Online' ? 'Online' : i.room || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function SessionEditor({ session, companies, onSaved, isNew }: { session: DriveSession; companies: [string, string][]; onSaved: () => Promise<void>; isNew?: boolean }) {
  const [s, setS] = useState({ ...session, starts_at: session.starts_at?.slice(0, 5) ?? '', ends_at: session.ends_at?.slice(0, 5) ?? '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function save() {
    if (!s.company_code) return setErr('Pick a company.');
    setBusy(true);
    setErr('');
    try {
      const { id, ...rest } = s;
      await saveSession({ ...(isNew ? {} : { id }), ...rest, starts_at: s.starts_at || null, ends_at: s.ends_at || null, venue: s.venue || null, note: s.note || null });
      await onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={`grid gap-2 p-3 ${isNew ? 'bg-paper outline-2 outline-dashed outline-mist-deep' : 'bg-mist'}`}>
      <div className="grid grid-cols-2 md:grid-cols-[minmax(10rem,1.4fr)_7rem_7rem_minmax(10rem,1.4fr)_10rem_5rem_auto] gap-2 items-end">
        <label className="small">
          Company
          <select className="field mt-1" value={s.company_code} onChange={(e) => setS({ ...s, company_code: e.target.value })}>
            <option value="">{isNew ? 'Add a company…' : 'Choose'}</option>
            {companies.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
          </select>
        </label>
        <label className="small">From<input type="time" className="field mt-1" value={s.starts_at} onChange={(e) => setS({ ...s, starts_at: e.target.value })} /></label>
        <label className="small">To<input type="time" className="field mt-1" value={s.ends_at} onChange={(e) => setS({ ...s, ends_at: e.target.value })} /></label>
        <label className="small">Venue<input className="field mt-1" value={s.venue ?? ''} placeholder="Building, room" onChange={(e) => setS({ ...s, venue: e.target.value })} /></label>
        <label className="small">
          Mode
          <select className="field mt-1" value={s.mode} onChange={(e) => setS({ ...s, mode: e.target.value as DriveSession['mode'] })}>
            <option>On campus</option>
            <option>Online</option>
            <option>On campus + online</option>
          </select>
        </label>
        <label className="small">Panels<input type="number" min={1} max={10} className="field mt-1" value={s.panels} onChange={(e) => setS({ ...s, panels: Number(e.target.value) || 1 })} /></label>
        <div className="flex gap-2">
          <button className="btn btn-ink !min-h-[48px]" onClick={save} disabled={busy}>{isNew ? 'Add' : 'Save'}</button>
          {!isNew && (
            <button
              className="btn btn-paper !min-h-[48px]"
              onClick={async () => {
                await deleteSession(session.id);
                await onSaved();
              }}
            >
              Remove
            </button>
          )}
        </div>
      </div>
      {err && <p className="error-text">{err}</p>}
    </div>
  );
}

interface Planned {
  app: Application;
  start: string;
  end: string;
  panel: string;
}

function AutoPlan({ session, companyName, onDone }: { session: DriveSession; companyName: string; onDone: () => Promise<void> }) {
  const { apps, roleBy } = useStore();
  const [include, setInclude] = useState<'shortlisted' | 'eligible'>('shortlisted');
  const [plan, setPlan] = useState<Planned[] | null>(null);
  const [left, setLeft] = useState<Application[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const candidates = useMemo(
    () =>
      apps.filter((a) => {
        const r = roleBy.get(a.role_code);
        if (r?.company_code !== session.company_code) return false;
        if (a.interviews.some((i) => !i.cancelled)) return false;
        if (include === 'shortlisted') return a.company_decision === 'Shortlisted';
        return a.company_decision === 'Shortlisted' || a.status === 'Eligible';
      }),
    [apps, roleBy, session.company_code, include],
  );

  function build() {
    setMsg('');
    if (!session.starts_at || !session.ends_at) {
      setMsg('Set the session’s start and end time first.');
      return;
    }
    const busyBy = new Map<string, [number, number][]>();
    apps.forEach((a) =>
      a.interviews
        .filter((i) => !i.cancelled)
        .forEach((i) => {
          const list = busyBy.get(a.applicant_id) ?? [];
          list.push([new Date(i.starts_at).getTime(), new Date(i.ends_at).getTime()]);
          busyBy.set(a.applicant_id, list);
        }),
    );
    const countBy = new Map<string, number>();
    apps.forEach((a) => countBy.set(a.applicant_id, (countBy.get(a.applicant_id) ?? 0) + 1));
    const order = [...candidates].sort((x, y) => (countBy.get(y.applicant_id) ?? 0) - (countBy.get(x.applicant_id) ?? 0) || x.preference - y.preference || x.created_at.localeCompare(y.created_at));

    const dayStart = new Date(istToIso(session.day, session.starts_at.slice(0, 5))).getTime();
    const dayEnd = new Date(istToIso(session.day, session.ends_at.slice(0, 5))).getTime();
    const lunchStart = new Date(istToIso(session.day, '13:00')).getTime();
    const lunchEnd = new Date(istToIso(session.day, '14:00')).getTime();
    const cursor = Array.from({ length: session.panels }, () => dayStart);
    const out: Planned[] = [];
    const unplaced: Application[] = [];

    for (const a of order) {
      const len = (roleBy.get(a.role_code)?.interview_minutes ?? 15) * 60000;
      const theirs = busyBy.get(a.applicant_id) ?? [];
      let best: { p: number; start: number } | null = null;
      for (let p = 0; p < cursor.length; p++) {
        let t = cursor[p];
        for (let guard = 0; guard < 500; guard++) {
          if (t < lunchEnd && t + len > lunchStart) {
            t = lunchEnd;
            continue;
          }
          const clash = theirs.find(([s0, e0]) => t < e0 + GAP && t + len + GAP > s0);
          if (clash) {
            t = clash[1] + GAP;
            continue;
          }
          break;
        }
        if (t + len <= dayEnd && (!best || t < best.start)) best = { p, start: t };
      }
      if (!best) {
        unplaced.push(a);
        continue;
      }
      const end = best.start + len;
      out.push({ app: a, start: new Date(best.start).toISOString(), end: new Date(end).toISOString(), panel: `${session.company_code}-P${best.p + 1}` });
      theirs.push([best.start, end]);
      busyBy.set(a.applicant_id, theirs);
      cursor[best.p] = end + BUFFER * 60000;
    }
    setPlan(out);
    setLeft(unplaced);
  }

  async function commit() {
    if (!plan?.length) return;
    setBusy(true);
    try {
      await createInterviews(
        plan.map((p) => ({
          application_id: p.app.id,
          starts_at: p.start,
          ends_at: p.end,
          reporting_at: new Date(new Date(p.start).getTime() - 30 * 60000).toISOString(),
          panel: p.panel,
          mode: session.mode === 'Online' ? 'Online' : 'Campus',
          room: session.venue,
          meet_url: null,
        })),
      );
      setMsg(`${plan.length} interviews created. Students see them on the Track page now.`);
      setPlan(null);
      await onDone();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-mist p-4 grid gap-3">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <p className="font-bold">
          {companyName} · {session.starts_at?.slice(0, 5) ?? '—'}–{session.ends_at?.slice(0, 5) ?? '—'} · {session.panels} panel{session.panels > 1 ? 's' : ''}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <select className="field !min-h-[40px] w-auto" value={include} onChange={(e) => setInclude(e.target.value as 'shortlisted' | 'eligible')} aria-label="Who to schedule">
            <option value="shortlisted">Company-shortlisted only</option>
            <option value="eligible">Shortlisted + screened eligible</option>
          </select>
          <span className="small num">{candidates.length} waiting</span>
          <button className="btn btn-ink !min-h-[40px]" onClick={build} disabled={!candidates.length}>
            Plan slots
          </button>
        </div>
      </div>
      {plan && (
        <div className="bg-paper p-3">
          <p className="font-medium">
            {plan.length} placed{left.length ? `, ${left.length} did not fit (add a panel or another session)` : ''}.
          </p>
          <ol className="mt-2 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1 small">
            {plan.map((p) => (
              <li key={p.app.id} className="num">
                {formatTime(p.start)} · {p.panel} · {p.app.applicant.full_name} ({p.app.role_code})
              </li>
            ))}
          </ol>
          <div className="flex gap-2 mt-3">
            <button className="btn btn-ink !min-h-[40px]" onClick={commit} disabled={busy || !plan.length}>
              {busy ? 'Saving…' : `Create ${plan.length} interviews`}
            </button>
            <button className="btn btn-quiet !min-h-[40px]" onClick={() => setPlan(null)}>
              Discard
            </button>
          </div>
        </div>
      )}
      {msg && <p className="font-medium">{msg}</p>}
    </div>
  );
}
