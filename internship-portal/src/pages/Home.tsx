import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CiiLogo, Masthead, MitWpuLogo, YiLogo } from '../components/Brand';
import ChapterBar from '../components/ChapterBar';
import { publicCounts } from '../lib/api';
import { FAQ, PHOTO_CREDITS, PROGRAMMES, TRACK_BLURB, TRACK_COLOURS, roleIsOpenTo } from '../lib/content';
import { formatClock, formatDay, plural } from '../lib/format';
import { useDocumentTitle, usePublicData, useReveal } from '../lib/hooks';
import { TRACKS, type Company, type DriveSession, type PublicData, type Role } from '../lib/types';

const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
const word = (n: number) => NUMBER_WORDS[n] ?? String(n);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function Home() {
  useDocumentTitle('Internship Drive 2026 · Young Indians MIT-WPU');
  const { data, error, retry } = usePublicData();
  const ref = useReveal<HTMLDivElement>([Boolean(data)]);

  useEffect(() => {
    document.documentElement.classList.add('js');
    if (location.hash) {
      const el = document.querySelector(location.hash);
      if (el) setTimeout(() => el.scrollIntoView(), 60);
    }
  }, [data]);

  return (
    <div ref={ref}>
      <ChapterBar />
      <Masthead />
      <Hero data={data} />
      {error && !data ? (
        <section className="frame py-24 bg-paper">
          <h2 className="head">The roles did not load.</h2>
          <p className="mt-4 max-w-xl">{error}</p>
          <button className="btn btn-ink mt-6" onClick={retry}>
            Try again
          </button>
        </section>
      ) : (
        <>
          <Roles data={data} />
          <Places data={data} />
          <HowItWorks />
          <Days data={data} />
          <Faq />
          <About data={data} />
          <Cta />
          <HomeFooter data={data} />
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ hero */
function Hero({ data }: { data: PublicData | null }) {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    publicCounts()
      .then((c) => setCount(c.applicants))
      .catch(() => setCount(null));
  }, []);
  const openRoles = data?.roles.filter((r) => r.is_open).length ?? 14;
  const companies = data ? new Set(data.roles.map((r) => r.company_code)).size : 7;
  const closes = data?.settings.applications_close_at;

  return (
    <section data-hero data-chapter="ink" className="bg-ink text-paper frame flex flex-col justify-between" style={{ minHeight: 'calc(100svh - 88px)' }}>
      <div className="pt-[9svh] md:pt-[11svh]">
        <h1 className="display" style={{ fontSize: 'clamp(3.5rem, 13.6vw, 14rem)' }}>
          <span className="block rise">Internship</span>
          <span className="block text-saffron rise" style={{ ['--d' as string]: '90ms' }}>
            Drive 2026
          </span>
        </h1>
        <p className="lead font-medium mt-8 md:mt-10 rise" style={{ ['--d' as string]: '180ms' }}>
          Interviews on campus · Mon 2 &amp; Tue 3 November · MIT-WPU, Pune
        </p>
      </div>
      <div className="grid md:grid-cols-12 gap-6 pb-10 pt-12">
        <div className="md:col-span-5 lg:col-span-4 md:col-start-8 lg:col-start-9 rise" style={{ ['--d' as string]: '260ms' }}>
          <p>
            {cap(word(openRoles))} roles from {word(companies)} Pune companies across tech, finance, business, HR, psychology and media. One form, up to three roles, interviews only.
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 mt-6">
            <Link to="/apply" className="btn btn-saffron">
              Apply now
            </Link>
            <a href="#roles" className="link font-medium">
              See the roles
            </a>
          </div>
          <p className="small mt-5 font-medium text-paper/85">
            {count && count > 0 ? `${plural(count, 'student')} applied so far. ` : ''}
            {closes
              ? `Applications close ${new Date(closes).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}.`
              : 'Interview timings will be announced in the WhatsApp group.'}
          </p>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ roles */
function Roles({ data }: { data: PublicData | null }) {
  const [programme, setProgramme] = useState('');
  const [track, setTrack] = useState<string>('');
  const companies = useMemo(() => new Map((data?.companies ?? []).map((c) => [c.code, c])), [data]);
  const roles = data?.roles ?? [];
  const openToYou = roles.filter((r) => roleIsOpenTo(r, programme));
  const pending = (data?.companies ?? []).filter((c) => c.jd_status === 'pending');
  const tracks = TRACKS.filter((t) => roles.some((r) => r.track === t));
  const shown = track ? tracks.filter((t) => t === track) : tracks;

  return (
    <section id="roles" data-chapter="paper" className="bg-paper frame py-24 md:py-36 scroll-mt-14">
      <div className="grid md:grid-cols-12 gap-x-6 gap-y-8 items-end">
        <div className="md:col-span-7">
          <h2 className="head rise">{cap(word(roles.length || 14))} roles. Pick up to three.</h2>
          <p className="lead mt-6 max-w-[34ch] rise" style={{ ['--d' as string]: '80ms' }}>
            Every role here comes from a company’s own job description. Open one to read it in full.
          </p>
        </div>
        <div className="md:col-span-5 rise" style={{ ['--d' as string]: '140ms' }}>
          <label htmlFor="programme" className="label">
            I study
          </label>
          <select id="programme" className="field" value={programme} onChange={(e) => setProgramme(e.target.value)}>
            <option value="">Any programme: show all roles</option>
            {PROGRAMMES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <p className="mt-3 font-medium" aria-live="polite">
            {programme
              ? `${plural(openToYou.length, 'role')} list ${programme} students or any degree. The rest are dimmed.`
              : `${plural(roles.length, 'role')} across ${plural(tracks.length, 'track')}.`}
          </p>
        </div>
      </div>

      <nav aria-label="Tracks" className="md:sticky md:top-14 z-10 -mx-[var(--margin)] px-[var(--margin)] bg-paper mt-14 py-3 flex flex-wrap gap-x-6 gap-y-2">
        <button className={`font-medium min-h-[40px] ${track === '' ? 'underline underline-offset-8 decoration-[3px] decoration-saffron' : 'hover:underline underline-offset-8 decoration-2'}`} onClick={() => setTrack('')}>
          All
        </button>
        {tracks.map((t) => (
          <button
            key={t}
            className={`font-medium min-h-[40px] whitespace-nowrap ${track === t ? 'underline underline-offset-8 decoration-[3px] decoration-saffron' : 'hover:underline underline-offset-8 decoration-2'}`}
            onClick={() => setTrack(track === t ? '' : t)}
          >
            {t} <span className="num text-ink-soft">{roles.filter((r) => r.track === t).length}</span>
          </button>
        ))}
      </nav>

      {!data && <p className="mt-16 lead">Loading roles…</p>}

      {shown.map((t) => {
        const list = roles.filter((r) => r.track === t);
        return (
          <div key={t} className="mt-24">
            <div className="grid md:grid-cols-2 gap-x-16 gap-y-2 items-baseline mb-10">
              <h3 className="font-bold leading-none tracking-tight" style={{ fontSize: 'clamp(2rem, 3.4vw, 3.125rem)' }}>
                {t}
              </h3>
              <p className="flex items-baseline justify-between gap-4">
                <span>{TRACK_BLURB[t]}</span>
                <span className="num font-medium shrink-0">{plural(list.length, 'role')}</span>
              </p>
            </div>
            <ul className="grid md:grid-cols-2 gap-x-16 gap-y-10">
              {list.map((r, i) => (
                <RoleItem key={r.code} role={r} company={companies.get(r.company_code)} dim={!roleIsOpenTo(r, programme)} programme={programme} delay={i * 60} />
              ))}
            </ul>
          </div>
        );
      })}

      {pending.length > 0 && (
        <p className="mt-20 lead max-w-[46ch]">
          Job descriptions are still to come from {pending.map((c) => c.name).join(' and ')}. Their roles will appear here when they arrive.
        </p>
      )}
    </section>
  );
}

function RoleItem({ role, company, dim, programme, delay }: { role: Role; company?: Company; dim: boolean; programme: string; delay: number }) {
  const colour = TRACK_COLOURS[role.track];
  const [co, suffix] = role.code.split('-');
  return (
    <li className="rise" style={{ ['--d' as string]: `${delay}ms`, opacity: dim ? 0.42 : 1, transition: 'opacity 240ms ease' }}>
      <Link to={`/roles/${role.code}`} className="group grid grid-cols-[52px_1fr] md:grid-cols-[64px_1fr] gap-5 items-start">
        <span
          aria-hidden="true"
          className="aspect-square flex flex-col items-center justify-center font-bold leading-none transition-transform duration-200 group-hover:-translate-y-0.5"
          style={{ background: colour.bg, color: colour.ink }}
        >
          <span className="small">{co}</span>
          <span className="small mt-0.5 font-medium">{suffix}</span>
        </span>
        <span className="min-w-0">
          <span className="flex items-baseline justify-between gap-4">
            <span className="font-bold leading-snug group-hover:underline underline-offset-4 decoration-2 decoration-saffron">{role.title}</span>
            <span className="num shrink-0 font-medium">{shortStipend(role.stipend)}</span>
          </span>
          <span className="block font-medium mt-0.5">{company?.name ?? role.company_code}</span>
          <span className="block mt-1.5 max-w-[46ch]">{role.summary}</span>
          <span className="block small mt-2 text-ink-soft">
            {role.work_mode} · {role.location} · {role.duration}
          </span>
          {(role.challenge || role.needs_portfolio || !role.is_open || (dim && programme)) && (
            <span className="block small mt-1 font-medium text-green-deep">
              {!role.is_open
                ? 'Applications closed for this role'
                : dim && programme
                  ? `Not listed for ${programme}`
                  : [role.challenge && 'Task with application', role.needs_portfolio && 'Portfolio or GitHub needed'].filter(Boolean).join(' · ')}
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}

function shortStipend(s: string) {
  if (/to be confirmed/i.test(s)) return 'Stipend TBC';
  if (/competitive/i.test(s)) return 'Competitive';
  return s.replace(' / month', '/mo');
}

/* ------------------------------------------------------------------ places */
const PLACES = [
  {
    name: 'Baner',
    codes: ['CFO', 'DQR'],
    note: 'Work from office',
    img: '/images/baner.jpg',
    w: 1095,
    h: 730,
    alt: 'Housing towers and open ground in Baner, Pune, seen from the Baner–Pashan hill',
  },
  {
    name: 'Hinjewadi Phase 2',
    codes: ['PAR'],
    note: 'In office six days a week',
    img: '/images/hinjewadi.jpg',
    w: 1350,
    h: 900,
    alt: 'An office building with a curved roof and a garden in Hinjewadi, Pune',
  },
  {
    name: 'Bhosari',
    codes: ['INT'],
    note: 'Hybrid, three days a week in office',
    img: '/images/bhosari.jpg',
    w: 1400,
    h: 933,
    alt: 'Buses at the Bhosari bus terminal under the flyover',
  },
];

function Places({ data }: { data: PublicData | null }) {
  const roles = data?.roles ?? [];
  const companies = new Map((data?.companies ?? []).map((c) => [c.code, c]));
  return (
    <section data-chapter="saffron" className="bg-saffron text-ink frame py-24 md:py-36">
      <div className="grid md:grid-cols-12 gap-x-6 gap-y-6 items-end">
        <h2 className="head md:col-span-7 rise">Where you would work</h2>
        <p className="lead md:col-span-5 rise" style={{ ['--d' as string]: '80ms' }}>
          Most offices sit in three corners of Pune. Check the commute before you rank your three roles.
        </p>
      </div>
      <div className="mt-16 md:mt-24 grid gap-16 md:gap-24">
        {PLACES.map((p, i) => {
          const here = roles.filter((r) => p.codes.includes(r.company_code));
          return (
            <article key={p.name} className="grid md:grid-cols-12 gap-x-6 gap-y-6 items-center">
              <img
                src={p.img}
                alt={p.alt}
                width={p.w}
                height={p.h}
                loading="lazy"
                className={`w-full aspect-[3/2] object-cover md:col-span-7 rise ${i % 2 ? 'md:order-2 md:col-start-6' : ''}`}
              />
              <div className={`md:col-span-5 rise ${i % 2 ? 'md:order-1 md:col-start-1 md:row-start-1' : ''}`} style={{ ['--d' as string]: '90ms' }}>
                <h3 className="font-bold leading-none tracking-tight" style={{ fontSize: 'clamp(2rem, 3.4vw, 3.125rem)' }}>
                  {p.name}
                </h3>
                <p className="mt-3 font-medium">{p.note}</p>
                <ul className="mt-6 grid gap-3">
                  {here.map((r) => (
                    <li key={r.code}>
                      <Link to={`/roles/${r.code}`} className="group">
                        <span className="font-bold group-hover:underline underline-offset-4 decoration-2">{r.title}</span>
                        <span className="block">{companies.get(r.company_code)?.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          );
        })}
      </div>
      <p className="mt-20 md:mt-28 lead max-w-[52ch] rise">
        Adviter, Bottomline and Studio Coriander are in Pune too; their exact offices will be confirmed. Adviter and Bottomline are hybrid with three office days a week.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ days */
function Days({ data }: { data: PublicData | null }) {
  const days = data?.settings.drive_days ?? ['2026-11-02', '2026-11-03'];
  const companies = new Map((data?.companies ?? []).map((c) => [c.code, c]));
  const sessions = data?.sessions ?? [];
  return (
    <section id="schedule" data-chapter="green" className="bg-green text-ink frame py-24 md:py-36 scroll-mt-14">
      <div className="grid md:grid-cols-12 gap-x-6 gap-y-12">
        <div className="md:col-span-6">
          <h2 className="head rise">Two days on campus</h2>
          <p className="lead mt-6 max-w-[34ch] rise" style={{ ['--d' as string]: '80ms' }}>
            {data?.settings.timings_note || 'Timings to be announced'}. Each company interviews on one or both days; your own slot shows on the Track page.
          </p>
          <div className="mt-12 grid sm:grid-cols-2 gap-x-6 gap-y-10">
            {days.map((d, i) => (
              <DayColumn key={d} day={d} sessions={sessions.filter((s) => s.day === d)} companies={companies} delay={i * 90} />
            ))}
          </div>
          <div className="mt-12 rise">
            <h3 className="lead font-bold">Bring on the day</h3>
            <ul className="mt-3 grid gap-1.5">
              <li>Your college ID card</li>
              <li>Two printed copies of your resume</li>
              <li>Arrive 30 minutes before your first slot</li>
            </ul>
            <Link to="/schedule" className="btn btn-ink mt-8">
              Full schedule
            </Link>
          </div>
        </div>
        <figure className="md:col-span-6 rise" style={{ ['--d' as string]: '120ms' }}>
          <img src="/images/mitwpu-campus.jpg" alt="MIT-WPU campus buildings among trees, seen from Vetal Hill" width={1200} height={800} loading="lazy" className="w-full aspect-[4/5] md:aspect-[3/4] object-cover" />
          <figcaption className="mt-4 font-medium">
            MIT-WPU, Kothrud, from Vetal Hill. {data?.settings.venue || 'Rooms to be announced'}.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

function DayColumn({ day, sessions, companies, delay }: { day: string; sessions: DriveSession[]; companies: Map<string, Company>; delay: number }) {
  return (
    <div className="rise" style={{ ['--d' as string]: `${delay}ms` }}>
      <p className="display" style={{ fontSize: 'clamp(2.25rem, 4.2vw, 4rem)' }}>
        {formatDay(day, { weekday: 'short' }).split(' ')[0].replace(',', '')}
        <span className="block">{formatDay(day, { weekday: undefined })}</span>
      </p>
      {sessions.length ? (
        <ul className="mt-5 grid gap-3">
          {sessions.map((s) => (
            <li key={s.id}>
              <span className="block font-bold">{companies.get(s.company_code)?.short_name ?? s.company_code}</span>
              <span className="block small">
                {s.starts_at ? `${formatClock(s.starts_at)}${s.ends_at ? ` – ${formatClock(s.ends_at)}` : ''}` : 'Time to be announced'}
                {s.venue ? ` · ${s.venue}` : ''}
                {s.mode !== 'On campus' ? ` · ${s.mode}` : ''}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 font-medium">Company line-up to be announced</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ how it works */
const STAGES = [
  {
    name: 'Apply',
    body: 'One form: your details, up to three ranked roles, your resume as a PDF and any task a role asks for. Your application IDs appear the moment you submit.',
    bg: '#a8470b',
    ink: 'var(--color-paper)',
  },
  {
    name: 'Screening',
    body: 'The Yi team checks each application against the role’s eligibility. Companies then shortlist from the students shared with them.',
    bg: '#cf5f15',
    ink: 'var(--color-paper)',
  },
  {
    name: 'Interview day',
    body: 'Interviews only, on 2 and 3 November at MIT-WPU. Your slot, room and reporting time show on the Track page and are shared in the WhatsApp group.',
    bg: 'var(--color-saffron)',
    ink: 'var(--color-ink)',
  },
  {
    name: 'Result',
    body: 'Companies confirm their selections. Accept or decline within 48 hours; accepting one offer withdraws your other applications in the drive.',
    bg: '#f9b27c',
    ink: 'var(--color-ink)',
  },
];

function HowItWorks() {
  const [open, setOpen] = useState(0);
  return (
    <section data-chapter="paper" className="bg-paper frame py-24 md:py-36">
      <div className="grid md:grid-cols-12 gap-x-6 gap-y-6">
        <h2 className="head md:col-span-5 rise">From form to offer</h2>
        <p className="lead md:col-span-5 md:col-start-7 rise" style={{ ['--d' as string]: '80ms' }}>
          Four steps, and you always know which one you are on. The Track page shows the status of each role you chose.
        </p>
      </div>
      <ol className="mt-16 flex flex-col md:flex-row md:h-[520px] rise" style={{ ['--d' as string]: '140ms' }}>
        {STAGES.map((s, i) => {
          const isOpen = open === i;
          return (
            <li
              key={s.name}
              className="relative overflow-hidden md:min-w-[64px]"
              style={{
                background: s.bg,
                color: s.ink,
                flexBasis: isOpen ? '58%' : '14%',
                flexGrow: isOpen ? 1 : 0,
                transition: 'flex-basis 450ms var(--ease-out)',
              }}
            >
              <button
                className="w-full h-full text-left p-6 md:p-8 flex flex-col"
                aria-expanded={isOpen}
                onClick={() => setOpen(i)}
                onFocus={() => setOpen(i)}
              >
                {isOpen ? (
                  <>
                    <span className="font-bold leading-none tracking-tight" style={{ fontSize: 'clamp(2rem, 3.4vw, 3.125rem)' }}>{s.name}</span>
                    <span className="block mt-4 md:mt-auto max-w-[36ch]">{s.body}</span>
                  </>
                ) : (
                  <span className="lead font-bold md:mt-auto md:[writing-mode:vertical-rl] md:rotate-180">{s.name}</span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/* ------------------------------------------------------------------ faq */
function Faq() {
  return (
    <section id="faq" data-chapter="ink" className="bg-ink text-paper frame py-24 md:py-36">
      <div className="grid md:grid-cols-12 gap-x-6 gap-y-10">
        <div className="md:col-span-4">
          <h2 className="head md:sticky md:top-24 rise">Questions, answered</h2>
        </div>
        <div className="md:col-span-8 grid gap-2">
          {FAQ.map((f, i) => (
            <details key={f.q} name="faq" className="faq-tile rise" style={{ ['--d' as string]: `${Math.min(i, 5) * 50}ms` }} open={i === 0}>
              <summary>
                <span>{f.q}</span>
                <span className="plus" aria-hidden="true" />
              </summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ about */
function About({ data }: { data: PublicData | null }) {
  const wa = data?.settings.whatsapp_url || 'https://chat.whatsapp.com/ILP99hC5UXC6dDzbtQXCy5';
  const n = data?.roles.length ?? 14;
  const c = data ? new Set(data.roles.map((r) => r.company_code)).size : 7;
  return (
    <section data-chapter="paper" className="bg-paper frame py-24 md:py-32">
      <h2 className="head rise">Run by students, for students</h2>
      <div className="statement mt-12 rise" style={{ ['--d' as string]: '80ms' }}>
        <p>
          <mark className="hl-saffron">Young Indians (Yi)</mark> is part of the <mark className="hl-green">Confederation of Indian Industry</mark>, a movement for young Indians to converge, lead, co-create and influence the country’s future. Its{' '}
          <mark className="hl-soft">MIT-WPU student chapter</mark> runs this drive so that a student from any school, engineering or design or commerce, can reach Pune’s companies through one form instead of a dozen inboxes. {cap(word(c))} companies have shared{' '}
          <mark className="hl-green">{word(n)} roles</mark>, from React and NestJS internships in <mark className="hl-mist">Bhosari</mark> to financial analysis in <mark className="hl-mist">Baner</mark> and a 100-day creator mission. The team checks every application against its job description, passes it to the company, and runs the interviews on campus on{' '}
          <mark className="hl-saffron">2 and 3 November</mark>.{' '}
          <a href={wa} target="_blank" rel="noreferrer" className="hl-final">
            Questions? Ask the team on WhatsApp.
          </a>
        </p>
      </div>
      <div className="mt-16 flex flex-wrap items-center gap-x-12 gap-y-8 rise" style={{ ['--d' as string]: '140ms' }}>
        <YiLogo className="h-24 w-auto" />
        <CiiLogo className="h-14 w-auto" />
        <MitWpuLogo className="h-20 w-auto" />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ cta */
function Cta() {
  return (
    <section data-chapter="saffron" aria-labelledby="cta-word">
      <Link to="/apply" className="cta-band frame">
        <span className="flex items-start justify-between gap-6 pt-8">
          <span className="lead font-medium max-w-[30ch]">One form, up to three roles. Keep your resume PDF ready; it takes about ten minutes.</span>
          <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true" className="shrink-0">
            <path d="M12 36L36 12M16 12h20v20" stroke="currentColor" strokeWidth="4" fill="none" />
          </svg>
        </span>
        <span id="cta-word" className="cta-word display">
          Apply
        </span>
      </Link>
    </section>
  );
}

/* ------------------------------------------------------------------ footer */
function HomeFooter({ data }: { data: PublicData | null }) {
  const wa = data?.settings.whatsapp_url || 'https://chat.whatsapp.com/ILP99hC5UXC6dDzbtQXCy5';
  return (
    <footer data-chapter="ink" className="bg-ink text-paper frame flex flex-col" style={{ minHeight: '90svh' }}>
      <div className="flex flex-wrap items-start justify-between gap-6 pt-10">
        <div className="grid gap-1 max-w-[60ch]">
          <p className="font-medium">Young Indians · MIT-WPU Student Chapter</p>
          <p>Internship Drive 2026 · interviews on 2 and 3 November at MIT-WPU, Pune</p>
          {data?.settings.contact_email && <p>{data.settings.contact_email}</p>}
          {data?.settings.contact_phone && <p>{data.settings.contact_phone}</p>}
        </div>
        <a href="#top" onClick={(e) => (e.preventDefault(), window.scrollTo({ top: 0 }))} className="link font-medium">
          Back to top
        </a>
      </div>
      <div className="mt-auto pt-24">
        <a href={wa} target="_blank" rel="noreferrer" className="footer-line display block">
          Ask us on WhatsApp
        </a>
        <div className="grid md:grid-cols-3 gap-4 py-8 mt-10 small">
          <nav className="flex flex-wrap gap-x-5 gap-y-1" aria-label="Footer">
            <Link to="/track" className="link">Track my application</Link>
            <Link to="/schedule" className="link">Schedule</Link>
            <Link to="/organiser" className="link">Organisers</Link>
            <Link to="/company" className="link">Companies</Link>
          </nav>
          <details className="md:text-center">
            <summary className="cursor-pointer underline underline-offset-4">Photo credits</summary>
            <ul className="mt-3 grid gap-1.5 text-left">
              {PHOTO_CREDITS.map((p) => (
                <li key={p.file}>
                  <a href={p.source} target="_blank" rel="noreferrer" className="link">
                    {p.title}
                  </a>{' '}
                  by {p.author},{' '}
                  <a href={p.licenceUrl} target="_blank" rel="noreferrer" className="link">
                    {p.licence}
                  </a>
                  , via Wikimedia Commons, cropped and colour-adjusted.
                </li>
              ))}
            </ul>
          </details>
          <p className="md:text-right">Pune · 2026</p>
        </div>
      </div>
    </footer>
  );
}
