/** Shown in chat and job context when the account was closed but rows remain. */
export const DELETED_ACCOUNT_DISPLAY_NAME = 'Účet bol odstránený';

export function displayNameFromProfileRow(
  p: {
    is_deleted?: boolean;
    display_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    company_name?: string | null;
  } | null | undefined,
): string | null {
  if (!p) {
    return null;
  }
  if (p.is_deleted === true) {
    return DELETED_ACCOUNT_DISPLAY_NAME;
  }
  const dn = (p.display_name as string | null | undefined)?.trim();
  if (dn) {
    return dn;
  }
  const full = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
  if (full) {
    return full;
  }
  const cn = (p.company_name as string | null | undefined)?.trim();
  return cn || null;
}

export function avatarUrlFromProfileRow(
  p: { is_deleted?: boolean; logo_url?: string | null } | null | undefined,
): string | null {
  if (!p || p.is_deleted === true) {
    return null;
  }
  return p.logo_url ?? null;
}
