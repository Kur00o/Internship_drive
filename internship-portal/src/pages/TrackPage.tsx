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
  const wa = data?.settings.whatsapp_url || 'https://chat.whatsapp.com/ILP99hC5UXC6dDzbtQXCy5';

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
              <div className="grid gap-6">
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

                <div className="bg-green text-ink p-6 md:p-8">
                  <h2 className="font-bold text-[1.5rem]">Join the WhatsApp group</h2>
                  <p className="mt-3">
                    Interview timings, room allocations, reporting reminders, and all drive announcements are shared in the official student community.
                  </p>
                  <a
                    href={wa}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-ink mt-5 inline-flex items-center gap-2.5"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    <span>Join WhatsApp group</span>
                  </a>
                </div>
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
