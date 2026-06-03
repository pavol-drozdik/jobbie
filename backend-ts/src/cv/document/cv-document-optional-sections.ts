/** Optional CV section toggles from `cv_personal_info.optional_sections` (no HTML sanitizer deps). */
export function optionalSectionEnabled(optionalSections: unknown, key: string): boolean {
  if (!optionalSections || typeof optionalSections !== 'object') {
    return true
  }
  const v = (optionalSections as Record<string, unknown>)[key]
  if (v === false) {
    return false
  }
  return true
}
