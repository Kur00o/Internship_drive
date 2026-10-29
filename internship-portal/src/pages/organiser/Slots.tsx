import { useMemo, useState } from 'react';
import { freePanel, panelName, slotStarts } from '../../lib/allot';
import { addVenue, deleteVenue, loadVenues, saveSession, updateInterview } from '../../lib/api';
import { formatDay, formatTime } from '../../lib/format';
import type { Interview } from '../../lib/types';
import { liveInterviews, rulesFrom, venueOf, windowsFor } from './slotkit';
import { useStore } from './store';

type Live = ReturnType<typeof liveInterviews>[number];

export default function Slots() {
  const { pub, apps, venues, setApps, setVenues, roleBy, companyBy, reload, reloadPublic } = useStore();
  const days = pub?.settings.drive_days ?? ['2026-11-02', '2026-11-03'];
  const [day, setDay] = useState(days[0]);
  const [drag, setDrag] = useState<{ kind: 'iv'; id: string } | { kind: 'venue'; name: string } | null>(null);
  const [over, setOver] = useState('');
  const [msg, setMsg] = useState('');
  const rules = rulesFrom(pub?.settings);
  const sessions = pub?.sessions ?? [];
  const live = useMemo(() => liveInterviews(apps, roleBy, day), [apps, roleBy, day]);
  const cols = (pub?.companies ?? []).filter((c) => c.jd_status === 'published' && (live.some((l) => l.company === c.code) || sessions.some((s) => s.company_code === c.code && s.day === day)));
  const windows = windowsFor(day, rules, cols.map((c) => c.code), sessions);

  // rows: every grid slot of every shown company, plus any off-grid interview already booked
  const rowSet = new Set<number>();
  windows.forEach((w) => slotStarts(day, rules, w).forEach((s) => rowSet.add(s)));
  live.forEach((l) => rowSet.add(new Date(l.iv.starts_at).getTime()));
  const rows = [...rowSet].sort((a, b) => a - b);

  const gapMs = rules.bufferMin * 60000;

  /** Why an interview cannot move to this start, or null if it can. */
  function blocker(l: Live, start: number): string | null {
    const len = rules.slotMin * 60000;
    const end = start + (new Date(l.iv.ends_at).getTime() - new Date(l.iv.starts_at).getTime() || len);
    const clash = live.find(
      (o) => o.iv.id !== l.iv.id && o.app.applicant_id === l.app.applicant_id && start < new Date(o.iv.ends_at).getTime() + gapMs && end + gapMs > new Date(o.iv.starts_at).getTime(),
    );
    if (clash) return `${l.app.applicant.full_name} already has ${companyBy.get(clash.company)?.short_name ?? clash.company} at ${formatTime(clash.iv.starts_at)}–${formatTime(clash.iv.ends_at)}; keep ${rules.bufferMin} minutes between slots.`;
    return null;
  }

  function patchLocal(id: string, applicationId: string, p: Partial<Interview>) {
    setApps((list) => list.map((a) => (a.id === applicationId ? { ...a, interviews: a.interviews.map((i) => (i.id === id ? { ...i, ...p } : i)) } : a)));
  }

  function target(l: Live, start: number, panel: string) {
    const ms = new Date(l.iv.ends_at).getTime() - new Date(l.iv.starts_at).getTime();
    return { starts_at: new Date(start).toISOString(), ends_at: new Date(start + ms).toISOString(), reporting_at: new Date(start - 30 * 60000).toISOString(), panel };
  }

  async function move(id: string, company: string, start: number) {
    setMsg('');
    const l = live.find((x) => x.iv.id === id);
    if (!l) return;
    if (l.company !== company) return setMsg('A slot stays with its own company. Drop it on a time in the same column.');
    if (l.iv.checked_in_at || l.iv.done || l.iv.no_show) return setMsg('This student is already checked in or done; it cannot be moved.');
    const w = windows.get(company);
    const here = live.filter((o) => o.company === company && new Date(o.iv.starts_at).getTime() === start && o.iv.id !== id);
    if (l.iv.starts_at && new Date(l.iv.starts_at).getTime() === start) return;
    const why = blocker(l, start);
    if (why) return setMsg(why);
    const panels = w?.panels ?? 1;
    const free = freePanel(company, panels, new Set(here.map((o) => o.iv.panel ?? '')));
    try {
      if (free) {
        const patch = target(l, start, free);
        patchLocal(id, l.iv.application_id, patch);
        await updateInterview(id, patch);
      } else {
        // slot is full: swap with the first student there
        const other = here[0];
        const why2 = blocker(other, new Date(l.iv.starts_at).getTime());
        if (why2) return setMsg(why2);
        if (other.iv.checked_in_at || other.iv.done) return setMsg('The student in that slot is already checked in; it cannot be swapped.');
        const a = target(l, start, other.iv.panel ?? panelName(company, 1));
        const b = target(other, new Date(l.iv.starts_at).getTime(), l.iv.panel ?? panelName(company, 1));
        await updateInterview(id, { panel: null }); // step aside so the unique panel+time index never clashes
        await updateInterview(other.iv.id, b);
        await updateInterview(id, a);
        await reload();
        setMsg(`Swapped ${l.app.applicant.full_name} and ${other.app.applicant.full_name}.`);
      }
    } catch (e) {
      setMsg((e as Error).message);
      await reload();
    }
  }

  async function setVenue(company: string, venue: string) {
    setMsg('');
    try {
      const ss = sessions.filter((s) => s.company_code === company && s.day === day);
      if (ss.length) for (const s of ss) await saveSession({ id: s.id, company_code: company, day, venue: venue || null });
      else await saveSession({ company_code: company, day, venue: venue || null, mode: 'On campus', panels: 1 });
      // students' rooms follow the venue
      const todo = live.filter((l) => l.company === company && !l.iv.done && l.iv.mode === 'Campus');
      for (const l of todo) await updateInterview(l.iv.id, { room: venue || null });
      await reloadPublic();
      await reload();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  function onDropCell(e: React.DragEvent, company: string, start: number) {
    e.preventDefault();
    setOver('');
    if (drag?.kind === 'iv') move(drag.id, company, start);
    setDrag(null);
  }

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Drive day">
        {days.map((d) => (
          <button key={d} role="tab" aria-selected={day === d} className={`px-4 py-2 font-medium ${day === d ? 'bg-ink text-paper' : 'bg-mist hover:bg-mist-deep'}`} onClick={() => setDay(d)}>
            {formatDay(d, { weekday: 'long' })}
          </button>
        ))}
      </div>

      <VenuePanel venues={venues} setVenues={setVenues} setDrag={setDrag} />

      <section>
        <h1 className="font-bold text-[1.5rem]">All slots on {formatDay(day, { weekday: 'long' })}</h1>
        <p className="mt-1 text-ink-soft max-w-[80ch]">
          Drag a student onto another time in the same company’s column to move them; drop on a full slot to swap two students. Drag a venue onto a company’s heading to place that company there. Each card also has a Move menu for touch screens.
        </p>
        {msg && <p role="status" className="mt-3 bg-saffron-soft p-3 font-medium">{msg}</p>}
        {cols.length === 0 ? (
          <p className="mt-4 bg-mist p-5">No slots yet. Mark attendance and students get slots automatically.</p>
        ) : (
          <div className="overflow-x-auto mt-4">
            <div className="grid min-w-max gap-px bg-mist-deep" style={{ gridTemplateColumns: `5.5rem repeat(${cols.length}, minmax(13rem, 1fr))` }}>
              <div className="bg-paper" />
              {cols.map((c) => {
                const v = venueOf(c.code, day, sessions);
                return (
                  <div
                    key={c.code}
                    className={`p-3 ${over === `v:${c.code}` ? 'bg-saffron' : 'bg-mist'}`}
                    onDragOver={(e) => { if (drag?.kind === 'venue') { e.preventDefault(); setOver(`v:${c.code}`); } }}
                    onDragLeave={() => setOver('')}
                    onDrop={(e) => { e.preventDefault(); setOver(''); if (drag?.kind === 'venue') setVenue(c.code, drag.name); setDrag(null); }}
                  >
                    <p className="font-bold">{c.short_name}</p>
                    <label className="sr-only" htmlFor={`venue_${c.code}`}>Venue for {c.short_name}</label>
                    <select id={`venue_${c.code}`} className="field !min-h-[36px] mt-1 small" value={v ?? ''} onChange={(e) => setVenue(c.code, e.target.value)}>
                      <option value="">Venue not set</option>
                      {v && !venues.some((x) => x.name === v) && <option value={v}>{v}</option>}
                      {venues.map((x) => <option key={x.id} value={x.name}>{x.name}</option>)}
                    </select>
                  </div>
                );
              })}
              {rows.map((start) => (
                <Row key={start} start={start} cols={cols.map((c) => c.code)} live={live} windows={windows} rules={rules} over={over} setOver={setOver} onDrop={onDropCell} setDrag={setDrag} drag={drag} move={move} allRows={rows} />
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function Row({ start, cols, live, windows, rules, over, setOver, onDrop, setDrag, drag, move, allRows }: {
  start: number;
  cols: string[];
  live: Live[];
  windows: ReturnType<typeof windowsFor>;
  rules: ReturnType<typeof rulesFrom>;
  over: string;
  setOver: (k: string) => void;
  onDrop: (e: React.DragEvent, company: string, start: number) => void;
  setDrag: (d: { kind: 'iv'; id: string } | null) => void;
  drag: { kind: 'iv'; id: string } | { kind: 'venue'; name: string } | null;
  move: (id: string, company: string, start: number) => Promise<void>;
  allRows: number[];
}) {
  const label = formatTime(new Date(start).toISOString());
  return (
    <>
      <div className="bg-paper p-2 num small font-medium">{label}</div>
      {cols.map((c) => {
        const w = windows.get(c);
        const here = live.filter((l) => l.company === c && new Date(l.iv.starts_at).getTime() === start);
        const onGrid = !!w && slotStarts(new Date(start).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }), rules, w).includes(start);
        const panels = w?.panels ?? 1;
        const key = `${c}:${start}`;
        return (
          <div
            key={key}
            className={`p-1.5 min-h-[3.5rem] grid gap-1 content-start ${over === key ? 'bg-saffron-soft' : onGrid || here.length ? 'bg-paper' : 'bg-mist/60'}`}
            onDragOver={(e) => { if (drag?.kind === 'iv' && (onGrid || here.length)) { e.preventDefault(); setOver(key); } }}
            onDragLeave={() => setOver('')}
            onDrop={(e) => onDrop(e, c, start)}
          >
            {here.map((l) => {
              const locked = !!(l.iv.checked_in_at || l.iv.done || l.iv.no_show);
              const options = allRows.filter((t) => t !== start && !!w && slotStarts(new Date(t).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }), rules, w).includes(t));
              return (
                <div
                  key={l.iv.id}
                  draggable={!locked}
                  onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', l.iv.id); setDrag({ kind: 'iv', id: l.iv.id }); }}
                  onDragEnd={() => { setDrag(null); setOver(''); }}
                  className={`p-2 small ${locked ? 'bg-green-soft' : 'bg-mist cursor-grab active:cursor-grabbing'}`}
                >
                  <p className="font-medium leading-tight">{l.app.applicant.full_name}</p>
                  <p className="num text-ink-soft">{l.app.applicant.student_code} · {l.iv.panel ?? '—'}{l.iv.done ? ' · done' : l.iv.checked_in_at ? ' · in' : ''}</p>
                  {!locked && (
                    <select aria-label={`Move ${l.app.applicant.full_name}`} className="field !min-h-[30px] !py-0 mt-1 small" value="" onChange={(e) => e.target.value && move(l.iv.id, c, Number(e.target.value))}>
                      <option value="">Move to…</option>
                      {options.map((t) => <option key={t} value={t}>{formatTime(new Date(t).toISOString())}</option>)}
                    </select>
                  )}
                </div>
              );
            })}
            {onGrid && here.length < panels && <p className="small text-ink-soft px-1">{panels > 1 ? `${panels - here.length} free` : 'Free'}</p>}
          </div>
        );
      })}
    </>
  );
}

function VenuePanel({ venues, setVenues, setDrag }: { venues: ReturnType<typeof useStore>['venues']; setVenues: (v: ReturnType<typeof useStore>['venues']) => void; setDrag: (d: { kind: 'venue'; name: string } | null) => void }) {
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setErr('');
    try {
      await addVenue(name, note);
      setVenues(await loadVenues());
      setName('');
      setNote('');
    } catch (x) {
      setErr((x as Error).message.includes('relation') ? 'Run migration 20261029_005_slots.sql in Supabase first.' : (x as Error).message);
    }
  }
  return (
    <section className="grid gap-3">
      <h2 className="font-bold text-[1.25rem]">Venues</h2>
      <div className="flex flex-wrap gap-2">
        {venues.length === 0 && <p className="text-ink-soft">No venues yet. Add one below as soon as a room is confirmed.</p>}
        {venues.map((v) => (
          <span key={v.id} draggable onDragStart={(e) => { e.dataTransfer.setData('text/plain', v.name); setDrag({ kind: 'venue', name: v.name }); }} onDragEnd={() => setDrag(null)} className="bg-navy text-paper pl-3 pr-1 py-1 cursor-grab inline-flex items-center gap-2" title={v.note ?? undefined}>
            {v.name}
            <button
              aria-label={`Remove venue ${v.name}`}
              className="px-2 hover:bg-paper/20"
              onClick={async () => {
                if (!confirm(`Remove venue “${v.name}”? Companies already placed there keep the name.`)) return;
                await deleteVenue(v.id);
                setVenues(await loadVenues());
              }}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <form onSubmit={add} className="flex flex-wrap gap-2 items-end">
        <label className="small">Venue<input className="field mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="Block A · Room 204" /></label>
        <label className="small">Note (optional)<input className="field mt-1" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ground floor, near lift" /></label>
        <button className="btn btn-ink !min-h-[48px]" disabled={!name.trim()}>Add venue</button>
      </form>
      {err && <p className="error-text">{err}</p>}
    </section>
  );
}
