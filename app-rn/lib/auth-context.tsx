import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { api } from './api';

export type UserRole = 'company' | 'individual';

export type CurrentUser = {
  id: string;
  email: string;
  role: UserRole;
};

type AuthContextValue = {
  user: CurrentUser | null;
  session: { access_token: string } | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<{ access_token: string } | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async (token: string) => {
    const res = await api<{ id: string; email: string; role: string }>(
      '/api/auth/me',
      { token }
    );
    if (res.ok && res.data) {
      setUser({
        id: res.data.id,
        email: res.data.email,
        role: res.data.role as UserRole,
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
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
    } = supabase.auth.onAuthStateChange((_event, s) => {
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
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
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
