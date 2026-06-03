/** Default step-up window for localhost admin (2 h). Override via ADMIN_RECENT_LOGIN_MINUTES. */
export const DEFAULT_ADMIN_RECENT_LOGIN_MINUTES = 120;

const MIN_ADMIN_RECENT_LOGIN_MINUTES = 1;
const MAX_ADMIN_RECENT_LOGIN_MINUTES = 24 * 60;

export function parseAdminRecentLoginMinutes(
  raw: string | undefined,
): number {
  if (!raw?.trim()) {
    return DEFAULT_ADMIN_RECENT_LOGIN_MINUTES;
  }
  const n = Number.parseInt(raw.trim(), 10);
  if (!Number.isFinite(n) || n < MIN_ADMIN_RECENT_LOGIN_MINUTES) {
    return DEFAULT_ADMIN_RECENT_LOGIN_MINUTES;
  }
  return Math.min(n, MAX_ADMIN_RECENT_LOGIN_MINUTES);
}

export function adminRecentLoginSecondsFromMinutes(minutes: number): number {
  return minutes * 60;
}
