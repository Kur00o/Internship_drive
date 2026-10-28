import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Masthead, SiteFooter } from '../components/Brand';
import { submitApplication, uploadResume } from '../lib/api';
import {
  GRAD_YEARS,
  OFFICE_OPTIONS,
  PROFESSIONAL_COURSES,
  PROGRAMMES,
  SCHOOL_SUGGESTIONS,
  YEARS_OF_STUDY,
  interviewSlots,
  roleIsOpenTo,
} from '../lib/content';
import { useDocumentTitle, useLocalDraft, usePublicData } from '../lib/hooks';
import { TRACKS, type ApplicationPayload, type Role, type SubmitResult } from '../lib/types';

type Draft = Omit<ApplicationPayload, 'resume_path' | 'resume_name' | 'roles'> & {
  roles: { code: string; challenge: string }[];
};

const EMPTY: Draft = {
  full_name: '',
  prn: '',
  email: '',
  phone: '',
  school: '',
  programme: '',
  specialisation: '',
  year_of_study: '',
  graduation_year: '',
  cgpa: '',
  professional_courses: [],
  portfolio_url: '',
  linkedin_url: '',
  available_from: '',
  office_availability: '',
  interview_availability: [],
  prior_experience: '',
  why_fit: '',
  consent: false,
  roles: [],
};

type Errors = Partial<Record<string, string>>;
const URL_RE = /^https?:\/\/\S+\.\S+/i;

