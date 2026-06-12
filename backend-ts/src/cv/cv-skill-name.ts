import { randomUUID } from 'crypto';

/** Internal DB placeholder so multiple in-progress skill rows are allowed before migration drops legacy unique (cv_id, skill_name). */
export const CV_SKILL_DRAFT_PREFIX = '__jb_draft:';

export function displaySkillName(storage: string | null | undefined): string {
  if (storage == null) return '';
  const s = String(storage);
  if (s === '' || s.startsWith(CV_SKILL_DRAFT_PREFIX)) return '';
  return s;
}

export function isDraftSkillStorageName(storage: string | null | undefined): boolean {
  if (storage == null) return true;
  const s = String(storage);
  return s === '' || s.startsWith(CV_SKILL_DRAFT_PREFIX);
}

export function draftSkillStorageName(): string {
  return `${CV_SKILL_DRAFT_PREFIX}${randomUUID()}`;
}
