import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { loadApplications, loadAttendance, loadCompanyPrivate, loadPublicData, loadVenues } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import type { Application, Attendance, Company, CompanyPrivate, PublicData, Role, Venue } from '../../lib/types';

interface Store {
  pub: PublicData | null;
  apps: Application[];
  priv: CompanyPrivate[];
  venues: Venue[];
  attendance: Attendance[];
  loading: boolean;
  error: string;
  reload: () => Promise<void>;
  reloadPublic: () => Promise<void>;
  setApps: React.Dispatch<React.SetStateAction<Application[]>>;
  setPriv: React.Dispatch<React.SetStateAction<CompanyPrivate[]>>;
  setVenues: React.Dispatch<React.SetStateAction<Venue[]>>;
  setAttendance: React.Dispatch<React.SetStateAction<Attendance[]>>;
  roleBy: Map<string, Role>;
  companyBy: Map<string, Company>;
}

const Ctx = createContext<Store | null>(null);

export function OrganiserStore({ children }: { children: React.ReactNode }) {
  const [pub, setPub] = useState<PublicData | null>(null);
  const [apps, setApps] = useState<Application[]>([]);
  const [priv, setPriv] = useState<CompanyPrivate[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reloadPublic = useCallback(async () => {
    setPub(await loadPublicData(true));
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      // venues/attendance need migration 005; the rest of the desk works without it
      const [p, a, c, v, at] = await Promise.all([
        loadPublicData(true),
        loadApplications(),
        loadCompanyPrivate(),
        loadVenues().catch(() => [] as Venue[]),
        loadAttendance().catch(() => [] as Attendance[]),
      ]);
      setPub(p);
      setApps(a);
      setPriv(c);
      setVenues(v);
      setAttendance(at);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // live updates while organisers work (interview day, new submissions)
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        loadApplications()
          .then(setApps)
          .catch(() => undefined);
      }, 600);
    };
    const ch = supabase
      .channel('organiser-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'interviews' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => loadAttendance().then(setAttendance).catch(() => undefined))
      .subscribe();
    return () => {
      clearTimeout(t);
      supabase.removeChannel(ch);
    };
  }, []);

  const roleBy = useMemo(() => new Map((pub?.roles ?? []).map((r) => [r.code, r])), [pub]);
  const companyBy = useMemo(() => new Map((pub?.companies ?? []).map((c) => [c.code, c])), [pub]);

  return (
    <Ctx.Provider value={{ pub, apps, priv, venues, attendance, loading, error, reload, reloadPublic, setApps, setPriv, setVenues, setAttendance, roleBy, companyBy }}>
      {children}
    </Ctx.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside OrganiserStore');
  return s;
}