export default function ApplyPage() {
  useDocumentTitle('Apply · Internship Drive 2026');
  const { data, error: loadError } = usePublicData();
  const [params] = useSearchParams();
  const [draft, setDraft, clearDraft] = useLocalDraft<Draft>('yi-drive-application-draft', EMPTY);
  const [resume, setResume] = useState<File | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState<'' | 'uploading' | 'saving'>('');
  const [serverError, setServerError] = useState('');
  const [result, setResult] = useState<SubmitResult | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const roles = useMemo(() => data?.roles ?? [], [data]);
  const byCode = useMemo(() => new Map(roles.map((r) => [r.code, r])), [roles]);
  const companies = useMemo(() => new Map((data?.companies ?? []).map((c) => [c.code, c])), [data]);
  const chosen = draft.roles.map((c) => byCode.get(c.code)).filter(Boolean) as Role[];
  const needsPortfolio = chosen.some((r) => r.needs_portfolio);
  const slots = interviewSlots(data?.settings.drive_days ?? ['2026-11-02', '2026-11-03']);
  const settings = data?.settings;
  const closed =
    settings && (!settings.applications_open || (settings.applications_close_at && new Date(settings.applications_close_at) < new Date()));

  // preselect ?role=CODE once roles are known
  useEffect(() => {
    const code = params.get('role')?.toUpperCase();
    if (!code || !byCode.has(code)) return;
    setDraft((d) => (d.roles.some((r) => r.code === code) || d.roles.length >= 3 ? d : { ...d, roles: [{ code, challenge: '' }, ...d.roles].slice(0, 3) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byCode.size]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
    if (errors[k as string]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const toggleRole = (code: string) => {
    setDraft((d) => {
      if (d.roles.some((r) => r.code === code)) return { ...d, roles: d.roles.filter((r) => r.code !== code) };
      if (d.roles.length >= 3) return d;
      return { ...d, roles: [...d.roles, { code, challenge: '' }] };
    });
    setErrors((e) => ({ ...e, roles: undefined }));
  };
  const move = (i: number, dir: -1 | 1) =>
    setDraft((d) => {
      const r = [...d.roles];
      const j = i + dir;
      if (j < 0 || j >= r.length) return d;
      [r[i], r[j]] = [r[j], r[i]];
      return { ...d, roles: r };
    });
  const setChallenge = (code: string, v: string) => {
    setDraft((d) => ({ ...d, roles: d.roles.map((r) => (r.code === code ? { ...r, challenge: v } : r)) }));
    if (errors[`challenge_${code}`]) setErrors((e) => ({ ...e, [`challenge_${code}`]: undefined }));
  };

  function validate(): Errors {
    const e: Errors = {};
    const phone = draft.phone.replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, '');
    if (!draft.full_name.trim()) e.full_name = 'Enter your full name as on your ID card.';
    if (!/^[0-9A-Za-z]{8,14}$/.test(draft.prn.replace(/\s/g, ''))) e.prn = 'Enter your PRN: 8 to 14 letters or digits.';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(draft.email.trim())) e.email = 'Enter a valid email address.';
    if (!/^[6-9]\d{9}$/.test(phone)) e.phone = 'Enter a 10-digit mobile number.';
    if (!draft.school.trim()) e.school = 'Enter your school or faculty.';
    if (!draft.programme) e.programme = 'Choose your programme.';
    if (!draft.specialisation.trim()) e.specialisation = 'Enter your specialisation or branch.';
    if (!draft.year_of_study) e.year_of_study = 'Choose your year of study.';
    if (!draft.graduation_year) e.graduation_year = 'Choose your graduation year.';
    const cg = Number(draft.cgpa);
    if (draft.cgpa === '' || Number.isNaN(cg) || cg < 0 || cg > 10) e.cgpa = 'CGPA is a number from 0 to 10.';
    if (!draft.roles.length) e.roles = 'Choose at least one role.';
    chosen.forEach((r) => {
      const c = draft.roles.find((x) => x.code === r.code)?.challenge ?? '';
      if (r.challenge && !c.trim()) e[`challenge_${r.code}`] = 'This role needs its task with your application.';
    });
    if (!draft.why_fit.trim()) e.why_fit = 'Tell the company why you fit your first choice.';
    if (draft.why_fit.length > 600) e.why_fit = 'Keep it under 600 characters.';
    if (!resume) e.resume = 'Attach your resume as a PDF.';
    else if (resume.type !== 'application/pdf' && !/\.pdf$/i.test(resume.name)) e.resume = 'The resume must be a PDF.';
    else if (resume.size > 5 * 1024 * 1024) e.resume = 'The resume must be 5 MB or smaller.';
    if (needsPortfolio && !URL_RE.test(draft.portfolio_url.trim())) e.portfolio_url = 'One of your roles needs a portfolio or GitHub link starting with https://';
    else if (draft.portfolio_url.trim() && !URL_RE.test(draft.portfolio_url.trim())) e.portfolio_url = 'Links start with https://';
    if (draft.linkedin_url.trim() && !URL_RE.test(draft.linkedin_url.trim())) e.linkedin_url = 'Links start with https://';
    if (!draft.available_from) e.available_from = 'Pick the date you can start.';
    if (!draft.office_availability) e.office_availability = 'Choose one.';
    if (!draft.interview_availability.length) e.interview_availability = 'Pick at least one.';
    if (!draft.consent) e.consent = 'Please accept to submit.';
    return e;
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setServerError('');
    const e = validate();
    setErrors(e);
    const first = Object.keys(e).find((k) => e[k]);
    if (first) {
      const el = formRef.current?.querySelector<HTMLElement>(`[data-field="${first}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el?.querySelector<HTMLElement>('input, select, textarea, button')?.focus({ preventScroll: true });
      return;
    }
    try {
      setBusy('uploading');
      const up = await uploadResume(resume!, draft.prn.trim(), draft.full_name.trim());
      setBusy('saving');
      const res = await submitApplication({
        ...draft,
        prn: draft.prn.replace(/\s/g, ''),
        resume_path: up.path,
        resume_name: up.name,
        roles: draft.roles.map((r) => ({ code: r.code, challenge: r.challenge.trim() || undefined })),
      });
      setResult(res);
      clearDraft();
      window.scrollTo({ top: 0 });
    } catch (err) {
      setServerError((err as Error).message);
    } finally {
      setBusy('');
    }
  }

  if (result) return <Submitted result={result} byCode={byCode} companies={companies} whatsapp={settings?.whatsapp_url} />;

  return (
    <>
      <Masthead compact />
      <header className="bg-saffron frame pt-12 pb-14 md:pt-16 md:pb-20">
        <h1 className="display" style={{ fontSize: 'clamp(3rem, 9vw, 8rem)' }}>
          Apply
        </h1>
        <p className="lead mt-6 max-w-[44ch]">
          One application for up to three roles. Your answers save on this device as you type, so you can come back to finish.
        </p>
      </header>

      <main className="bg-paper frame py-14 md:py-20">
        {loadError && <p className="lead text-danger">{loadError}</p>}
        {closed ? (
          <div className="max-w-2xl">
            <h2 className="head">Applications are closed.</h2>
            <p className="lead mt-4">If you already applied, you can still see your status and interview slot.</p>
            <Link to="/track" className="btn btn-ink mt-8">
              Track my application
            </Link>
          </div>
        ) : (
          <form ref={formRef} onSubmit={onSubmit} noValidate className="grid gap-20">
            <Section title="About you" note="As on your college ID. We use your mobile for interview updates.">
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-6">
                <Text name="full_name" label="Full name" value={draft.full_name} onChange={(v) => set('full_name', v)} error={errors.full_name} autoComplete="name" />
                <Text name="prn" label="PRN" value={draft.prn} onChange={(v) => set('prn', v)} error={errors.prn} inputMode="numeric" hint="Your 10-digit MIT-WPU PRN" />
                <Text name="email" type="email" label="Email" value={draft.email} onChange={(v) => set('email', v)} error={errors.email} autoComplete="email" hint="College or personal; use the one you check" />
                <Text name="phone" type="tel" label="Mobile (WhatsApp)" value={draft.phone} onChange={(v) => set('phone', v)} error={errors.phone} autoComplete="tel" inputMode="tel" />
                <Text name="school" label="School / faculty" value={draft.school} onChange={(v) => set('school', v)} error={errors.school} list="schools" />
                <datalist id="schools">
                  {SCHOOL_SUGGESTIONS.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
                <Select name="programme" label="Programme" value={draft.programme} onChange={(v) => set('programme', v)} error={errors.programme} options={PROGRAMMES as unknown as string[]} />
                <Text name="specialisation" label="Specialisation / branch" value={draft.specialisation} onChange={(v) => set('specialisation', v)} error={errors.specialisation} hint="For example CSE, Finance, HR, Psychology" />
                <Select name="year_of_study" label="Current year of study" value={draft.year_of_study} onChange={(v) => set('year_of_study', v)} error={errors.year_of_study} options={YEARS_OF_STUDY} />
                <Select name="graduation_year" label="Expected graduation year" value={draft.graduation_year} onChange={(v) => set('graduation_year', v)} error={errors.graduation_year} options={GRAD_YEARS} />
                <Text name="cgpa" label="Current CGPA" value={draft.cgpa} onChange={(v) => set('cgpa', v)} error={errors.cgpa} inputMode="decimal" hint="Out of 10" />
              </div>
              <fieldset className="mt-6">
                <legend className="label">Professional course, if any</legend>
                <div className="flex flex-wrap gap-3">
                  {PROFESSIONAL_COURSES.map((c) => (
                    <Check
                      key={c}
                      label={c}
                      checked={draft.professional_courses.includes(c)}
                      onChange={(on) => set('professional_courses', on ? [...draft.professional_courses, c] : draft.professional_courses.filter((x) => x !== c))}
                    />
                  ))}
                </div>
              </fieldset>
            </Section>

            <Section title="Your roles" note="Pick up to three in order of preference. Roles that list your programme are marked.">
              <div data-field="roles">
                {chosen.length > 0 ? (
                  <ol className="grid gap-2 mb-8" aria-label="Your ranked roles">
                    {chosen.map((r, i) => (
                      <li key={r.code} className="bg-ink text-paper flex items-center gap-4 p-4">
                        <span className="num font-bold text-saffron text-xl w-6 shrink-0">{i + 1}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-bold leading-snug">{r.title}</span>
                          <span className="block small text-paper/80">{companies.get(r.company_code)?.name} · {r.code}</span>
                        </span>
                        <span className="flex gap-1 shrink-0">
                          <IconButton label={`Move ${r.code} up`} disabled={i === 0} onClick={() => move(i, -1)} path="M6 15l6-6 6 6" />
                          <IconButton label={`Move ${r.code} down`} disabled={i === chosen.length - 1} onClick={() => move(i, 1)} path="M6 9l6 6 6-6" />
                          <IconButton label={`Remove ${r.code}`} onClick={() => toggleRole(r.code)} path="M6 6l12 12M18 6L6 18" />
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="font-medium mb-6">No roles chosen yet.</p>
                )}
                {errors.roles && <span className="error-text mb-4">{errors.roles}</span>}
                <p className="font-medium mb-3" aria-live="polite">
                  {chosen.length}/3 chosen{draft.roles.length >= 3 ? ' · remove one to swap' : ''}
                </p>
                <div className="grid gap-8">
                  {TRACKS.filter((t) => roles.some((r) => r.track === t)).map((t) => (
                    <fieldset key={t}>
                      <legend className="font-bold text-[1.125rem] mb-3">{t}</legend>
                      <div className="grid md:grid-cols-2 gap-2">
                        {roles
                          .filter((r) => r.track === t)
                          .map((r) => {
                            const on = draft.roles.some((x) => x.code === r.code);
                            const fits = draft.programme && roleIsOpenTo(r, draft.programme);
                            const disabled = !r.is_open || (!on && draft.roles.length >= 3);
                            return (
                              <label
                                key={r.code}
                                className={`flex gap-3 p-3.5 cursor-pointer transition-colors ${on ? 'bg-saffron' : 'bg-mist hover:bg-mist-deep'} ${disabled && !on ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                <input type="checkbox" className="mt-1 size-5 accent-[var(--color-ink)] shrink-0" checked={on} disabled={disabled} onChange={() => toggleRole(r.code)} />
                                <span className="min-w-0">
                                  <span className="block font-medium leading-snug">{r.title}</span>
                                  <span className="block small">
                                    {companies.get(r.company_code)?.short_name} · {r.stipend.replace(' / month', '/mo')}
                                    {fits ? ' · lists your programme' : ''}
                                    {!r.is_open ? ' · closed' : ''}
                                  </span>
                                </span>
                              </label>
                            );
                          })}
                      </div>
                    </fieldset>
                  ))}
                </div>
              </div>

              <div className="mt-10" data-field="why_fit">
                <label htmlFor="why_fit" className="label">
                  Why are you a good fit for {chosen[0] ? chosen[0].title : 'your first choice'}?
                </label>
                <textarea
                  id="why_fit"
                  className="field"
                  maxLength={600}
                  value={draft.why_fit}
                  aria-invalid={Boolean(errors.why_fit)}
                  aria-describedby="why_fit_hint"
                  onChange={(e) => set('why_fit', e.target.value)}
                />
                <span id="why_fit_hint" className="hint num">
                  {draft.why_fit.length}/600 characters · the company reads this
                </span>
                {errors.why_fit && <span className="error-text">{errors.why_fit}</span>}
              </div>

              {chosen
                .filter((r) => r.challenge)
                .map((r) => (
                  <div key={r.code} className="mt-10 bg-saffron-soft p-5 md:p-6" data-field={`challenge_${r.code}`}>
                    <label htmlFor={`challenge_${r.code}`} className="label text-[1.125rem]">
                      Task for {r.title}
                    </label>
                    <p className="mb-3">{r.challenge}</p>
                    {r.challenge_materials_url && (
                      <p className="mb-3">
                        <a href={r.challenge_materials_url} target="_blank" rel="noreferrer" className="link font-medium">
                          Open the materials for this task
                        </a>
                      </p>
                    )}
                    <textarea
                      id={`challenge_${r.code}`}
                      className="field"
                      rows={6}
                      maxLength={5000}
                      placeholder="Paste your answer, or a link to it (Google Drive, Docs, Behance, YouTube) set to “anyone with the link”."
                      value={draft.roles.find((x) => x.code === r.code)?.challenge ?? ''}
                      aria-invalid={Boolean(errors[`challenge_${r.code}`])}
                      onChange={(e) => setChallenge(r.code, e.target.value)}
                    />
                    {errors[`challenge_${r.code}`] && <span className="error-text">{errors[`challenge_${r.code}`]}</span>}
                  </div>
                ))}
            </Section>

            <Section title="Documents" note="PDF only, 5 MB or less. Name it PRN_Name_Resume.pdf if you can.">
              <div data-field="resume">
                <span className="label" id="resume_label">
                  Resume
                </span>
                <label
                  className={`flex flex-col sm:flex-row sm:items-center gap-4 p-5 cursor-pointer transition-colors ${resume ? 'bg-green-soft' : 'bg-mist hover:bg-mist-deep'}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const f = e.dataTransfer.files?.[0];
                    if (f) {
                      setResume(f);
                      setErrors((x) => ({ ...x, resume: undefined }));
                    }
                  }}
                >
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    className="sr-only"
                    aria-labelledby="resume_label"
                    aria-describedby="resume_hint"
                    onChange={(e) => {
                      setResume(e.target.files?.[0] ?? null);
                      setErrors((x) => ({ ...x, resume: undefined }));
                    }}
                  />
                  <span className="btn btn-ink pointer-events-none shrink-0">{resume ? 'Change file' : 'Choose PDF'}</span>
                  <span className="min-w-0 font-medium break-words">
                    {resume ? `${resume.name} · ${(resume.size / 1024 / 1024).toFixed(2)} MB` : 'or drop it here'}
                  </span>
                </label>
                <span id="resume_hint" className="hint">
                  PDF, up to 5 MB. Files attached here do not save in the draft; attach again if you reload.
                </span>
                {errors.resume && <span className="error-text">{errors.resume}</span>}
              </div>
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-6 mt-8">
                <Text
                  name="portfolio_url"
                  type="url"
                  label={needsPortfolio ? 'Portfolio / GitHub link (needed for your roles)' : 'Portfolio / GitHub link'}
                  value={draft.portfolio_url}
                  onChange={(v) => set('portfolio_url', v)}
                  error={errors.portfolio_url}
                  hint={chosen.filter((r) => r.needs_portfolio).map((r) => `${r.code}: ${r.portfolio_hint}`).join(' · ') || 'Optional unless a role asks for it'}
                />
                <Text name="linkedin_url" type="url" label="LinkedIn (optional)" value={draft.linkedin_url} onChange={(v) => set('linkedin_url', v)} error={errors.linkedin_url} />
              </div>
              <div className="mt-6">
                <label htmlFor="prior_experience" className="label">
                  Prior internships or work (optional)
                </label>
                <textarea id="prior_experience" className="field" maxLength={600} rows={3} value={draft.prior_experience} onChange={(e) => set('prior_experience', e.target.value)} placeholder="Company and role, or leave blank" />
              </div>
            </Section>

            <Section title="Availability" note={`Companies want ${data?.settings.min_duration?.toLowerCase() ?? 'three months minimum'}, joining ${data?.settings.joining?.toLowerCase() ?? 'as soon as possible'}.`}>
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-6">
                <Text name="available_from" type="date" label="I can start from" value={draft.available_from} onChange={(v) => set('available_from', v)} error={errors.available_from} min={new Date().toISOString().slice(0, 10)} />
              </div>
              <fieldset className="mt-8" data-field="office_availability">
                <legend className="label">Can you work from an office in Pune (Baner, Hinjewadi, Bhosari)?</legend>
                <div className="flex flex-wrap gap-3">
                  {OFFICE_OPTIONS.map((o) => (
                    <Radio key={o} name="office" label={o} checked={draft.office_availability === o} onChange={() => set('office_availability', o)} />
                  ))}
                </div>
                {errors.office_availability && <span className="error-text">{errors.office_availability}</span>}
              </fieldset>
              <fieldset className="mt-8" data-field="interview_availability">
                <legend className="label">When can you interview?</legend>
                <div className="flex flex-wrap gap-3">
                  {slots.map((s) => (
                    <Check
                      key={s}
                      label={s}
                      checked={draft.interview_availability.includes(s)}
                      onChange={(on) => set('interview_availability', on ? [...draft.interview_availability, s] : draft.interview_availability.filter((x) => x !== s))}
                    />
                  ))}
                </div>
                <span className="hint">{data?.settings.timings_note || 'Timings to be announced'}.</span>
                {errors.interview_availability && <span className="error-text">{errors.interview_availability}</span>}
              </fieldset>
            </Section>

            <Section title="Declaration" note="Read once; it is short.">
              <div data-field="consent">
                <label className={`flex gap-4 p-5 cursor-pointer ${draft.consent ? 'bg-green-soft' : 'bg-mist'}`}>
                  <input type="checkbox" className="mt-1 size-5 accent-[var(--color-ink)] shrink-0" checked={draft.consent} onChange={(e) => set('consent', e.target.checked)} aria-invalid={Boolean(errors.consent)} />
                  <span>
                    The information here is true. I agree that the Yi MIT-WPU team may share my application with the companies I apply to. I can commit to at least three months, and I accept the one-offer rule: if I accept an offer, my other applications in this drive are withdrawn.
                  </span>
                </label>
                {errors.consent && <span className="error-text">{errors.consent}</span>}
              </div>
              {serverError && (
                <p role="alert" className="mt-6 bg-danger text-paper p-4 font-medium">
                  {serverError}
                </p>
              )}
              {Object.values(errors).some(Boolean) && !serverError && (
                <p role="alert" className="mt-6 font-medium text-danger">
                  A few fields need attention; they are marked above.
                </p>
              )}
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <button type="submit" className="btn btn-ink text-lg px-8" disabled={Boolean(busy) || !data}>
                  {busy === 'uploading' ? 'Uploading resume…' : busy === 'saving' ? 'Submitting…' : 'Submit application'}
                </button>
                <span className="small text-ink-soft">One application per PRN.</span>
                <button
                  type="button"
                  className="link small ml-auto"
                  onClick={() => {
                    if (!confirm('Clear everything you have typed on this device?')) return;
                    clearDraft();
                    setDraft(EMPTY);
                    setResume(null);
                    setErrors({});
                  }}
                >
                  Clear saved answers
                </button>
              </div>
            </Section>
          </form>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

/* ------------------------------------------------------------------ pieces */
function Section({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <section className="grid lg:grid-cols-12 gap-x-6 gap-y-6">
      <div className="lg:col-span-4">
        <h2 className="font-bold tracking-tight lg:sticky lg:top-6" style={{ fontSize: 'clamp(1.75rem, 2.6vw, 2.5rem)', lineHeight: 1.05 }}>
          {title}
          <span className="block text-[1.0625rem] font-normal tracking-normal mt-3 leading-snug max-w-[34ch]">{note}</span>
        </h2>
      </div>
      <div className="lg:col-span-8">{children}</div>
    </section>
  );
}

function Text(props: {
  name: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: string;
  type?: string;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  list?: string;
  min?: string;
}) {
  const id = `f_${props.name}`;
  const describedBy = [props.hint && `${id}_hint`, props.error && `${id}_err`].filter(Boolean).join(' ') || undefined;
  return (
    <div data-field={props.name}>
      <label htmlFor={id} className="label">
        {props.label}
      </label>
      <input
        id={id}
        className="field"
        type={props.type ?? 'text'}
        value={props.value}
        autoComplete={props.autoComplete}
        inputMode={props.inputMode}
        list={props.list}
        min={props.min}
        aria-invalid={Boolean(props.error)}
        aria-describedby={describedBy}
        onChange={(e) => props.onChange(e.target.value)}
      />
      {props.hint && (
        <span id={`${id}_hint`} className="hint">
          {props.hint}
        </span>
      )}
      {props.error && (
        <span id={`${id}_err`} className="error-text">
          {props.error}
        </span>
      )}
    </div>
  );
}

function Select(props: { name: string; label: string; value: string; onChange: (v: string) => void; options: string[]; error?: string }) {
  const id = `f_${props.name}`;
  return (
    <div data-field={props.name}>
      <label htmlFor={id} className="label">
        {props.label}
      </label>
      <select id={id} className="field" value={props.value} aria-invalid={Boolean(props.error)} aria-describedby={props.error ? `${id}_err` : undefined} onChange={(e) => props.onChange(e.target.value)}>
        <option value="">Choose…</option>
        {props.options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      {props.error && (
        <span id={`${id}_err`} className="error-text">
          {props.error}
        </span>
      )}
    </div>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (on: boolean) => void }) {
  return (
    <label className={`inline-flex items-center gap-2.5 min-h-[44px] px-4 cursor-pointer transition-colors font-medium ${checked ? 'bg-saffron' : 'bg-mist hover:bg-mist-deep'}`}>
      <input type="checkbox" className="size-4 accent-[var(--color-ink)]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function Radio({ name, label, checked, onChange }: { name: string; label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className={`inline-flex items-center gap-2.5 min-h-[44px] px-4 cursor-pointer transition-colors font-medium ${checked ? 'bg-saffron' : 'bg-mist hover:bg-mist-deep'}`}>
      <input type="radio" name={name} className="size-4 accent-[var(--color-ink)]" checked={checked} onChange={onChange} />
      {label}
    </label>
  );
}

function IconButton({ label, onClick, path, disabled }: { label: string; onClick: () => void; path: string; disabled?: boolean }) {
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className="size-10 grid place-items-center bg-paper/10 hover:bg-paper/25 disabled:opacity-30 transition-colors">
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        <path d={path} stroke="currentColor" strokeWidth="2.5" fill="none" />
      </svg>
    </button>
  );
}

function Submitted({
  result,
  byCode,
  companies,
  whatsapp,
}: {
  result: SubmitResult;
  byCode: Map<string, Role>;
  companies: Map<string, { name: string }>;
  whatsapp?: string | null;
}) {
  return (
    <>
      <Masthead compact />
      <main className="bg-green frame py-16 md:py-24 min-h-[80svh]">
        <h1 className="display" style={{ fontSize: 'clamp(2.75rem, 8vw, 7rem)' }}>
          Application in
        </h1>
        <p className="lead mt-6 max-w-[44ch]">
          Thank you, {result.full_name.split(' ')[0]}. Keep these IDs; take a screenshot if that is easiest. You will need your PRN, email and mobile to check your status.
        </p>
        <dl className="mt-10 grid gap-2 max-w-3xl">
          <div className="bg-ink text-paper p-5 flex flex-wrap items-baseline justify-between gap-3">
            <dt className="font-medium">Student ID</dt>
            <dd className="num font-bold text-2xl">{result.student_code}</dd>
          </div>
          {result.applications.map((a) => {
            const r = byCode.get(a.role_code);
            return (
              <div key={a.app_code} className="bg-paper p-5 flex flex-wrap items-baseline justify-between gap-3">
                <dt>
                  <span className="block font-bold">
                    Choice {a.preference}: {r?.title ?? a.role_code}
                  </span>
                  <span className="block small">{r ? companies.get(r.company_code)?.name : ''}</span>
                </dt>
                <dd className="num font-bold text-xl">{a.app_code}</dd>
              </div>
            );
          })}
        </dl>
        <div className="flex flex-wrap gap-3 mt-10">
          <Link to="/track" className="btn btn-ink">
            Track my application
          </Link>
          {whatsapp && (
            <a href={whatsapp} target="_blank" rel="noreferrer" className="btn btn-paper">
              Join the WhatsApp group
            </a>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
