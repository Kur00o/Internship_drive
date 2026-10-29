import { Link } from 'react-router-dom';
import { formatDateTime } from '../../lib/format';
import { TRACKS } from '../../lib/types';
import { useStore } from './store';

const PIPE = {
  screening: ['Applied'],
  shared: ['Eligible', 'Assignment Sent', 'Assignment Submitted'],
  interview: ['Interview Scheduled', 'Interviewed'],
  selected: ['Selected', 'Offer Accepted'],
  out: ['Not Eligible', 'Rejected (Company Screen)', 'Not Selected', 'No-show', 'Withdrawn', 'Duplicate', 'Offer Declined', 'Assignment Not Submitted', 'Waitlisted'],
};

export default function Overview() {
  const { apps, pub, companyBy } = useStore();
  const students = new Set(apps.map((a) => a.applicant_id)).size;
  const n = (statuses: string[]) => apps.filter((a) => statuses.includes(a.status)).length;
  const roles = pub?.roles ?? [];
  const maxApps = Math.max(1, ...roles.map((r) => apps.filter((a) => a.role_code === r.code).length));
  const recent = apps.slice(0, 8);

  const bySchool = Object.entries(
    apps.reduce<Record<string, Set<string>>>((m, a) => {
      const k = a.applicant?.school || '—';
      (m[k] ??= new Set()).add(a.applicant_id);
      return m;
    }, {}),
  )
    .map(([k, v]) => [k, v.size] as const)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return (
    <div className="grid gap-12">
      <section aria-label="Totals" className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-x-6 gap-y-6">
        <Kpi label="Students" value={students} />
        <Kpi label="Applications" value={apps.length} />
        <Kpi label="Waiting for screening" value={n(PIPE.screening)} to="/organiser/applications?status=Applied" accent={n(PIPE.screening) > 0} />
        <Kpi label="With companies" value={n(PIPE.shared)} />
        <Kpi label="Interviews" value={n(PIPE.interview)} />
        <Kpi label="Selected" value={n(PIPE.selected)} />
      </section>

      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="font-bold text-[1.5rem]">Applications against openings, by role</h1>
          <p className="small text-ink-soft">The Operations Plan aims for at least five eligible applicants per opening.</p>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="small text-ink-soft">
                <th className="py-2 pr-4 font-medium">Role</th>
                <th className="py-2 pr-4 font-medium w-[34%]">Applications · target is 5 per opening</th>
                <th className="py-2 px-2 font-medium text-right">Openings</th>
                <th className="py-2 px-2 font-medium text-right">To screen</th>
                <th className="py-2 px-2 font-medium text-right">With company</th>
                <th className="py-2 px-2 font-medium text-right">Interview</th>
                <th className="py-2 pl-2 font-medium text-right">Selected</th>
              </tr>
            </thead>
            <tbody>
              {TRACKS.map((t) => {
                const rs = roles.filter((r) => r.track === t);
                if (!rs.length) return null;
                return [
                  <tr key={t}>
                    <td colSpan={7} className="pt-5 pb-1 font-bold">{t}</td>
                  </tr>,
                  ...rs.map((r) => {
                    const ra = apps.filter((a) => a.role_code === r.code);
                    const target = (r.openings ?? 0) * 5;
                    const c = (s: string[]) => ra.filter((a) => s.includes(a.status)).length;
                    return (
                      <tr key={r.code} className="border-t border-mist-deep">
                        <td className="py-2.5 pr-4">
                          <Link to={`/organiser/applications?role=${r.code}`} className="font-medium hover:underline">{r.title}</Link>
                          <span className="block small text-ink-soft">{companyBy.get(r.company_code)?.short_name} · {r.code}{r.is_open ? '' : ' · closed'}</span>
                        </td>
                        <td className="py-2.5 pr-4">
                          <div className="relative h-5 bg-mist" aria-label={`${ra.length} applications, target ${target}`}>
                            <div className="absolute inset-y-0 left-0 bg-saffron" style={{ width: `${(ra.length / Math.max(maxApps, target || 1)) * 100}%` }} />
                            {target > 0 && <div className="absolute inset-y-[-3px] w-[2px] bg-ink" style={{ left: `${(target / Math.max(maxApps, target)) * 100}%` }} />}
                            <span className="absolute inset-y-0 left-1.5 small font-bold num leading-5">{ra.length}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-right num">{r.openings ?? 'TBD'}</td>
                        <td className="py-2.5 px-2 text-right num">{c(PIPE.screening)}</td>
                        <td className="py-2.5 px-2 text-right num">{c(PIPE.shared)}</td>
                        <td className="py-2.5 px-2 text-right num">{c(PIPE.interview)}</td>
                        <td className="py-2.5 pl-2 text-right num">{c(PIPE.selected)}</td>
                      </tr>
                    );
                  }),
                ];
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-10">
        <section>
          <h2 className="font-bold text-[1.25rem]">Newest applications</h2>
          {recent.length === 0 ? (
            <p className="mt-3 bg-mist p-5">No applications yet. Share the form link in the WhatsApp community.</p>
          ) : (
            <ul className="mt-3">
              {recent.map((a) => (
                <li key={a.id} className="py-2.5 border-t border-mist-deep grid grid-cols-[1fr_auto] gap-3">
                  <span>
                    <span className="font-medium">{a.applicant?.full_name}</span>
                    <span className="block small text-ink-soft">{a.role_code} · choice {a.preference} · {a.applicant?.programme} {a.applicant?.specialisation}</span>
                  </span>
                  <span className="small text-ink-soft num">{formatDateTime(a.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <h2 className="font-bold text-[1.25rem]">Students by school</h2>
          {bySchool.length === 0 ? (
            <p className="mt-3 bg-mist p-5">Nothing to count yet.</p>
          ) : (
            <table className="mt-3 w-full">
              <tbody>
                {bySchool.map(([k, v]) => (
                  <tr key={k} className="border-t border-mist-deep">
                    <td className="py-2.5">{k}</td>
                    <td className="py-2.5 text-right num font-medium">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}

function Kpi({ label, value, to, accent }: { label: string; value: number; to?: string; accent?: boolean }) {
  const body = (
    <>
      <p className="small text-ink-soft">{label}</p>
      <p className={`num font-bold text-[2.25rem] leading-none mt-1 ${accent ? 'underline decoration-saffron decoration-4 underline-offset-8' : ''}`}>{value}</p>
    </>
  );
  return to ? (
    <Link to={to} className="block hover:underline">
      {body}
    </Link>
  ) : (
    <div>{body}</div>
  );
}
