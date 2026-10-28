import { useEffect, useState } from 'react';
import { updateInterview } from '../../lib/api';
import { formatDay, formatTime, isoToIstDate } from '../../lib/format';
import type { Interview } from '../../lib/types';
import { useStore } from './store';

export default function DayBoard() {
  const { pub, apps, setApps, roleBy, companyBy } = useStore();
  const days = pub?.settings.drive_days ?? ['2026-11-02', '2026-11-03'];
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const [day, setDay] = useState(days.includes(today) ? today : days[0]);
  const [company, setCompany] = useState('');
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const rows = apps
    .flatMap((a) => a.interviews.filter((i) => !i.cancelled && isoToIstDate(i.starts_at) === day).map((i) => ({ iv: i, app: a, company: roleBy.get(a.role_code)?.company_code ?? '' })))
    .filter((r) => !company || r.company === company)
    .sort((x, y) => x.iv.starts_at.localeCompare(y.iv.starts_at));

  const byCompany = new Map<string, { total: number; checked: number; done: number; noshow: number }>();
  rows.forEach((r) => {
    const c = byCompany.get(r.company) ?? { total: 0, checked: 0, done: 0, noshow: 0 };
    c.total++;
    if (r.iv.checked_in_at && !r.iv.done) c.checked++;
    if (r.iv.done) c.done++;
    if (r.iv.no_show) c.noshow++;
    byCompany.set(r.company, c);
  });
  const calling = rows.filter((r) => !r.iv.done && !r.iv.no_show && new Date(r.iv.starts_at).getTime() - now < 30 * 60000 && new Date(r.iv.ends_at).getTime() > now);

  async function patch(iv: Interview, p: Partial<Interview>) {
    setApps((list) => list.map((a) => (a.id === iv.application_id ? { ...a, interviews: a.interviews.map((i) => (i.id === iv.id ? { ...i, ...p } : i)) } : a)));
    try {
      await updateInterview(iv.id, p);
    } catch (e) {
      alert((e as Error).message);
    }
  }

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex gap-2" role="tablist" aria-label="Day">
          {days.map((d) => (
            <button key={d} role="tab" aria-selected={day === d} className={`px-4 py-2 font-medium ${day === d ? 'bg-ink text-paper' : 'bg-mist hover:bg-mist-deep'}`} onClick={() => setDay(d)}>
              {formatDay(d)}
            </button>
          ))}
        </div>
        <div>
          <label htmlFor="d_company" className="label small">Company</label>
          <select id="d_company" className="field min-w-[12rem]" value={company} onChange={(e) => setCompany(e.target.value)}>
            <option value="">All companies</option>
            {[...new Set(rows.map((r) => r.company))].map((c) => (
              <option key={c} value={c}>{companyBy.get(c)?.short_name ?? c}</option>
            ))}
          </select>
        </div>
        <p className="small text-ink-soft ml-auto">Updates live for everyone at the desk.</p>
      </div>

      <section aria-label="Per company" className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-5">
        {[...byCompany.entries()].map(([c, v]) => (
          <div key={c}>
            <p className="font-bold">{companyBy.get(c)?.short_name ?? c}</p>
            <p className="num small mt-1">
              {v.total} slots · {v.checked} waiting · {v.done} done · {v.noshow} no-show
            </p>
          </div>
        ))}
      </section>

      {calling.length > 0 && (
        <section className="bg-saffron p-5">
          <h2 className="font-bold text-[1.25rem]">Call to the room now</h2>
          <ul className="mt-2 grid md:grid-cols-2 gap-x-6 gap-y-1">
            {calling.map((r) => (
              <li key={r.iv.id} className="num">
                {formatTime(r.iv.starts_at)} · <b>{r.app.applicant.full_name}</b> → {r.iv.room || r.iv.panel || 'room TBA'}
                {r.iv.checked_in_at ? '' : ' · not checked in'}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left">
          <thead className="small text-ink-soft">
            <tr>
              <th className="py-2 pr-3 font-medium">Slot</th>
              <th className="py-2 pr-3 font-medium">Student</th>
              <th className="py-2 pr-3 font-medium">Role</th>
              <th className="py-2 pr-3 font-medium">Panel · room</th>
              <th className="py-2 font-medium">On the day</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-ink-soft">No interviews on this day yet. Schedule them from the Schedule tab.</td>
              </tr>
            )}
            {rows.map(({ iv, app }) => (
              <tr key={iv.id} className={`border-t border-mist-deep ${iv.done ? 'text-ink-soft' : ''}`}>
                <td className="py-2.5 pr-3 num">
                  <b>{formatTime(iv.starts_at)}</b>
                  <span className="block small">{iv.interview_code}</span>
                </td>
                <td className="py-2.5 pr-3">
                  <span className="font-medium">{app.applicant.full_name}</span>
                  <a href={`tel:${app.applicant.phone}`} className="block small num link">{app.applicant.phone}</a>
                </td>
                <td className="py-2.5 pr-3 small">{app.role_code}</td>
                <td className="py-2.5 pr-3 small">{iv.panel ?? '—'} · {iv.mode === 'Online' ? 'Online' : iv.room || 'room TBA'}</td>
                <td className="py-2.5">
                  <div className="flex flex-wrap gap-2 items-center">
                    {iv.no_show ? (
                      <>
                        <span className="font-medium">No-show</span>
                        <button className="link small" onClick={() => patch(iv, { no_show: false })}>Undo</button>
                      </>
                    ) : iv.done ? (
                      <>
                        <span className="font-medium">Done</span>
                        <button className="link small" onClick={() => patch(iv, { done: false })}>Undo</button>
                      </>
                    ) : (
                      <>
                        {iv.checked_in_at ? (
                          <span className="small font-medium bg-green-soft px-2 py-1">In at {formatTime(iv.checked_in_at)}</span>
                        ) : (
                          <button className="btn btn-ink !min-h-[36px] !px-3" onClick={() => patch(iv, { checked_in_at: new Date().toISOString() })}>Check in</button>
                        )}
                        <button className="btn btn-quiet !min-h-[36px] !px-3" onClick={() => patch(iv, { done: true })}>Done</button>
                        <button className="btn btn-quiet !min-h-[36px] !px-3" onClick={() => patch(iv, { no_show: true })}>No-show</button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
