import { useEffect, useState } from 'react';
import { addOrganizer, loadOrganizers, removeOrganizer, saveSettings } from '../../lib/api';
import { formatDateTime, isoToIstClock, isoToIstDate, istToIso } from '../../lib/format';
import type { DriveSettings } from '../../lib/types';
import { useStore } from './store';

export default function Settings() {
  const { pub, reloadPublic } = useStore();
  const [s, setS] = useState<DriveSettings | null>(pub?.settings ?? null);
  const [closeDate, setCloseDate] = useState('');
  const [closeTime, setCloseTime] = useState('23:59');
  const [msg, setMsg] = useState('');
  const [orgs, setOrgs] = useState<{ email: string; name: string | null; added_at: string }[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [orgMsg, setOrgMsg] = useState('');

  useEffect(() => {
    if (pub?.settings) {
      setS(pub.settings);
      if (pub.settings.applications_close_at) {
        setCloseDate(isoToIstDate(pub.settings.applications_close_at));
        setCloseTime(isoToIstClock(pub.settings.applications_close_at));
      }
    }
  }, [pub?.settings]);
  useEffect(() => {
    loadOrganizers().then(setOrgs).catch(() => setOrgs([]));
  }, []);

  if (!s) return <p>Loading…</p>;

  async function save() {
    if (!s) return;
    setMsg('');
    try {
      await saveSettings({
        applications_open: s.applications_open,
        applications_close_at: closeDate ? istToIso(closeDate, closeTime || '23:59') : null,
        timings_note: s.timings_note || null,
        venue: s.venue || null,
        whatsapp_url: s.whatsapp_url || null,
        contact_email: s.contact_email || null,
        contact_phone: s.contact_phone || null,
        announcement: s.announcement || null,
      });
      await reloadPublic();
      setMsg('Saved. The public site shows the change on next load.');
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <div className="grid lg:grid-cols-2 gap-12">
      <section className="grid gap-4 content-start">
        <h1 className="font-bold text-[1.5rem]">Drive settings</h1>
        <label className="flex items-center gap-3 font-medium bg-mist p-4">
          <input type="checkbox" className="size-5 accent-[var(--color-ink)]" checked={s.applications_open} onChange={(e) => setS({ ...s, applications_open: e.target.checked })} />
          Applications are open
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="small grid gap-1">
            Applications close on
            <input type="date" className="field" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} />
          </label>
          <label className="small grid gap-1">
            at (IST)
            <input type="time" className="field" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} />
          </label>
        </div>
        <p className="small text-ink-soft">Leave the date empty to keep the form open until you untick the box above.</p>
        <Field label="Timings note (public)" value={s.timings_note ?? ''} onChange={(v) => setS({ ...s, timings_note: v })} />
        <Field label="Venue (public)" value={s.venue ?? ''} onChange={(v) => setS({ ...s, venue: v })} />
        <Field label="WhatsApp group link" value={s.whatsapp_url ?? ''} onChange={(v) => setS({ ...s, whatsapp_url: v })} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Contact email (public)" value={s.contact_email ?? ''} onChange={(v) => setS({ ...s, contact_email: v })} />
          <Field label="Contact phone (public)" value={s.contact_phone ?? ''} onChange={(v) => setS({ ...s, contact_phone: v })} />
        </div>
        <label className="small grid gap-1">
          Announcement (optional)
          <textarea className="field !min-h-[4rem]" rows={2} value={s.announcement ?? ''} onChange={(e) => setS({ ...s, announcement: e.target.value })} />
        </label>
        <div className="flex items-center gap-4">
          <button className="btn btn-ink" onClick={save}>Save settings</button>
          {msg && <span className="font-medium">{msg}</span>}
        </div>
      </section>

      <section className="grid gap-4 content-start">
        <h2 className="font-bold text-[1.5rem]">Organisers</h2>
        <p className="text-ink-soft">
          People on this list can see every application once they sign in. To add someone: create their user in Supabase → Authentication → Users (tick “Auto confirm”), then add the same email here.
        </p>
        <ul className="grid gap-2">
          {orgs.map((o) => (
            <li key={o.email} className="bg-mist p-3 flex items-center justify-between gap-3">
              <span>
                <span className="font-medium">{o.name || o.email}</span>
                <span className="block small text-ink-soft">{o.email} · added {formatDateTime(o.added_at)}</span>
              </span>
              <button
                className="link small"
                onClick={async () => {
                  if (!confirm(`Remove ${o.email} from organisers?`)) return;
                  try {
                    await removeOrganizer(o.email);
                    setOrgs(await loadOrganizers());
                  } catch (e) {
                    setOrgMsg((e as Error).message);
                  }
                }}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <form
          className="grid sm:grid-cols-[1fr_1fr_auto] gap-2 items-end"
          onSubmit={async (e) => {
            e.preventDefault();
            setOrgMsg('');
            try {
              await addOrganizer(newEmail, newName);
              setNewEmail('');
              setNewName('');
              setOrgs(await loadOrganizers());
            } catch (err) {
              setOrgMsg((err as Error).message);
            }
          }}
        >
          <Field label="Email" value={newEmail} onChange={setNewEmail} />
          <Field label="Name" value={newName} onChange={setNewName} />
          <button className="btn btn-ink">Add</button>
        </form>
        {orgMsg && <p className="error-text">{orgMsg}</p>}
      </section>
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
