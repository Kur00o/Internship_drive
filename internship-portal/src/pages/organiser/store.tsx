import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { loadApplications, loadCompanyPrivate, loadPublicData } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import type { Application, Company, CompanyPrivate, PublicData, Role } from '../../lib/types';

interface Store {
  pub: PublicData | null;
  apps: Application[];
  priv: CompanyPrivate[];
  loading: boolean;
  error: string;
  reload: () => Promise<void>;
  reloadPublic: () => Promise<void>;
  setApps: React.Dispatch<React.SetStateAction<Application[]>>;
  setPriv: React.Dispatch<React.SetStateAction<CompanyPrivate[]>>;
  roleBy: Map<string, Role>;
  companyBy: Map<string, Company>;
}

const Ctx = createContext<Store | null>(null);

export function OrganiserStore({ children }: { children: React.ReactNode }) {
  const [pub, setPub] = useState<PublicData | null>(null);
  const [apps, setApps] = useState<Application[]>([]);
  const [priv, setPriv] = useState<CompanyPrivate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reloadPublic = useCallback(async () => {
    setPub(await loadPublicData(true));
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [p, a, c] = await Promise.all([loadPublicData(true), loadApplications(), loadCompanyPrivate()]);
      setPub(p);
      setApps(a);
      setPriv(c);
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
      .subscribe();
    return () => {
      clearTimeout(t);
      supabase.removeChannel(ch);
    };
  }, []);

  const roleBy = useMemo(() => new Map((pub?.roles ?? []).map((r) => [r.code, r])), [pub]);
  const companyBy = useMemo(() => new Map((pub?.companies ?? []).map((c) => [c.code, c])), [pub]);

  return (
    <Ctx.Provider value={{ pub, apps, priv, loading, error, reload, reloadPublic, setApps, setPriv, roleBy, companyBy }}>
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
