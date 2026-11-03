import { useState } from 'react';
import { formatDay } from '../lib/format';
import { useSlots } from '../lib/hooks';
import type { PortalApplication, PortalData } from '../lib/types';

type Interview = PortalApplication['interviews'][number];

export interface Slot {
  iv: Interview;
  app: PortalApplication;
  roles: string[];
}

/** One entry per slot, by time: a student's roles linked to the same slot show together. */
export function slotsFrom(apps: PortalApplication[]) {
  const bySlot = new Map<string, Slot>();
  for (const app of apps) {
    for (const iv of app.interviews) {
      const key = `${app.student.student_code}|${iv.starts_at}`;
      const cur = bySlot.get(key);
      if (!cur) bySlot.set(key, { iv, app, roles: [app.role_code] });
      else {
        cur.roles.push(app.role_code);
        if (iv.panel && !cur.iv.panel) cur.iv = iv;
      }
    }
  }
  return [...bySlot.values()].sort((x, y) => x.iv.starts_at.localeCompare(y.iv.starts_at));
}

function state(iv: Interview) {
  if (iv.no_show) return { label: 'No-show', tone: 'bg-mist-deep' };
  if (iv.done) return { label: 'Done', tone: 'bg-mist-deep' };
  if (iv.checked_in_at) return { label: 'Checked in', tone: 'bg-green' };
  return { label: 'Upcoming', tone: 'bg-paper' };
}

export default function CompanySchedule({ data, slots, onOpen }: { data: PortalData; slots: Slot[]; onOpen: (appId: string) => void }) {
  const [panel, setPanel] = useState('');
  const { slotOf, dayOf } = useSlots();
  const days = [...new Set([...data.settings.drive_days, ...slots.map((s) => dayOf(s.iv.starts_at))])].sort();
  const panels = [...new Set(slots.map((s) => s.iv.panel).filter((p): p is string => !!p))].sort();
  const shown = slots.filter((s) => !panel || s.iv.panel === panel);
  const title = (code: string) => data.roles.find((r) => r.code === code)?.title ?? code;

  return (
    <section aria-label="Interview schedule" className="mt-10 grid gap-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-bold text-[1.5rem]">Your interview schedule</h2>
          <p className="mt-1 text-ink-soft max-w-[60ch]">Every interview in slot order. This page refreshes on its own, so any change the Yi team makes shows here.</p>
        </div>
        {panels.length > 1 && (
          <div>
            <label htmlFor="c_panel" className="label small">Panel</label>
            <select id="c_panel" className="field min-w-[12rem]" value={panel} onChange={(e) => setPanel(e.target.value)}>
              <option value="">All panels</option>
              {panels.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        )}
      </div>

      {days.map((d) => {
        const today = shown.filter((s) => dayOf(s.iv.starts_at) === d);
        return (
          <div key={d}>
            <h3 className="font-bold text-[1.25rem]">
              {formatDay(d, { weekday: 'long', day: 'numeric', month: 'long' })} · <span className="num">{today.length}</span>
            </h3>
            {today.length === 0 ? (
              <p className="mt-3 bg-mist p-5">No interviews on this day yet. They appear here as students are marked present.</p>
            ) : (
              <ol className="mt-3 grid gap-2">
                {today.map(({ iv, app, roles }) => {
                  const st = state(iv);
                  return (
                    <li key={iv.interview_code} className={`bg-mist p-4 grid sm:grid-cols-[9.5rem_1fr_auto] gap-x-5 gap-y-2 items-start ${iv.done || iv.no_show ? 'opacity-60' : ''}`}>
                      <p className="num font-bold text-[1.125rem] leading-snug">{slotOf(iv.starts_at)}</p>
                      <div className="min-w-0">
                        <button className="font-bold text-[1.125rem] link text-left" onClick={() => onOpen(app.id)}>{app.student.full_name}</button>
                        <p className="small mt-0.5">{roles.map(title).join(' · ')}</p>
                        <p className="small text-ink-soft mt-0.5">{app.student.programme} · {app.student.specialisation}{app.student.phone ? ` · ${app.student.phone}` : ''}</p>
                      </div>
                      <div className="sm:text-right grid gap-1.5 sm:justify-items-end">
                        <span className={`small font-medium px-2.5 py-1 justify-self-start sm:justify-self-end ${st.tone}`}>{st.label}</span>
                        <p className="small">
                          {iv.mode === 'Online' ? (iv.meet_url ? <a className="link" href={iv.meet_url} target="_blank" rel="noreferrer">Join online</a> : 'Online') : iv.room || 'Room TBA'}
                          {iv.panel ? ` · ${iv.panel}` : ''}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        );
      })}
    </section>
  );
}
