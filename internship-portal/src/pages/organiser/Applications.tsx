import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Linkified from '../../components/Linkified';
import { createInterviews, loadStatusLog, resumeSignedUrl, updateApplication, updateInterview } from '../../lib/api';
import { downloadCsv, formatDateTime, formatTime, istToIso } from '../../lib/format';
import { REASON_CODES, STATUSES, TRACKS, type Application, type StatusLogEntry } from '../../lib/types';
import { useStore } from './store';

export default function Applications() {
  const { apps, pub, roleBy, companyBy, setApps, reload } = useStore();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [bulkStatus, setBulkStatus] = useState('Eligible');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 30;

  const role = params.get('role') ?? '';
  const status = params.get('status') ?? '';
  const company = params.get('company') ?? '';
  const track = params.get('track') ?? '';
  const sort = params.get('sort') ?? 'newest';
  const setParam = (k: string, v: string) => {
    const p = new URLSearchParams(params);
    if (v) p.set(k, v);
    else p.delete(k);
    setParams(p, { replace: true });
  };

  useEffect(() => {
    setPage(1);
  }, [q, role, status, company, track, sort]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const filtered = apps.filter((a) => {
      const r = roleBy.get(a.role_code);
      if (role && a.role_code !== role) return false;
      if (status && a.status !== status) return false;
      if (company && r?.company_code !== company) return false;
      if (track && r?.track !== track) return false;
      if (term) {
        const hay = `${a.app_code} ${a.applicant?.student_code} ${a.applicant?.full_name} ${a.applicant?.prn} ${a.applicant?.email} ${a.applicant?.phone}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });

    return filtered.sort((a, b) => {
      const tA = new Date(a.created_at).getTime();
      const tB = new Date(b.created_at).getTime();
      return sort === 'oldest' ? tA - tB : tB - tA;
    });
  }, [apps, roleBy, role, status, company, track, q, sort]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIdx = rows.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE;
  const endIdx = Math.min(startIdx + PAGE_SIZE, rows.length);
  const pagedRows = rows.slice(startIdx, endIdx);

  const open = apps.find((a) => a.id === openId) ?? null;
  const allChecked = pagedRows.length > 0 && pagedRows.every((r) => selected.has(r.id));

  async function applyBulk() {
    if (!selected.size) return;
    setBusy(true);
    setMsg('');
    try {
      for (const id of selected) await updateApplication(id, { status: bulkStatus as Application['status'] });
      setApps((list) => list.map((a) => (selected.has(a.id) ? { ...a, status: bulkStatus as Application['status'] } : a)));
      setMsg(`${selected.size} updated to ${bulkStatus}.`);
      setSelected(new Set());
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function exportRows(list: Application[], name: string, forCompany = false) {
    const head = forCompany
      ? ['Application ID', 'Name', 'Programme', 'Specialisation', 'Year', 'CGPA', 'Role Code', 'Preference Rank', 'Portfolio link', 'Why-fit answer', 'Task', 'Office availability', 'Status', 'Company Decision', 'Interview Required (Y/N)', 'Comments']
      : ['Application ID', 'Student ID', 'PRN', 'Name', 'Email', 'Phone', 'School', 'Programme', 'Specialisation', 'Year', 'Graduation', 'CGPA', 'Professional', 'Role Code', 'Company', 'Preference', 'Status', 'Reason', 'Company decision', 'Rating', 'Company comment', 'Remarks', 'Portfolio', 'LinkedIn', 'Available from', 'Office availability', 'Interview availability', 'Why fit', 'Task', 'Submitted', 'Interview'];
    downloadCsv(
      name,
      [
        head,
        ...list.map((a) => {
          const s = a.applicant;
          const r = roleBy.get(a.role_code);
          const iv = a.interviews.find((i) => !i.cancelled);
          return forCompany
            ? [a.app_code, s.full_name, s.programme, s.specialisation, s.year_of_study, s.cgpa, a.role_code, a.preference, s.portfolio_url, a.why_fit, a.challenge_response, s.office_availability, a.status, a.company_decision ?? '', '', a.company_comment ?? '']
            : [a.app_code, s.student_code, s.prn, s.full_name, s.email, s.phone, s.school, s.programme, s.specialisation, s.year_of_study, s.graduation_year, s.cgpa, s.professional_courses.join(' '), a.role_code, companyBy.get(r?.company_code ?? '')?.name, a.preference, a.status, a.reason_code, a.company_decision, a.company_rating, a.company_comment, a.remarks, s.portfolio_url, s.linkedin_url, s.available_from, s.office_availability, s.interview_availability.join('; '), a.why_fit, a.challenge_response, formatDateTime(a.created_at), iv ? formatDateTime(iv.starts_at) : ''];
        }),
      ],
    );
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[14rem] flex-1">
          <label htmlFor="a_q" className="label small">Search</label>
          <input id="a_q" className="field" placeholder="Name, PRN, email, phone, APP- or STU- ID" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Filter id="a_track" label="Track" value={track} onChange={(v) => setParam('track', v)} options={TRACKS.map((t) => [t, t])} />
        <Filter id="a_company" label="Company" value={company} onChange={(v) => setParam('company', v)} options={(pub?.companies ?? []).filter((c) => c.jd_status === 'published').map((c) => [c.code, c.short_name])} />
        <Filter id="a_role" label="Role" value={role} onChange={(v) => setParam('role', v)} options={(pub?.roles ?? []).map((r) => [r.code, `${r.code} · ${r.title}`])} />
        <Filter id="a_status" label="Status" value={status} onChange={(v) => setParam('status', v)} options={STATUSES.map((s) => [s, `${s} (${apps.filter((a) => a.status === s).length})`])} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-medium num">
            {rows.length === 0
              ? '0 applications'
              : `Showing ${startIdx + 1}–${endIdx} of ${rows.length} applications`}
            {rows.length !== apps.length && <span className="text-ink-soft"> (filtered from {apps.length})</span>}
          </p>
          <div className="flex items-center gap-2 border-l border-mist-deep pl-3">
            <label htmlFor="a_sort_inline" className="small text-ink-soft">Sort:</label>
            <select
              id="a_sort_inline"
              className="field !min-h-[34px] !py-1 !px-2.5 w-auto text-sm"
              value={sort}
              onChange={(e) => setParam('sort', e.target.value)}
            >
              <option value="newest">Newest first (latest)</option>
              <option value="oldest">Oldest first (earliest)</option>
            </select>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-1.5 small font-medium border-l border-mist-deep pl-3">
              <button
                className="btn btn-quiet !min-h-[32px] !py-1 !px-2.5 disabled:opacity-30"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ← Prev
              </button>
              <span className="num px-1.5">
                Page {safePage} of {totalPages}
              </span>
              <button
                className="btn btn-quiet !min-h-[32px] !py-1 !px-2.5 disabled:opacity-30"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next →
              </button>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selected.size > 0 && (
            <>
              <span className="small">{selected.size} selected → </span>
              <select className="field !min-h-[40px] !py-1.5 w-auto" value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)} aria-label="New status for selected">
                {STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <button className="btn btn-ink !min-h-[40px]" onClick={applyBulk} disabled={busy}>
                {busy ? 'Saving…' : 'Set status'}
              </button>
            </>
          )}
          <button className="btn btn-quiet !min-h-[40px]" onClick={() => exportRows(rows, 'yi-drive-applications.csv')}>
            Export CSV
          </button>
          {company && (
            <button className="btn btn-quiet !min-h-[40px]" onClick={() => exportRows(rows, `${companyBy.get(company)?.short_name}-Applicants-MIT-WPU-Drive-2026.csv`, true)}>
              Company export
            </button>
          )}
        </div>
      </div>
      {msg && <p className="font-medium">{msg}</p>}

      <div className="grid xl:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] gap-6 items-start">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead className="small text-ink-soft">
              <tr>
                <th className="py-2 pr-2 w-8">
                  <input type="checkbox" aria-label="Select all shown on this page" checked={allChecked} onChange={(e) => {
                  const s = new Set(selected);
                  if (e.target.checked) pagedRows.forEach((r) => s.add(r.id));
                  else pagedRows.forEach((r) => s.delete(r.id));
                  setSelected(s);
                }} />
                </th>
                <th className="py-2 pr-3 font-medium">Application</th>
                <th className="py-2 pr-3 font-medium">Student</th>
                <th className="py-2 pr-3 font-medium">Programme</th>
                <th className="py-2 pr-3 font-medium">Role</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 font-medium">Company</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-ink-soft">No applications match these filters.</td>
                </tr>
              )}
              {pagedRows.map((a) => {
                const r = roleBy.get(a.role_code);
                const comp = companyBy.get(r?.company_code ?? '');
                const compName = comp?.short_name ?? comp?.name ?? r?.company_code ?? '—';
                return (
                  <tr key={a.id} className={`border-t border-mist-deep cursor-pointer ${openId === a.id ? 'bg-saffron-soft' : 'hover:bg-mist'}`} onClick={() => setOpenId(a.id)}>
                    <td className="py-2.5 pr-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`Select ${a.app_code}`}
                        checked={selected.has(a.id)}
                        onChange={(e) => {
                          const s = new Set(selected);
                          if (e.target.checked) s.add(a.id);
                          else s.delete(a.id);
                          setSelected(s);
                        }}
                      />
                    </td>
                    <td className="py-2.5 pr-3 num small">
                      <button className="font-medium hover:underline" onClick={() => setOpenId(a.id)}>
                        {a.app_code}
                      </button>
                      <span className="block text-ink-soft">{formatDateTime(a.created_at)}</span>
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className="font-medium">{a.applicant?.full_name}</span>
                      <span className="block small text-ink-soft num">{a.applicant?.prn}</span>
                    </td>
                    <td className="py-2.5 pr-3 small">
                      {a.applicant?.programme} · {a.applicant?.specialisation}
                      <span className="block text-ink-soft">{a.applicant?.year_of_study} · CGPA {a.applicant?.cgpa ?? '—'}</span>
                    </td>
                    <td className="py-2.5 pr-3 small">
                      <span className="font-medium">{a.role_code}</span> · choice {a.preference}
                      {r?.title && <span className="block text-ink-soft">{r.title}</span>}
                    </td>
                    <td className="py-2.5 pr-3 small">
                      <StatusPill status={a.status} />
                      {a.reason_code && <span className="block text-ink-soft">{a.reason_code}</span>}
                    </td>
                    <td className="py-2.5 small">
                      <span className="font-medium">{compName}</span>
                      {a.company_decision && (
                        <span className="block text-ink-soft">{a.company_decision}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between py-4 border-t border-mist-deep small font-medium">
              <span className="text-ink-soft num">
                Showing {startIdx + 1}–{endIdx} of {rows.length} applications
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  className="btn btn-quiet !min-h-[32px] !py-1 !px-3 disabled:opacity-30"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  ← Prev
                </button>
                <span className="num px-2">
                  Page {safePage} of {totalPages}
                </span>
                <button
                  className="btn btn-quiet !min-h-[32px] !py-1 !px-3 disabled:opacity-30"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
        {open ? <Detail key={open.id} app={open} onClose={() => setOpenId(null)} onChanged={reload} /> : <p className="bg-mist p-6 hidden xl:block">Pick an application to see the student, the resume, the task and the interview slot.</p>}
      </div>
    </div>
  );
}

function Filter({ id, label, value, onChange, options }: { id: string; label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div>
      <label htmlFor={id} className="label small">{label}</label>
      <select id={id} className="field min-w-[10rem] max-w-[18rem]" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">All</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const good = ['Eligible', 'Interview Scheduled', 'Interviewed', 'Selected', 'Offer Accepted', 'Assignment Submitted'];
  const bad = ['Not Eligible', 'Rejected (Company Screen)', 'Not Selected', 'No-show', 'Withdrawn', 'Duplicate', 'Assignment Not Submitted', 'Offer Declined'];
  const cls = status === 'Applied' ? 'bg-saffron-soft' : good.includes(status) ? 'bg-green-soft' : bad.includes(status) ? 'bg-mist-deep' : 'bg-mist';
  return <span className={`inline-block px-2 py-0.5 font-medium ${cls}`}>{status}</span>;
}

function Detail({ app, onClose, onChanged }: { app: Application; onClose: () => void; onChanged: () => Promise<void> }) {
  const { roleBy, companyBy, pub, setApps, apps } = useStore();
  const role = roleBy.get(app.role_code);
  const s = app.applicant;
  const [status, setStatus] = useState(app.status);
  const [reason, setReason] = useState(app.reason_code ?? '');
  const [remarks, setRemarks] = useState(app.remarks ?? '');
  const [log, setLog] = useState<StatusLogEntry[]>([]);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const days = pub?.settings.drive_days ?? ['2026-11-02', '2026-11-03'];
  const [iv, setIv] = useState({ day: days[0], time: '10:00', minutes: String(role?.interview_minutes ?? 15), panel: `${role?.company_code ?? ''}-P1`, mode: 'Campus', room: '', meet: '' });

  useEffect(() => {
    loadStatusLog(app.id).then(setLog).catch(() => setLog([]));
  }, [app.id, app.status]);

  async function save() {
    setBusy('save');
    setErr('');
    try {
      await updateApplication(app.id, { status, reason_code: status === 'Not Eligible' ? reason || 'E7' : null, remarks: remarks || null });
      setApps((list) => list.map((a) => (a.id === app.id ? { ...a, status, reason_code: status === 'Not Eligible' ? reason || 'E7' : null, remarks } : a)));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy('');
    }
  }

  async function openResume() {
    try {
      const url = await resumeSignedUrl(s.resume_path);
      window.open(url, '_blank', 'noopener');
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  async function schedule() {
    setBusy('iv');
    setErr('');
    try {
      const start = istToIso(iv.day, iv.time);
      const end = new Date(new Date(start).getTime() + Number(iv.minutes) * 60000).toISOString();
      const clash = findClash(app, start, end);
      if (clash) throw new Error(clash);
      await createInterviews([
        {
          application_id: app.id,
          starts_at: start,
          ends_at: end,
          reporting_at: new Date(new Date(start).getTime() - 30 * 60000).toISOString(),
          panel: iv.panel || null,
          mode: iv.mode as 'Campus' | 'Online',
          room: iv.mode === 'Campus' ? iv.room || null : null,
          meet_url: iv.mode === 'Online' ? iv.meet || null : null,
        },
      ]);
      await onChanged();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy('');
    }
  }

  function findClash(a: Application, start: string, end: string) {
    const mine = apps.filter((x) => x.applicant_id === a.applicant_id).flatMap((x) => x.interviews.filter((i) => !i.cancelled));
    const s0 = new Date(start).getTime();
    const e0 = new Date(end).getTime();
    const gap = 30 * 60000;
    const hit = mine.find((i) => s0 < new Date(i.ends_at).getTime() + gap && e0 + gap > new Date(i.starts_at).getTime());
    return hit ? `Clashes with ${hit.interview_code} at ${formatTime(hit.starts_at)} (students need 30 minutes between interviews).` : '';
  }

  return (
    <aside className="bg-mist p-5 grid gap-6 xl:sticky xl:top-4 xl:max-h-[calc(100svh-2rem)] xl:overflow-y-auto" aria-label={`Application ${app.app_code}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="small num text-ink-soft">{app.app_code} · {s.student_code} · PRN {s.prn}</p>
          <h2 className="font-bold text-[1.5rem] leading-tight mt-1">{s.full_name}</h2>
          <p className="small mt-1">
            <a className="link" href={`mailto:${s.email}`}>{s.email}</a> · <a className="link" href={`tel:${s.phone}`}>{s.phone}</a>
          </p>
        </div>
        <button className="btn btn-paper !min-h-[40px]" onClick={onClose}>Close</button>
      </div>

      <div className="grid gap-3">
        <Row label="Role">{role?.title} · {companyBy.get(role?.company_code ?? '')?.short_name} · choice {app.preference}</Row>
        <Row label="Programme">{s.programme} · {s.specialisation} · {s.year_of_study} · graduating {s.graduation_year} · CGPA {s.cgpa ?? '—'}{s.professional_courses.length ? ` · ${s.professional_courses.join(', ')}` : ''}</Row>
        <Row label="School">{s.school}</Row>
        <Row label="Availability">From {s.available_from ?? '—'} · {s.office_availability}</Row>
        {s.prior_experience && <Row label="Prior experience">{s.prior_experience}</Row>}
        <Row label="Why they fit">{app.why_fit || <span className="text-ink-soft">Answered on their first choice</span>}</Row>
        {app.challenge_response && (
          <Row label="Application task">
            <Linkified text={app.challenge_response} />
          </Row>
        )}
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-ink !min-h-[40px]" onClick={openResume}>Open resume</button>
          {s.portfolio_url && <a className="btn btn-paper !min-h-[40px]" href={s.portfolio_url} target="_blank" rel="noreferrer">Portfolio</a>}
          {s.linkedin_url && <a className="btn btn-paper !min-h-[40px]" href={s.linkedin_url} target="_blank" rel="noreferrer">LinkedIn</a>}
        </div>
      </div>

      <section className="grid gap-3">
        <h3 className="font-bold">Status</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <select className="field" value={status} onChange={(e) => setStatus(e.target.value as Application['status'])} aria-label="Status">
            {STATUSES.map((x) => <option key={x}>{x}</option>)}
          </select>
          {status === 'Not Eligible' && (
            <select className="field" value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Reason code">
              <option value="">Reason…</option>
              {Object.entries(REASON_CODES).map(([k, v]) => (
                <option key={k} value={k}>{k} · {v}</option>
              ))}
            </select>
          )}
        </div>
        <textarea className="field !min-h-[4.5rem]" rows={2} placeholder="Remark for the log (who, why)" value={remarks} onChange={(e) => setRemarks(e.target.value)} aria-label="Remarks" />
        <button className="btn btn-ink justify-self-start !min-h-[40px]" onClick={save} disabled={busy === 'save'}>
          {busy === 'save' ? 'Saving…' : 'Save status'}
        </button>
        {(app.company_decision || app.company_rating || app.company_comment) && (
          <p className="small bg-paper p-3">
            Company: <b>{app.company_decision ?? 'no decision'}</b>
            {app.company_rating ? ` · rating ${app.company_rating}/5` : ''}
            {app.company_comment ? ` · “${app.company_comment}”` : ''}
          </p>
        )}
      </section>

      <section className="grid gap-3">
        <h3 className="font-bold">Interview</h3>
        {app.interviews.filter((i) => !i.cancelled).map((i) => (
          <div key={i.id} className="bg-paper p-3 small grid gap-1">
            <p className="font-medium">{i.interview_code} · {formatDateTime(i.starts_at)}–{formatTime(i.ends_at)}</p>
            <p>{i.mode === 'Online' ? i.meet_url || 'Online' : i.room || 'Room TBA'}{i.panel ? ` · ${i.panel}` : ''}</p>
            <button
              className="link justify-self-start"
              onClick={async () => {
                await updateInterview(i.id, { cancelled: true });
                await onChanged();
              }}
            >
              Cancel this slot
            </button>
          </div>
        ))}
        <div className="grid grid-cols-2 gap-2">
          <select className="field" value={iv.day} onChange={(e) => setIv({ ...iv, day: e.target.value })} aria-label="Day">
            {days.map((d) => <option key={d} value={d}>{new Date(`${d}T12:00:00+05:30`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</option>)}
          </select>
          <input className="field" type="time" value={iv.time} onChange={(e) => setIv({ ...iv, time: e.target.value })} aria-label="Start time (IST)" />
          <input className="field" type="number" min={5} max={120} value={iv.minutes} onChange={(e) => setIv({ ...iv, minutes: e.target.value })} aria-label="Minutes" />
          <input className="field" value={iv.panel} onChange={(e) => setIv({ ...iv, panel: e.target.value })} placeholder="Panel, e.g. DQR-P1" aria-label="Panel" />
          <select className="field" value={iv.mode} onChange={(e) => setIv({ ...iv, mode: e.target.value })} aria-label="Mode">
            <option>Campus</option>
            <option>Online</option>
          </select>
          {iv.mode === 'Campus' ? (
            <input className="field" value={iv.room} onChange={(e) => setIv({ ...iv, room: e.target.value })} placeholder="Room, e.g. R-05" aria-label="Room" />
          ) : (
            <input className="field" value={iv.meet} onChange={(e) => setIv({ ...iv, meet: e.target.value })} placeholder="Meet link" aria-label="Meet link" />
          )}
        </div>
        <button className="btn btn-quiet justify-self-start !min-h-[40px] bg-paper" onClick={schedule} disabled={busy === 'iv'}>
          {busy === 'iv' ? 'Scheduling…' : 'Add interview slot'}
        </button>
      </section>

      {err && <p role="alert" className="error-text">{err}</p>}

      <section>
        <h3 className="font-bold">History</h3>
        <ol className="mt-2 grid gap-1.5 small">
          {log.map((l) => (
            <li key={l.id}>
              <span className="num text-ink-soft">{formatDateTime(l.changed_at)}</span> · {l.from_status ? `${l.from_status} → ` : ''}<b>{l.to_status}</b> · {l.changed_by}
              {l.note ? ` · ${l.note}` : ''}
            </li>
          ))}
        </ol>
      </section>
    </aside>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="small text-ink-soft">{label}</p>
      <div className="whitespace-pre-wrap break-words">{children}</div>
    </div>
  );
}
