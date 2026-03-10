import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from 'react';
import {
  setPendingCredentials,
  setPendingRoles,
  setPendingPreferences,
  clearPendingRegistration,
} from './registration-cache';

export type AccountType = 'individual' | 'company';

export type RegistrationCredentials = {
  accountType: AccountType;
  email: string;
  password: string;
  termsAgree: boolean;
  firstName: string;
  lastName: string;
  companyName: string;
  registeredOffice: string;
  ico: string;
  dic: string;
  vatId: string;
};

export type RegistrationRoles = {
  looking_for_work: boolean;
  offering_work: boolean;
};

export type RegistrationPreferences = {
  job_interests: string | null;
  location: string | null;
  sector: string | null;
};

type RegistrationState = {
  credentials: RegistrationCredentials | null;
  roles: RegistrationRoles | null;
  preferences: RegistrationPreferences | null;
};

type RegistrationContextValue = {
  credentials: RegistrationCredentials | null;
  roles: RegistrationRoles | null;
  preferences: RegistrationPreferences | null;
  setCredentials: (c: RegistrationCredentials) => void;
  setRoles: (r: RegistrationRoles) => void;
  setPreferences: (p: RegistrationPreferences) => void;
  getMetaForSignUp: (
    preferencesOverride?: RegistrationPreferences,
    credentialsOverride?: RegistrationCredentials | null,
    rolesOverride?: RegistrationRoles | null,
  ) => Record<string, string>;
  clear: () => void;
};

const RegistrationContext = createContext<RegistrationContextValue | null>(
  null,
);

export function RegistrationProvider({ children }: { children: React.ReactNode }) {
  const [credentials, setCredentialsState] =
    useState<RegistrationCredentials | null>(null);
  const [roles, setRolesState] = useState<RegistrationRoles | null>(null);
  const [preferences, setPreferencesState] =
    useState<RegistrationPreferences | null>(null);

  const setCredentials = useCallback((c: RegistrationCredentials) => {
    setCredentialsState(c);
    setPendingCredentials(c);
  }, []);

  const setRoles = useCallback((r: RegistrationRoles) => {
    setRolesState(r);
    setPendingRoles(r);
  }, []);

  const setPreferences = useCallback((p: RegistrationPreferences) => {
    setPreferencesState(p);
    setPendingPreferences(p);
  }, []);

  const getMetaForSignUp = useCallback(
    (
      preferencesOverride?: RegistrationPreferences,
      credentialsOverride?: RegistrationCredentials | null,
      rolesOverride?: RegistrationRoles | null,
    ) => {
      const meta: Record<string, string> = {};
      const creds = credentialsOverride ?? credentials;
      const rols = rolesOverride ?? roles;
      if (!creds) return meta;
      meta.role = creds.accountType;
      if (rols) {
        meta.looking_for_work = rols.looking_for_work ? 'true' : 'false';
        meta.offering_work = rols.offering_work ? 'true' : 'false';
      }
      if (creds.accountType === 'individual') {
        meta.first_name = creds.firstName.trim();
        meta.last_name = creds.lastName.trim();
        meta.display_name =
          `${creds.firstName.trim()} ${creds.lastName.trim()}`.trim();
      } else {
        meta.company_name = creds.companyName.trim();
        meta.registered_office = creds.registeredOffice.trim();
        meta.ico = creds.ico.trim();
        meta.dic = creds.dic.trim();
        if (creds.vatId.trim()) meta.ic_dph = creds.vatId.trim();
      }
      const prefs = preferencesOverride ?? preferences;
      if (prefs) {
        if (prefs.job_interests != null && prefs.job_interests !== '')
          meta.job_interests = prefs.job_interests;
        if (prefs.location != null && prefs.location !== '')
          meta.location = prefs.location;
        if (prefs.sector != null && prefs.sector !== '')
          meta.sector = prefs.sector;
      }
      return meta;
    },
    [credentials, roles, preferences],
  );

  const clear = useCallback(() => {
    setCredentialsState(null);
    setRolesState(null);
    setPreferencesState(null);
    clearPendingRegistration();
  }, []);

  const value = useMemo<RegistrationContextValue>(
    () => ({
      credentials,
      roles,
      preferences,
      setCredentials,
      setRoles,
      setPreferences,
      getMetaForSignUp,
      clear,
    }),
    [
      credentials,
      roles,
      preferences,
      setCredentials,
      setRoles,
      setPreferences,
      getMetaForSignUp,
      clear,
    ],
  );

  return (
    <RegistrationContext.Provider value={value}>
      {children}
    </RegistrationContext.Provider>
  );
}

export function useRegistration() {
  const ctx = useContext(RegistrationContext);
  if (!ctx)
    throw new Error('useRegistration must be used within RegistrationProvider');
  return ctx;
}
