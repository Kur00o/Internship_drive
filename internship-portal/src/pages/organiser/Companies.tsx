import { useState } from 'react';
import { rotateCompanyToken, saveCompanyPrivate, saveRole } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import type { Company, CompanyPrivate, Role } from '../../lib/types';
import { useStore } from './store';

export default function Companies() {
  const { pub, priv, apps } = useStore();
  const companies = pub?.companies ?? [];
  return (
    <div className="grid gap-10">
      <div>
        <h1 className="font-bold text-[1.5rem]">Companies and roles</h1>
        <p className="mt-1 text-ink-soft max-w-[80ch]">
          Each company has a private dashboard link. Send it only to that company’s contact; it shows their own applicants, lets them shortlist and rate, and opens resumes. Rotate the link if it is ever forwarded by mistake.
        </p>
      </div>
      {companies.map((c) => (
        <CompanyCard key={c.code} company={c} priv={priv.find((p) => p.company_code === c.code)} roles={(pub?.roles ?? []).filter((r) => r.company_code === c.code)} count={apps.filter((a) => a.role_code.startsWith(`${c.code}-`)).length} />
      ))}
    </div>
  );
}

function CompanyCard({ company, priv, roles, count }: { company: Company; priv?: CompanyPrivate; roles: Role[]; count: number }) {
  const { setPriv, reloadPublic } = useStore();
  const [p, setP] = useState<CompanyPrivate | undefined>(priv);
  const [info, setInfo] = useState({ about: company.about ?? '', office_location: company.office_location ?? '', website: company.website ?? '', jd_status: company.jd_status });
  const [msg, setMsg] = useState('');
  const link = p ? `${location.origin}/company/${p.access_token}` : '';

  async function savePrivate() {
    if (!p) return;
    setMsg('');
    try {
      await saveCompanyPrivate(company.code, {
        contact_name: p.contact_name || null,
        contact_phone: p.contact_phone || null,
        contact_email: p.contact_email || null,
        coordinator: p.coordinator || null,
        share_unscreened: p.share_unscreened,
        notes: p.notes || null,
      });
      const { error } = await supabase.from('companies').update({ about: info.about || null, office_location: info.office_location || null, website: info.website || null, jd_status: info.jd_status }).eq('code', company.code);
      if (error) throw new Error(error.message);
      setPriv((list) => list.map((x) => (x.company_code === company.code ? p : x)));
      await reloadPublic();
      setMsg('Saved.');
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  async function rotate() {
    if (!confirm(`Make a new link for ${company.short_name}? The old link stops working.`)) return;
    const token = await rotateCompanyToken(company.code);
    const next = { ...(p as CompanyPrivate), access_token: token };
    setP(next);
    setPriv((list) => list.map((x) => (x.company_code === company.code ? next : x)));
    setMsg('New link created.');
  }

  return (
    <section className="bg-mist p-5 md:p-6 grid gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-bold text-[1.375rem]">
          {company.name} <span className="small font-medium text-ink-soft">{company.code}</span>
        </h2>
        <p className="small num">{count} applications · {roles.length} roles</p>
      </div>

      {p && (
        <div className="grid gap-2">
          <p className="small font-medium">Private dashboard link</p>
          <div className="flex flex-wrap gap-2">
            <input className="field flex-1 min-w-[16rem] num small" readOnly value={link} onFocus={(e) => e.target.select()} aria-label={`${company.short_name} dashboard link`} />
            <button className="btn btn-ink" onClick={() => navigator.clipboard?.writeText(link).then(() => setMsg('Link copied.'))}>Copy</button>
            <a className="btn btn-paper" href={link} target="_blank" rel="noreferrer">Open</a>
            <button className="btn btn-paper" onClick={rotate}>New link</button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
        <Field label="Contact name" value={p?.contact_name ?? ''} onChange={(v) => setP(p && { ...p, contact_name: v })} />
        <Field label="Contact phone" value={p?.contact_phone ?? ''} onChange={(v) => setP(p && { ...p, contact_phone: v })} />
        <Field label="Contact email" value={p?.contact_email ?? ''} onChange={(v) => setP(p && { ...p, contact_email: v })} />
        <Field label="Club coordinator" value={p?.coordinator ?? ''} onChange={(v) => setP(p && { ...p, coordinator: v })} />
        <Field label="Office location (public)" value={info.office_location} onChange={(v) => setInfo({ ...info, office_location: v })} />
        <Field label="Website (public)" value={info.website} onChange={(v) => setInfo({ ...info, website: v })} />
        <label className="small grid gap-1 xl:col-span-2">
          About (public)
          <textarea className="field !min-h-[3.5rem]" rows={2} value={info.about} onChange={(e) => setInfo({ ...info, about: e.target.value })} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-6">
        <label className="flex items-center gap-2 font-medium">
          <input type="checkbox" className="size-4 accent-[var(--color-ink)]" checked={p?.share_unscreened ?? true} onChange={(e) => setP(p && { ...p, share_unscreened: e.target.checked })} />
          Company sees applications before screening
        </label>
        <label className="flex items-center gap-2 font-medium">
          <input type="checkbox" className="size-4 accent-[var(--color-ink)]" checked={info.jd_status === 'pending'} onChange={(e) => setInfo({ ...info, jd_status: e.target.checked ? 'pending' : 'published' })} />
          JD still pending
        </label>
        <button className="btn btn-ink" onClick={savePrivate}>Save company</button>
        {msg && <span className="font-medium">{msg}</span>}
      </div>

      {roles.length > 0 && (
        <div className="grid gap-3">
          {roles.map((r) => (
            <RoleEditor key={r.code} role={r} />
          ))}
        </div>
      )}
    </section>
  );
}

function RoleEditor({ role }: { role: Role }) {
  const { reloadPublic } = useStore();
  const [r, setR] = useState(role);
  const [msg, setMsg] = useState('');
  async function save() {
    setMsg('');
    try {
      await saveRole(role.code, {
        is_open: r.is_open,
        stipend: r.stipend,
        openings: r.openings,
        duration: r.duration,
        work_mode: r.work_mode,
        location: r.location,
        joining: r.joining,
        challenge_materials_url: r.challenge_materials_url || null,
        interview_minutes: r.interview_minutes,
      });
      await reloadPublic();
      setMsg('Saved.');
    } catch (e) {
      setMsg((e as Error).message);
    }
  }
  return (
    <div className="bg-paper p-4 grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-bold">
          {role.title} <span className="small text-ink-soft">{role.code}</span>
        </p>
        <label className="flex items-center gap-2 font-medium">
          <input type="checkbox" className="size-4 accent-[var(--color-ink)]" checked={r.is_open} onChange={(e) => setR({ ...r, is_open: e.target.checked })} />
          Taking applications
        </label>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Field label="Stipend" value={r.stipend} onChange={(v) => setR({ ...r, stipend: v })} />
        <Field label="Openings" value={r.openings == null ? '' : String(r.openings)} onChange={(v) => setR({ ...r, openings: v === '' ? null : Number(v) || 0 })} />
        <Field label="Duration" value={r.duration} onChange={(v) => setR({ ...r, duration: v })} />
        <Field label="Interview minutes" value={String(r.interview_minutes)} onChange={(v) => setR({ ...r, interview_minutes: Number(v) || 15 })} />
        <Field label="Work mode" value={r.work_mode} onChange={(v) => setR({ ...r, work_mode: v })} />
        <Field label="Location" value={r.location} onChange={(v) => setR({ ...r, location: v })} />
        <Field label="Joining" value={r.joining ?? ''} onChange={(v) => setR({ ...r, joining: v })} />
        {role.challenge && <Field label="Task materials link" value={r.challenge_materials_url ?? ''} onChange={(v) => setR({ ...r, challenge_materials_url: v })} />}
      </div>
      <div className="flex items-center gap-4">
        <button className="btn btn-quiet !min-h-[40px]" onClick={save}>Save role</button>
        {msg && <span className="font-medium small">{msg}</span>}
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="small grid gap-1">
      {label}
      <input className="field" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
