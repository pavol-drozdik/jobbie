/** Category filter stored as `'all'` or comma-separated slug list (e.g. `stavba,gastro`). */

export function parseCategorySelection(raw: string | null | undefined): string[] {
  if (raw == null || raw === '' || raw === 'all') {
    return []
  }
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

export function joinCategorySelection(slugs: string[]): string {
  if (slugs.length === 0) {
    return 'all'
  }
  return slugs.join(',')
}

export function toggleCategorySlug(current: string, slug: string): string {
  const cur = parseCategorySelection(current)
  const i = cur.indexOf(slug)
  if (i >= 0) {
    return joinCategorySelection(cur.filter((_, j) => j !== i))
  }
  return joinCategorySelection([...cur, slug])
}
