import { useState, useCallback } from 'react';
import { router } from 'expo-router';
import { useAuth } from './auth-context';
import { getPendingRegistration } from './registration-cache';
import { useRegistration } from './registration-context';
import { supabase } from './supabase';
import { api } from './api';
import type { RegistrationPreferences } from './registration-context';

export type SignUpResult =
  | { ok: true; needsEmailConfirmation: false }
  | { ok: true; needsEmailConfirmation: true }
  | { ok: false; error: string };

export function useRegistrationSignUp() {
  const { credentials, roles, getMetaForSignUp, clear } = useRegistration();
  const { syncSession } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doSignUp = useCallback(
    async (
      prefsOverride: RegistrationPreferences | null,
    ): Promise<SignUpResult> => {
      const pending = getPendingRegistration();
      const effectiveCredentials = credentials ?? pending.credentials;
      const effectiveRoles = roles ?? pending.roles;
      if (!effectiveCredentials) {
        const msg = 'Chýbajú údaje. Začnite registráciu znova.';
        setError(msg);
        return { ok: false, error: msg };
      }
      setSaving(true);
      setError(null);
      try {
        const meta = getMetaForSignUp(
          prefsOverride ?? undefined,
          effectiveCredentials,
          effectiveRoles,
        );
        const { error: e } = await supabase.auth.signUp({
          email: effectiveCredentials.email,
          password: effectiveCredentials.password,
          options: { data: meta },
        });
        if (e) {
          setError(e.message ?? 'Registrácia zlyhala.');
          return { ok: false, error: e.message ?? 'Registrácia zlyhala.' };
        }

        let sessionData = await supabase.auth.getSession();
        let token = sessionData.data.session?.access_token;
        if (!token) {
          await new Promise((r) => setTimeout(r, 800));
          sessionData = await supabase.auth.getSession();
          token = sessionData.data.session?.access_token;
        }

        if (!token) {
          return { ok: true, needsEmailConfirmation: true };
        }

        await syncSession();
        const patchBody: Record<string, unknown> = {};
        if (effectiveCredentials.accountType === 'individual') {
          patchBody.display_name =
            `${effectiveCredentials.firstName} ${effectiveCredentials.lastName}`.trim();
          patchBody.first_name = effectiveCredentials.firstName || null;
          patchBody.last_name = effectiveCredentials.lastName || null;
        } else {
          patchBody.company_name = effectiveCredentials.companyName || null;
          patchBody.registered_office =
            effectiveCredentials.registeredOffice || null;
          patchBody.registration_number = effectiveCredentials.ico || null;
          patchBody.tax_id = effectiveCredentials.dic || null;
          patchBody.vat_id = effectiveCredentials.vatId
            ? effectiveCredentials.vatId
            : null;
        }
        if (prefsOverride) {
          if (prefsOverride.job_interests != null)
            patchBody.job_interests = prefsOverride.job_interests;
          if (prefsOverride.location != null)
            patchBody.location = prefsOverride.location;
          if (prefsOverride.sector != null)
            patchBody.sector = prefsOverride.sector;
        }
        if (Object.keys(patchBody).length > 0) {
          await api('/api/profiles/me', {
            token,
            method: 'PATCH',
            body: patchBody,
          });
        }
        clear();
        router.replace('/(auth)/register/welcome');
        return { ok: true, needsEmailConfirmation: false };
      } catch {
        const msg = 'Pri registrácii sa vyskytla chyba.';
        setError(msg);
        return { ok: false, error: msg };
      } finally {
        setSaving(false);
      }
    },
    [credentials, roles, getMetaForSignUp, clear, syncSession],
  );

  return { doSignUp, saving, error, setError };
}
