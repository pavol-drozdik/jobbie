/**
 * In-memory cache for registration data so sign-up can complete even if
 * RegistrationProvider remounts (e.g. on router.replace to complete-profile).
 */

import type {
  RegistrationCredentials,
  RegistrationPreferences,
  RegistrationRoles,
} from './registration-context';

let pendingCredentials: RegistrationCredentials | null = null;
let pendingRoles: RegistrationRoles | null = null;
let pendingPreferences: RegistrationPreferences | null = null;

export function setPendingCredentials(c: RegistrationCredentials): void {
  pendingCredentials = c;
}

export function setPendingRoles(r: RegistrationRoles): void {
  pendingRoles = r;
}

export function setPendingPreferences(p: RegistrationPreferences): void {
  pendingPreferences = p;
}

export function getPendingRegistration(): {
  credentials: RegistrationCredentials | null;
  roles: RegistrationRoles | null;
  preferences: RegistrationPreferences | null;
} {
  return {
    credentials: pendingCredentials,
    roles: pendingRoles,
    preferences: pendingPreferences,
  };
}

export function clearPendingRegistration(): void {
  pendingCredentials = null;
  pendingRoles = null;
  pendingPreferences = null;
}
