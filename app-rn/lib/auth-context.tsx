import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { api } from './api';

export type UserRole = 'company' | 'individual';

export type CurrentUser = {
  id: string;
  email: string;
  role: UserRole;
  looking_for_work: boolean;
  offering_work: boolean;
};

type AuthContextValue = {
  user: CurrentUser | null;
  session: { access_token: string } | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  syncSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<{ access_token: string } | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async (token: string) => {
    const res = await api<{
      id: string;
      email: string;
      role: string;
      looking_for_work?: boolean;
      offering_work?: boolean;
    }>('/api/auth/me', { token });
    if (res.ok && res.data) {
      setUser({
        id: res.data.id,
        email: res.data.email,
        role: res.data.role as UserRole,
        looking_for_work: res.data.looking_for_work ?? false,
        offering_work: res.data.offering_work ?? false,
      });
    } else {
      setUser(null);
    }
  };

  const refreshUser = async () => {
    const s = supabase.auth.getSession();
    const { data } = await s;
    if (data.session?.access_token) {
      await fetchUser(data.session.access_token);
    } else {
      setUser(null);
    }
  };

  /** Sync session from Supabase (e.g. after signUp so roles screen has token). */
  const syncSession = async () => {
    const { data } = await supabase.auth.getSession();
    const s = data.session;
    setSession(s ? { access_token: s.access_token } : null);
    if (s?.access_token) {
      await fetchUser(s.access_token);
    } else {
      setUser(null);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      // #region agent log
      fetch('http://127.0.0.1:7490/ingest/953e80a6-dd3a-405d-9917-1610bb939dfd',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'346cbd'},body:JSON.stringify({sessionId:'346cbd',location:'auth-context.tsx:initial getSession',message:'Initial getSession resolved',data:{hasSession:!!s,hasToken:!!s?.access_token},timestamp:Date.now(),hypothesisId:'H1,H3,H5'})}).catch(()=>{});
      // #endregion
      setSession(s ? { access_token: s.access_token } : null);
      if (s?.access_token) {
        fetchUser(s.access_token).finally(() => setLoading(false));
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, s) => {
      // #region agent log
      fetch('http://127.0.0.1:7490/ingest/953e80a6-dd3a-405d-9917-1610bb939dfd',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'346cbd'},body:JSON.stringify({sessionId:'346cbd',location:'auth-context.tsx:onAuthStateChange',message:'Auth state change',data:{event,hasSession:!!s,hasToken:!!s?.access_token},timestamp:Date.now(),hypothesisId:'H1,H2,H3,H5'})}).catch(()=>{});
      // #endregion
      setSession(s ? { access_token: s.access_token } : null);
      if (s?.access_token) {
        fetchUser(s.access_token);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    setSession(null);
    setUser(null);
    try {
      await supabase.auth.signOut();
    } catch {
      // Clear state already; ensure promise resolves so caller can navigate.
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signOut, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
