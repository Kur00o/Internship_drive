import { useEffect, useState } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { YiLogo } from '../../components/Brand';
import { amIOrganizer } from '../../lib/api';
import { useDocumentTitle } from '../../lib/hooks';
import { supabase } from '../../lib/supabase';
import Applications from './Applications';
import Companies from './Companies';
import DayBoard from './DayBoard';
import Overview from './Overview';
import Schedule from './Schedule';
import Settings from './Settings';
import { OrganiserStore, useStore } from './store';

export default function Organiser() {
  useDocumentTitle('Organiser · Internship Drive 2026');
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session || session.user.is_anonymous) {
      setAllowed(null);
      return;
    }
    amIOrganizer().then(setAllowed);
  }, [session]);

  if (session === undefined) return <p className="frame py-24 lead">Loading…</p>;
  if (!session || session.user.is_anonymous) return <Login />;
  if (allowed === null) return <p className="frame py-24 lead">Checking your access…</p>;
  if (!allowed) {
    return (
      <main className="frame py-24 max-w-2xl">
        <YiLogo className="h-14 w-auto" />
        <h1 className="head mt-10">This account is not on the organiser list.</h1>
        <p className="lead mt-4">
          Signed in as {session.user.email}. Ask an organiser to add this email under Settings, then sign in again.
        </p>
        <button className="btn btn-ink mt-8" onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>
      </main>
    );
  }

  return (
    <OrganiserStore>
      <Shell email={session.user.email ?? ''} />
    </OrganiserStore>
  );
}

function Shell({ email }: { email: string }) {
  const { loading, error, reload, apps } = useStore();
  const tabs = [
    ['', 'Overview'],
    ['applications', 'Applications'],
    ['schedule', 'Schedule'],
    ['day', 'Interview day'],
    ['companies', 'Companies & roles'],
    ['settings', 'Settings'],
  ];
  return (
    <div className="min-h-svh bg-paper">
      <header className="bg-ink text-paper frame">
        <div className="flex flex-wrap items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-4">
            <span className="bg-paper p-1.5">
              <YiLogo className="h-9 w-auto" />
            </span>
            <div>
              <p className="font-bold leading-tight">Internship Drive 2026</p>
              <p className="small text-paper/75">Organiser desk · {apps.length} applications</p>
            </div>
          </div>
          <div className="flex items-center gap-4 small">
            <button className="link" onClick={() => reload()} disabled={loading}>
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
            <span className="text-paper/75 hidden sm:inline">{email}</span>
            <button className="link" onClick={() => supabase.auth.signOut()}>
              Sign out
            </button>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto -mb-px" aria-label="Organiser">
          {tabs.map(([path, label]) => (
            <NavLink
              key={path}
              to={`/organiser${path ? `/${path}` : ''}`}
              end={path === ''}
              className={({ isActive }) => `px-4 py-3 whitespace-nowrap font-medium transition-colors ${isActive ? 'bg-paper text-ink' : 'text-paper/85 hover:text-paper hover:bg-paper/10'}`}
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      {error && <p className="frame py-4 bg-danger text-paper font-medium">{error}</p>}
      <main className="frame py-8">
        <Routes>
          <Route index element={<Overview />} />
          <Route path="applications" element={<Applications />} />
          <Route path="schedule" element={<Schedule />} />
          <Route path="day" element={<DayBoard />} />
          <Route path="companies" element={<Companies />} />
          <Route path="settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setErr(error.message === 'Invalid login credentials' ? 'That email and password do not match an organiser account.' : error.message);
    setBusy(false);
  }
  return (
    <main className="min-h-svh grid lg:grid-cols-2">
      <section className="bg-ink text-paper frame py-14 flex flex-col justify-between gap-10">
        <span className="bg-paper p-2 self-start">
          <YiLogo className="h-14 w-auto" />
        </span>
        <div>
          <h1 className="display" style={{ fontSize: 'clamp(2.75rem, 6vw, 5.5rem)' }}>
            Organiser desk
          </h1>
          <p className="lead mt-6 max-w-[38ch]">Applications, screening, interview slots and the interview-day board for the Yi MIT-WPU drive.</p>
        </div>
      </section>
      <section className="frame py-14 flex items-center">
        <form onSubmit={submit} className="grid gap-5 w-full max-w-md">
          <h2 className="font-bold text-[1.75rem]">Sign in</h2>
          <div>
            <label htmlFor="o_email" className="label">Email</label>
            <input id="o_email" type="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
          </div>
          <div>
            <label htmlFor="o_pw" className="label">Password</label>
            <input id="o_pw" type="password" className="field" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          </div>
          <button className="btn btn-ink" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
          {err && <p role="alert" className="error-text">{err}</p>}
          <p className="small text-ink-soft">Organiser accounts are created in Supabase (Authentication → Users) and their email added to the organiser list.</p>
        </form>
      </section>
    </main>
  );
}
