import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { YiLogo } from '../components/Brand';
import Linkified from '../components/Linkified';
import { companyResumeUrl, loadCompanyPortal, setCompanyDecision } from '../lib/api';
import { downloadCsv, formatDateTime, formatDay, formatTime, isoToIstDate, plural } from '../lib/format';
import { useDocumentTitle } from '../lib/hooks';
import type { PortalApplication, PortalData } from '../lib/types';

const AFTER_INTERVIEW = ['Interviewed', 'No-show', 'Selected', 'Waitlisted', 'Not Selected', 'Offer Accepted', 'Offer Declined'];

type View = 'all' | 'review' | 'shortlisted' | 'interviews' | 'decided';

export default function CompanyPortal() {
  const { token = '' } = useParams();
  const [data, setData] = useState<PortalData | null>(null);
  const [error, setError] = useState('');
  const [role, setRole] = useState('');
  const [view, setView] = useState<View>('all');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  useDocumentTitle(data ? `${data.company.short_name} · applicants · Internship Drive 2026` : 'Company dashboard · Internship Drive 2026');

  const load = useCallback(() => {
    loadCompanyPortal(token)
      .then((d) => (setData(d), setError('')))
      .catch((e: Error) => setError(e.message));
  }, [token]);
  useEffect(load, [load]);

  const apps = useMemo(() => data?.applications ?? [], [data]);
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return apps.filter((a) => {
      if (role && a.role_code !== role) return false;
      if (term && !`${a.student.full_name} ${a.student.programme} ${a.student.specialisation} ${a.app_code}`.toLowerCase().includes(term)) return false;
      switch (view) {
        case 'review':
          return !a.company_decision && !AFTER_INTERVIEW.includes(a.status);
        case 'shortlisted':
          return a.company_decision === 'Shortlisted' || a.status === 'Interview Scheduled';
        case 'interviews':
          return a.interviews.length > 0;
        case 'decided':
          return ['Selected', 'Waitlisted', 'Not Selected', 'Rejected', 'Next Round'].includes(a.company_decision || '');
        default:
          return true;
      }
    });
  }, [apps, role, view, q]);

  const patchApp = (id: string, patch: Partial<PortalApplication>) =>
    setData((d) => (d ? { ...d, applications: d.applications.map((a) => (a.id === id ? { ...a, ...patch } : a)) } : d));

  if (error && !data) {
    return (
      <main className="frame py-24 min-h-svh bg-paper">
        <YiLogo className="h-14 w-auto" />
        <h1 className="head mt-10">This link does not open a dashboard.</h1>
        <p className="lead mt-4 max-w-[50ch]">{error}</p>
      </main>
    );
  }
  if (!data) return <main className="frame py-24 lead">Loading your applicants…</main>;

  const interviews = apps
    .flatMap((a) => a.interviews.map((iv) => ({ ...iv, app: a })))
    .sort((x, y) => x.starts_at.localeCompare(y.starts_at));

  const exportCsv = () =>
    downloadCsv(`${data.company.short_name}-applicants-yi-drive-2026.csv`, [
      ['Application ID', 'Name', 'Programme', 'Specialisation', 'Year', 'Graduation', 'CGPA', 'Role', 'Preference', 'Status', 'Your decision', 'Rating', 'Comment', 'Portfolio', 'LinkedIn', 'Office availability', 'Available from', 'Why fit', 'Task', 'Email', 'Phone', 'Interview'],
      ...filtered.map((a) => [
        a.app_code,
        a.student.full_name,
        a.student.programme,
        a.student.specialisation,
        a.student.year_of_study,
        a.student.graduation_year,
        a.student.cgpa,
        a.role_code,
        a.preference,
        a.status,
        a.company_decision,
        a.company_rating,
        a.company_comment,
        a.student.portfolio_url,
        a.student.linkedin_url,
        a.student.office_availability,
        a.student.available_from,
        a.why_fit,
        a.challenge_response,
        a.student.email,
        a.student.phone,
        a.interviews[0] ? formatDateTime(a.interviews[0].starts_at) : '',
      ]),
    ]);

  const count = (fn: (a: PortalApplication) => boolean) => apps.filter(fn).length;

  return (
    <div className="min-h-svh bg-paper">
      <header className="bg-ink text-paper frame py-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="bg-paper p-1.5">
            <YiLogo className="h-10 w-auto" />
          </span>
          <div>
            <p className="font-bold text-[1.25rem] leading-tight">{data.company.name}</p>
            <p className="small text-paper/80">
              {data.settings.drive_name} · {data.settings.drive_days.map((d) => formatDay(d)).join(' & ')}
            </p>
          </div>
        </div>
        <p className="small text-paper/80 max-w-[44ch]">Private link for your team. Please don’t forward it outside the people interviewing.</p>
      </header>

      <main className="frame py-8 md:py-10">
        <h1 className="sr-only">Applicants for {data.company.name}</h1>
        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-6" aria-label="Summary">
          <Kpi label="Applicants" value={apps.length} />
          <Kpi label="Waiting for your review" value={count((a) => !a.company_decision && !AFTER_INTERVIEW.includes(a.status))} />
          <Kpi label="Shortlisted" value={count((a) => a.company_decision === 'Shortlisted' || a.status === 'Interview Scheduled')} />
          <Kpi label="Interviews scheduled" value={interviews.length} />
        </section>

        <section className="mt-10 grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="c_role" className="label small">Role</label>
                <select id="c_role" className="field min-w-[16rem]" value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="">All roles ({apps.length})</option>
                  {data.roles.map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.title} ({apps.filter((a) => a.role_code === r.code).length})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-[12rem]">
                <label htmlFor="c_q" className="label small">Search</label>
                <input id="c_q" className="field" placeholder="Name, programme or APP-ID" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <button className="btn btn-quiet" onClick={exportCsv}>
                Download CSV
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-4" role="tablist" aria-label="Filter">
              {(
                [
                  ['all', 'All'],
                  ['review', 'To review'],
                  ['shortlisted', 'Shortlisted'],
                  ['interviews', 'With interview'],
                  ['decided', 'Decided'],
                ] as [View, string][]
              ).map(([k, label]) => (
                <button key={k} role="tab" aria-selected={view === k} className={`px-3 py-1.5 font-medium ${view === k ? 'bg-ink text-paper' : 'bg-mist hover:bg-mist-deep'}`} onClick={() => setView(k)}>
                  {label}
                </button>
              ))}
            </div>

            <ul className="mt-6 grid gap-2">
              {filtered.length === 0 && <li className="bg-mist p-6">No applicants in this view yet.</li>}
              {filtered.map((a) => (
                <ApplicantRow key={a.id} app={a} token={token} open={openId === a.id} onToggle={() => setOpenId(openId === a.id ? null : a.id)} onSaved={(p) => patchApp(a.id, p)} roleTitle={data.roles.find((r) => r.code === a.role_code)?.title ?? a.role_code} />
              ))}
            </ul>
          </div>

          <aside className="lg:col-span-4 grid gap-6 content-start">
            <div className="bg-mist p-5">
              <h2 className="font-bold text-[1.25rem]">Your interview days</h2>
              {data.sessions.length ? (
                <ul className="mt-3 grid gap-2">
                  {data.sessions.map((s) => (
                    <li key={s.id}>
                      <span className="font-medium">{formatDay(s.day)}</span> · {s.starts_at ? s.starts_at.slice(0, 5) : 'time TBA'}
                      {s.ends_at ? `–${s.ends_at.slice(0, 5)}` : ''} · {s.venue || 'room TBA'} · {plural(s.panels, 'panel')}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2">{data.settings.timings_note || 'Timings to be announced'}. The Yi team will confirm your slot.</p>
              )}
            </div>
            <div className="bg-mist p-5">
              <h2 className="font-bold text-[1.25rem]">Interview list</h2>
              {interviews.length ? (
                <ol className="mt-3 grid gap-2">
                  {interviews.map((iv) => (
                    <li key={iv.interview_code} className="grid grid-cols-[4.5rem_1fr] gap-3">
                      <span className="num font-medium">{formatTime(iv.starts_at)}</span>
                      <span>
                        <span className="font-medium">{iv.app.student.full_name}</span>
                        <span className="block small">
                          {formatDay(isoToIstDate(iv.starts_at))} · {iv.app.role_code} · {iv.mode === 'Online' ? 'Online' : iv.room || 'room TBA'}
                          {iv.checked_in_at ? ' · checked in' : ''}
                          {iv.done ? ' · done' : ''}
                          {iv.no_show ? ' · no-show' : ''}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-2">Shortlist applicants and the Yi team will schedule their interviews.</p>
              )}
            </div>
            <div className="p-5 bg-saffron-soft">
              <h2 className="font-bold text-[1.25rem]">How decisions work</h2>
              <p className="mt-2">
                Before interviews, mark each applicant <b>Shortlist</b> or <b>Not shortlisted</b>. After the interview, choose <b>Selected</b>, <b>Waitlist</b>, <b>Not selected</b> or <b>Next round</b>. Students see a plain status only after the Yi team shares results.
              </p>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="small text-ink-soft">{label}</p>
      <p className="num font-bold text-[2.5rem] leading-none mt-1">{value}</p>
    </div>
  );
}

function ApplicantRow({
  app,
  token,
  open,
  onToggle,
  onSaved,
  roleTitle,
}: {
  app: PortalApplication;
  token: string;
  open: boolean;
  onToggle: () => void;
  onSaved: (p: Partial<PortalApplication>) => void;
  roleTitle: string;
}) {
  const [rating, setRating] = useState<number | null>(app.company_rating);
  const [comment, setComment] = useState(app.company_comment ?? '');
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const after = AFTER_INTERVIEW.includes(app.status);
  const s = app.student;

  async function decide(decision: string | null) {
    setBusy(decision ?? 'save');
    setErr('');
    try {
      const r = await setCompanyDecision(token, app.id, decision ?? app.company_decision, rating, comment);
      onSaved({ status: r.status as PortalApplication['status'], company_decision: r.company_decision as PortalApplication['company_decision'], company_rating: r.company_rating, company_comment: r.company_comment });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy('');
    }
  }

  const decisions = after
    ? [
        ['Selected', 'Selected'],
        ['Waitlisted', 'Waitlist'],
        ['Not Selected', 'Not selected'],
        ['Next Round', 'Next round'],
      ]
    : [
        ['Shortlisted', 'Shortlist'],
        ['Rejected', 'Not shortlisted'],
      ];

  return (
    <li className="bg-mist">
      <button className="w-full text-left p-4 md:p-5 grid md:grid-cols-[1fr_auto] gap-3 items-center hover:bg-mist-deep transition-colors" aria-expanded={open} onClick={onToggle}>
        <span className="min-w-0">
          <span className="font-bold text-[1.125rem]">{s.full_name}</span>
          <span className="block small">
            {s.programme} · {s.specialisation} · {s.year_of_study} · CGPA {s.cgpa ?? '—'} · {app.role_code} (choice {app.preference})
          </span>
        </span>
        <span className="flex flex-wrap gap-2 small font-medium">
          <span className="bg-paper px-2.5 py-1">{app.status}</span>
          {app.company_decision && <span className={`px-2.5 py-1 ${['Shortlisted', 'Selected', 'Next Round'].includes(app.company_decision) ? 'bg-green' : app.company_decision === 'Waitlisted' ? 'bg-saffron-soft' : 'bg-mist-deep'}`}>You: {app.company_decision}</span>}
        </span>
      </button>
      {open && (
        <div className="px-4 md:px-5 pb-5 grid lg:grid-cols-2 gap-6 bg-paper/60 pt-4">
          <div className="grid gap-4">
            <Info label="Role">{roleTitle}</Info>
            <Info label="Why they fit">{app.why_fit || '—'}</Info>
            {app.challenge_response && (
              <Info label="Application task">
                <Linkified text={app.challenge_response} />
              </Info>
            )}
            <Info label="Background">
              {s.school}; graduating {s.graduation_year}
              {s.professional_courses.length ? `; ${s.professional_courses.join(', ')}` : ''}
              {s.prior_experience ? `. Prior: ${s.prior_experience}` : ''}
            </Info>
            <Info label="Availability">
              From {s.available_from ?? '—'} · office: {s.office_availability ?? '—'} · interviews: {s.interview_availability.join(', ') || '—'}
            </Info>
            <div className="flex flex-wrap gap-3">
              {s.has_resume && (
                <a className="btn btn-ink" href={companyResumeUrl(token, app.id)} target="_blank" rel="noreferrer">
                  Open resume
                </a>
              )}
              {s.portfolio_url && (
                <a className="btn btn-quiet" href={s.portfolio_url} target="_blank" rel="noreferrer">
                  Portfolio / GitHub
                </a>
              )}
              {s.linkedin_url && (
                <a className="btn btn-quiet" href={s.linkedin_url} target="_blank" rel="noreferrer">
                  LinkedIn
                </a>
              )}
            </div>
            {(s.email || s.phone) && (
              <Info label="Contact (shortlisted)">
                {s.email} · {s.phone}
              </Info>
            )}
            {app.interviews.map((iv) => (
              <Info key={iv.interview_code} label={`Interview ${iv.interview_code}`}>
                {formatDateTime(iv.starts_at)}–{formatTime(iv.ends_at)} · {iv.mode === 'Online' ? iv.meet_url || 'online' : iv.room || 'room TBA'}
                {iv.panel ? ` · panel ${iv.panel}` : ''}
              </Info>
            ))}
          </div>
          <div className="grid gap-4 content-start">
            <p className="font-bold">Your decision</p>
            <div className="flex flex-wrap gap-2">
              {decisions.map(([value, label]) => (
                <button
                  key={value}
                  className={`btn ${app.company_decision === value ? 'btn-ink' : 'btn-paper'}`}
                  disabled={Boolean(busy)}
                  onClick={() => decide(value)}
                >
                  {busy === value ? 'Saving…' : label}
                </button>
              ))}
            </div>
            <fieldset>
              <legend className="label">Rating</legend>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" aria-pressed={rating === n} className={`size-11 font-bold ${rating === n ? 'bg-saffron' : 'bg-paper hover:bg-mist-deep'}`} onClick={() => setRating(rating === n ? null : n)}>
                    {n}
                  </button>
                ))}
              </div>
            </fieldset>
            <div>
              <label htmlFor={`cm_${app.id}`} className="label">Comment for the Yi team</label>
              <textarea id={`cm_${app.id}`} className="field" rows={3} maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} />
            </div>
            <button className="btn btn-quiet justify-self-start" disabled={Boolean(busy)} onClick={() => decide(null)}>
              {busy === 'save' ? 'Saving…' : 'Save rating and comment'}
            </button>
            {err && <p className="error-text">{err}</p>}
          </div>
        </div>
      )}
    </li>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="small text-ink-soft">{label}</p>
      <div className="mt-0.5 whitespace-pre-wrap break-words">{children}</div>
    </div>
  );
}
