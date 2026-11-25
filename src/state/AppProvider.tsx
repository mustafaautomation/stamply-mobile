import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { createAppRepository } from '@/data';
import type { StamplyRepository } from '@/data/repository';
import type { DemoPersona, MembershipView, Session } from '@/domain/types';

const ORG_KEY = 'stamply.org';

interface AppValue {
  ready: boolean;
  offline: boolean;
  repo: StamplyRepository | null;
  session: Session | null;
  memberships: MembershipView[];
  activeOrgId: string | 'all';
  setActiveOrgId: (id: string | 'all') => void;
  refreshKey: number;
  bump: () => void;
  pendingPath: string | null;
  setPendingPath: (path: string | null) => void;
  enterDemo: (persona: DemoPersona) => Promise<void>;
  requestMagicLink: (email: string) => Promise<{ devCode: string | null }>;
  verifyMagicLink: (email: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetDemo: () => Promise<void>;
}

const AppContext = createContext<AppValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [offline, setOffline] = useState(false);
  const [repo, setRepo] = useState<StamplyRepository | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [memberships, setMemberships] = useState<MembershipView[]>([]);
  const [activeOrgId, setActiveOrgState] = useState<string | 'all'>('all');
  const [refreshKey, setRefreshKey] = useState(0);
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  const loadMemberships = useCallback(async (nextRepo: StamplyRepository, nextSession: Session | null) => {
    if (!nextSession) {
      setMemberships([]);
      return;
    }
    const rows = await nextRepo.listMemberships();
    setMemberships(rows);
    const stored = await AsyncStorage.getItem(ORG_KEY);
    const valid = stored === 'all' || rows.some((row) => row.organizationId === stored);
    if (valid && stored) {
      setActiveOrgState(stored);
      return;
    }
    const orgs = new Set(rows.map((row) => row.organizationId));
    setActiveOrgState(orgs.size === 1 ? [...orgs][0] : 'all');
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const net = await Network.getNetworkStateAsync();
        if (!cancelled) setOffline(net.isConnected === false || net.isInternetReachable === false);
      } catch {
        if (!cancelled) setOffline(false);
      }
      const next = await createAppRepository();
      const nextSession = await next.getSession();
      if (cancelled) return;
      setRepo(next);
      setSession(nextSession);
      await loadMemberships(next, nextSession);
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadMemberships]);

  const setActiveOrgId = useCallback((id: string | 'all') => {
    setActiveOrgState(id);
    void AsyncStorage.setItem(ORG_KEY, id);
  }, []);

  const bump = useCallback(() => setRefreshKey((value) => value + 1), []);

  const enterDemo = useCallback(
    async (persona: DemoPersona) => {
      if (!repo) return;
      const next = await repo.enterDemo(persona);
      setSession(next);
      await loadMemberships(repo, next);
      bump();
    },
    [repo, loadMemberships, bump],
  );

  const requestMagicLink = useCallback(
    async (email: string) => {
      if (!repo) throw new Error('Stamply is still opening.');
      return repo.requestMagicLink(email);
    },
    [repo],
  );

  const verifyMagicLink = useCallback(
    async (email: string, code: string) => {
      if (!repo) return;
      const next = await repo.verifyMagicLink(email, code);
      setSession(next);
      await loadMemberships(repo, next);
      bump();
    },
    [repo, loadMemberships, bump],
  );

  const signOut = useCallback(async () => {
    if (!repo) return;
    await repo.signOut();
    setSession(null);
    setMemberships([]);
    setActiveOrgState('all');
  }, [repo]);

  const resetDemo = useCallback(async () => {
    if (!repo) return;
    await repo.resetDemo();
    const next = await repo.getSession();
    setSession(next);
    await loadMemberships(repo, next);
    bump();
  }, [repo, loadMemberships, bump]);

  const value = useMemo<AppValue>(
    () => ({
      ready,
      offline,
      repo,
      session,
      memberships,
      activeOrgId,
      setActiveOrgId,
      refreshKey,
      bump,
      pendingPath,
      setPendingPath,
      enterDemo,
      requestMagicLink,
      verifyMagicLink,
      signOut,
      resetDemo,
    }),
    [
      ready,
      offline,
      repo,
      session,
      memberships,
      activeOrgId,
      setActiveOrgId,
      refreshKey,
      bump,
      pendingPath,
      enterDemo,
      requestMagicLink,
      verifyMagicLink,
      signOut,
      resetDemo,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used inside AppProvider');
  return value;
}
