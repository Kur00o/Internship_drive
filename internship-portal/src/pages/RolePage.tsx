import { Link, useParams } from 'react-router-dom';
import { Masthead, SiteFooter } from '../components/Brand';
import { TRACK_COLOURS } from '../lib/content';
import { useDocumentTitle, usePublicData } from '../lib/hooks';

export default function RolePage() {
  const { code = '' } = useParams();
  const { data, error } = usePublicData();
  const role = data?.roles.find((r) => r.code === code.toUpperCase());
  const company = data?.companies.find((c) => c.code === role?.company_code);
  useDocumentTitle(role ? `${role.title} · ${company?.short_name ?? ''} · Internship Drive 2026` : 'Role · Internship Drive 2026');

  if (error) return <Shell><p className="lead">{error}</p></Shell>;
  if (!data) return <Shell><p className="lead">Loading the role…</p></Shell>;
  if (!role) {
    return (
      <Shell>
        <h1 className="head">No role with the code {code}.</h1>
        <Link to="/#roles" className="btn btn-ink mt-8">
          See all roles
        </Link>
      </Shell>
    );
  }

  const colour = TRACK_COLOURS[role.track];
  const siblings = data.roles.filter((r) => r.company_code === role.company_code && r.code !== role.code);
  const facts: [string, string][] = [
    ['Stipend', role.stipend],
    ['Duration', role.duration],
    ['Work mode', role.work_mode],
    ['Location', role.location],
    ['Openings', 'TBD'],
    ['Joining', role.joining || data.settings.joining],
    ['Selection', `${data.settings.selection_process} · about ${role.interview_minutes} min`],
  ];

  return (
    <>
      <Masthead compact />
      <header className="frame pt-10 pb-14 md:pt-14 md:pb-20" style={{ background: colour.bg, color: colour.ink }}>
        <Link to="/#roles" className="link font-medium">
          All roles
        </Link>
        <p className="mt-10 font-medium">
          {role.code} · {role.track}
        </p>
        <h1 className="font-bold tracking-tight mt-3 max-w-[22ch] md:max-w-none" style={{ fontSize: 'clamp(2.25rem, 4.6vw, 4.5rem)', lineHeight: 1 }}>
          {role.title}
        </h1>
        <p className="lead mt-5 font-medium">{company?.name}</p>
        <p className="lead mt-3 max-w-[48ch]">{role.summary}</p>
      </header>

      <main className="bg-paper frame py-14 md:py-20">
        <dl className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-x-6 gap-y-6">
          {facts.map(([k, v]) => (
            <div key={k} className="bg-mist p-4">
              <dt className="small text-ink-soft">{k}</dt>
              <dd className="font-medium mt-1 leading-snug">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="grid lg:grid-cols-12 gap-x-6 gap-y-14 mt-16">
          <article className="lg:col-span-7 grid gap-12">
            {(company?.about || role.about) && (
              <Block title={`About ${company?.short_name ?? 'the company'}`}>
                <p>{company?.about || role.about}</p>
                {company?.website && (
                  <p className="mt-3">
                    <a href={company.website} target="_blank" rel="noreferrer" className="link">
                      {company.website.replace(/^https?:\/\//, '')}
                    </a>
                  </p>
                )}
              </Block>
            )}
            <Block title="What you will do">
              <List items={role.responsibilities} />
            </Block>
            <Block title="What they look for">
              <List items={role.requirements} />
            </Block>
            {role.good_to_have.length > 0 && (
              <Block title="Good to have">
                <List items={role.good_to_have} />
              </Block>
            )}
            {role.perks.length > 0 && (
              <Block title="What you get">
                <List items={role.perks} />
              </Block>
            )}
          </article>

          <aside className="lg:col-span-4 lg:col-start-9">
            <div className="lg:sticky lg:top-6 grid gap-8">
              <div className="bg-ink text-paper p-6">
                <p className="font-bold text-[1.375rem] leading-tight">Apply with this role first</p>
                <p className="mt-2 text-paper/85">You can add two more roles in the same form.</p>
                {role.is_open && data.settings.applications_open ? (
                  <Link to={`/apply?role=${role.code}`} className="btn btn-saffron mt-5 w-full">
                    Apply for {role.code}
                  </Link>
                ) : (
                  <p className="mt-5 font-medium text-saffron">Applications for this role are closed.</p>
                )}
              </div>
              <div>
                <h2 className="font-bold text-[1.25rem]">Who can apply</h2>
                <p className="mt-2">{role.eligibility}</p>
              </div>
              {role.challenge && (
                <div className="bg-saffron-soft p-6">
                  <h2 className="font-bold text-[1.25rem]">Task to send with your application</h2>
                  <p className="mt-2">{role.challenge}</p>
                  {role.challenge_materials_url && (
                    <p className="mt-3">
                      <a href={role.challenge_materials_url} target="_blank" rel="noreferrer" className="link font-medium">
                        Materials for the task
                      </a>
                    </p>
                  )}
                  <p className="small mt-3">Paste your answer or a link (Drive, Behance, YouTube) in the form.</p>
                </div>
              )}
              {role.needs_portfolio && (
                <p className="font-medium">A portfolio or GitHub link is needed: {role.portfolio_hint}.</p>
              )}
              {role.tags.length > 0 && (
                <div>
                  <h2 className="font-bold text-[1.25rem]">Skills</h2>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {role.tags.map((t) => (
                      <li key={t} className="bg-mist px-3 py-1.5 small font-medium">
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="grid gap-2">
                {role.jd_url && (
                  <a href={role.jd_url} target="_blank" rel="noreferrer" className="link font-medium">
                    Original job description (Google Drive)
                  </a>
                )}
                {company?.jd_folder_url && (
                  <a href={company.jd_folder_url} target="_blank" rel="noreferrer" className="link">
                    All {company.short_name} files
                  </a>
                )}
              </div>
            </div>
          </aside>
        </div>

        {siblings.length > 0 && (
          <section className="mt-24">
            <h2 className="head">More at {company?.short_name}</h2>
            <ul className="mt-8 grid md:grid-cols-2 gap-x-16 gap-y-6">
              {siblings.map((r) => (
                <li key={r.code}>
                  <Link to={`/roles/${r.code}`} className="group block">
                    <span className="font-bold text-[1.125rem] group-hover:underline underline-offset-4 decoration-2 decoration-saffron">{r.title}</span>
                    <span className="block mt-1">{r.summary}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Masthead compact />
      <main className="frame py-24 min-h-[60svh]">{children}</main>
      <SiteFooter />
    </>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-bold tracking-tight" style={{ fontSize: 'clamp(1.5rem, 2.2vw, 2rem)' }}>
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-3">
      {items.map((t) => (
        <li key={t} className="grid grid-cols-[14px_1fr] gap-4 items-baseline">
          <span aria-hidden="true" className="w-2.5 h-2.5 bg-saffron translate-y-[-1px]" />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}
