import { Link } from 'react-router-dom';
import { Masthead, SiteFooter } from '../components/Brand';
import { formatClock, formatDay } from '../lib/format';
import { useDocumentTitle, usePublicData } from '../lib/hooks';

export default function SchedulePage() {
  useDocumentTitle('Schedule · Internship Drive 2026');
  const { data, error } = usePublicData();
  const days = data?.settings.drive_days ?? ['2026-11-02', '2026-11-03'];
  const companies = new Map((data?.companies ?? []).map((c) => [c.code, c]));
  const roles = data?.roles ?? [];

  return (
    <>
      <Masthead compact />
      <header className="bg-green frame pt-12 pb-14 md:pt-16 md:pb-20">
        <h1 className="display" style={{ fontSize: 'clamp(2.75rem, 8vw, 7rem)' }}>
          Schedule
        </h1>
        <p className="lead mt-6 max-w-[46ch]">
          Which company interviews when, and where. {data?.settings.timings_note || 'Timings to be announced'}; this page updates as each company confirms.
        </p>
      </header>
      <main className="bg-paper frame py-14 md:py-20">
        {error && <p className="lead">{error}</p>}
        <div className="grid lg:grid-cols-2 gap-x-6 gap-y-16">
          {days.map((d) => {
            const sessions = (data?.sessions ?? []).filter((s) => s.day === d);
            return (
              <section key={d}>
                <h2 className="display" style={{ fontSize: 'clamp(2.5rem, 5vw, 4.5rem)' }}>
                  {formatDay(d, { weekday: 'long', day: 'numeric', month: 'long' })}
                </h2>
                {sessions.length === 0 ? (
                  <p className="lead mt-6">Company line-up to be announced.</p>
                ) : (
                  <ul className="mt-8 grid gap-3">
                    {sessions.map((s) => {
                      const c = companies.get(s.company_code);
                      const rs = roles.filter((r) => r.company_code === s.company_code);
                      return (
                        <li key={s.id} className="bg-mist p-5 grid sm:grid-cols-[9rem_1fr] gap-4">
                          <p className="num font-bold text-[1.25rem]">
                            {s.starts_at ? formatClock(s.starts_at) : 'Time TBA'}
                            {s.ends_at && <span className="block small font-medium">to {formatClock(s.ends_at)}</span>}
                          </p>
                          <div>
                            <p className="font-bold text-[1.25rem]">{c?.name ?? s.company_code}</p>
                            <p className="mt-1">{rs.map((r) => r.title).join(' · ')}</p>
                            <p className="small mt-2 text-ink-soft">
                              {s.mode}
                              {s.venue ? ` · ${s.venue}` : ' · room to be announced'}
                              {s.note ? ` · ${s.note}` : ''}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
        <section className="mt-20 grid md:grid-cols-12 gap-6 bg-ink text-paper p-6 md:p-10">
          <h2 className="font-bold md:col-span-4" style={{ fontSize: 'clamp(1.75rem, 2.6vw, 2.5rem)', lineHeight: 1.05 }}>
            Your own slot
          </h2>
          <div className="md:col-span-8">
            <p className="lead">Once the team schedules your interview, the time, room and reporting time appear on your Track page.</p>
            <ul className="mt-5 grid gap-1.5">
              <li>Report 30 minutes before your first slot.</li>
              <li>Carry your college ID and two printed copies of your resume.</li>
              <li>Can’t make it? Tell the team on WhatsApp at least three hours before.</li>
            </ul>
            <Link to="/track" className="btn btn-saffron mt-8">
              Track my application
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
