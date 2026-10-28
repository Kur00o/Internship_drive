import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Masthead, SiteFooter } from '../components/Brand';
import { trackApplication } from '../lib/api';
import { formatDateTime, formatTime, studentStatus } from '../lib/format';
import { useDocumentTitle, usePublicData } from '../lib/hooks';
import type { TrackResult } from '../lib/types';

const TONE: Record<string, string> = {
  good: 'bg-green text-ink',
  bad: 'bg-mist-deep text-ink',
  wait: 'bg-saffron-soft text-ink',
  neutral: 'bg-mist text-ink',
};

export default function TrackPage() {
  useDocumentTitle('Track my application · Internship Drive 2026');
  const { data } = usePublicData();
  const [form, setForm] = useState({ prn: '', email: '', phone: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<TrackResult | null>(null);
  const [checked, setChecked] = useState(false);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const r = await trackApplication(form.prn.trim(), form.email.trim(), form.phone.trim());
      setResult(r);
      setChecked(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Masthead compact />
      <header className="bg-ink text-paper frame pt-12 pb-14 md:pt-16 md:pb-20">
        <h1 className="display" style={{ fontSize: 'clamp(2.75rem, 8vw, 7rem)' }}>
          Your status
        </h1>
        <p className="lead mt-6 max-w-[46ch]">See each role you applied for, where it stands, and your interview slot once it is set.</p>
      </header>
      <main className="bg-paper frame py-14 md:py-20 min-h-[50svh]">
        <div className="grid lg:grid-cols-12 gap-x-6 gap-y-12">
          <form onSubmit={lookup} className="lg:col-span-4 grid gap-5 content-start" aria-describedby="track-help">
            <p id="track-help">Enter the PRN, email and mobile number exactly as you gave them in your application.</p>
            <div>
              <label htmlFor="t_prn" className="label">PRN</label>
              <input id="t_prn" className="field" value={form.prn} onChange={(e) => setForm({ ...form, prn: e.target.value })} inputMode="numeric" required />
            </div>
            <div>
              <label htmlFor="t_email" className="label">Email</label>
              <input id="t_email" type="email" className="field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required autoComplete="email" />
            </div>
            <div>
              <label htmlFor="t_phone" className="label">Mobile</label>
              <input id="t_phone" type="tel" className="field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required autoComplete="tel" />
            </div>
            <button className="btn btn-ink" disabled={busy}>
              {busy ? 'Checking…' : 'Show my status'}
            </button>
            {error && <p role="alert" className="error-text">{error}</p>}
          </form>

          <section className="lg:col-span-7 lg:col-start-6" aria-live="polite">
            {!checked && (
              <div className="bg-mist p-6 md:p-8">
                <h2 className="font-bold text-[1.5rem]">What the statuses mean</h2>
                <ul className="mt-4 grid gap-2">
                  <li><b>Received</b>: the team is checking eligibility.</li>
                  <li><b>Shared with the company</b>: you passed screening.</li>
                  <li><b>Interview scheduled</b>: your slot and room appear here.</li>
                  <li><b>Selected</b>: accept or decline within 48 hours.</li>
                </ul>
                <p className="mt-5">
                  Not applied yet? <Link to="/apply" className="link font-medium">Apply here</Link>.
                </p>
              </div>
            )}
            {checked && !result && (
              <div className="bg-saffron-soft p-6 md:p-8">
                <h2 className="font-bold text-[1.5rem]">No application matches those details.</h2>
                <p className="mt-3">Check for typos in the PRN, email or mobile. If it still does not match, message the team on WhatsApp.</p>
                {data?.settings.whatsapp_url && (
                  <a href={data.settings.whatsapp_url} className="btn btn-ink mt-5" target="_blank" rel="noreferrer">
                    WhatsApp the team
                  </a>
                )}
              </div>
            )}
            {result && (
              <div>
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h2 className="font-bold" style={{ fontSize: 'clamp(1.75rem, 2.6vw, 2.5rem)' }}>{result.full_name}</h2>
                  <p className="num font-bold">{result.student_code}</p>
                </div>
                <p className="small text-ink-soft mt-1">Applied {formatDateTime(result.submitted_at)}</p>
                <ol className="mt-8 grid gap-4">
                  {result.applications.map((a) => {
                    const s = studentStatus(a.status);
                    return (
                      <li key={a.app_code} className="bg-mist">
                        <div className="p-5 md:p-6 grid sm:grid-cols-[1fr_auto] gap-4 items-start">
                          <div>
                            <p className="small font-medium">Choice {a.preference} · {a.app_code}</p>
                            <p className="font-bold text-[1.25rem] leading-snug mt-1">{a.role_title}</p>
                            <p>{a.company}</p>
                          </div>
                          <p className={`px-3 py-1.5 font-bold ${TONE[s.tone]}`}>{s.label}</p>
                        </div>
                        {s.note && <p className="px-5 md:px-6 pb-5 -mt-1">{s.note}</p>}
                        {a.interviews.map((iv) => (
                          <div key={iv.interview_code} className="bg-ink text-paper p-5 md:p-6 grid sm:grid-cols-3 gap-4">
                            <div>
                              <p className="small text-paper/75">Interview</p>
                              <p className="font-bold text-[1.25rem]">{formatDateTime(iv.starts_at)}</p>
                              <p className="small">until {formatTime(iv.ends_at)} · {iv.interview_code}</p>
                            </div>
                            <div>
                              <p className="small text-paper/75">Report by</p>
                              <p className="font-bold text-[1.25rem]">{iv.reporting_at ? formatTime(iv.reporting_at) : formatTime(new Date(new Date(iv.starts_at).getTime() - 30 * 60000).toISOString())}</p>
                            </div>
                            <div>
                              <p className="small text-paper/75">{iv.mode === 'Online' ? 'Online' : 'Room'}</p>
                              {iv.mode === 'Online' && iv.meet_url ? (
                                <a href={iv.meet_url} className="font-bold text-[1.25rem] text-saffron link" target="_blank" rel="noreferrer">Join the call</a>
                              ) : (
                                <p className="font-bold text-[1.25rem]">{iv.room || 'To be announced'}</p>
                              )}
                              {iv.panel && <p className="small">Panel {iv.panel}</p>}
                            </div>
                          </div>
                        ))}
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
