/** Must match `CV_DRIVING_LICENSE_CATEGORIES` in backend-ts/src/cv/cv.dto.js */
export const CV_DRIVING_LICENSE_CATEGORIES = [
  'AM',
  'A1',
  'A2',
  'A',
  'B1',
  'B',
  'BE',
  'C1',
  'C1E',
  'C',
  'CE',
  'D1',
  'D1E',
  'D',
  'DE',
  'T',
] as const

export type CvDrivingLicenseCategory = (typeof CV_DRIVING_LICENSE_CATEGORIES)[number]

/**
 * When user selects a category, also store lower/included groups per „Oprávnenie na“ (SK vodičák).
 * Deselect removes only the clicked chip.
 */
export const CV_LICENSE_SELECTION_INCLUDES: Record<
  CvDrivingLicenseCategory,
  readonly CvDrivingLicenseCategory[]
> = {
  AM: ['AM'],
  A1: ['A1', 'AM'],
  A2: ['A2', 'A1', 'AM'],
  A: ['A', 'AM', 'A1', 'A2'],
  B1: ['B1', 'AM'],
  B: ['B', 'AM', 'B1'],
  BE: ['BE'],
  C1: ['C1', 'T'],
  C1E: ['C1E', 'BE', 'T'],
  C: ['C', 'C1', 'T'],
  CE: ['C', 'CE', 'C1E', 'BE', 'T'],
  D1: ['D1', 'T'],
  D1E: ['D1E', 'BE', 'T'],
  D: ['D', 'D1', 'T'],
  DE: ['DE', 'D1E', 'BE', 'T'],
  T: ['T'],
}

export function categoriesIncludedWhenSelecting(
  lic: CvDrivingLicenseCategory,
): CvDrivingLicenseCategory[] {
  return [...CV_LICENSE_SELECTION_INCLUDES[lic]]
}

/** Maps CV builder chip → `DRIVER_LICENSES` id in job-alert-options (job offers / alerts). */
export const CV_LICENSE_TO_DRIVER_ID: Record<
  CvDrivingLicenseCategory,
  number
> = {
  AM: 4,
  A1: 2,
  A2: 3,
  A: 1,
  B1: 6,
  B: 5,
  BE: 11,
  C1: 8,
  C1E: 14,
  C: 7,
  CE: 12,
  D1: 10,
  D1E: 15,
  D: 9,
  DE: 13,
  T: 16,
}

export function cvCategoriesToDriverLicenseIds(
  categories: readonly CvDrivingLicenseCategory[],
): number[] {
  const ids = new Set<number>()
  for (const cat of categories) {
    const id = CV_LICENSE_TO_DRIVER_ID[cat]
    if (id != null) ids.add(id)
  }
  return [...ids].sort((a, b) => a - b)
}

/** Restore CV chips from stored job `driver_licenses` ids (includes legacy podskupiny). */
export function driverLicenseIdsToCvCategories(
  ids: number[],
): CvDrivingLicenseCategory[] {
  const idSet = new Set(ids)
  return CV_DRIVING_LICENSE_CATEGORIES.filter((cat) =>
    idSet.has(CV_LICENSE_TO_DRIVER_ID[cat]),
  )
}

/** Preserve builder chip order (not Set / click order). */
export function sortCvDrivingLicenseCategories(
  categories: readonly string[],
): CvDrivingLicenseCategory[] {
  const selected = new Set(
    categories
      .map((c) => String(c).trim().toUpperCase())
      .filter((c): c is CvDrivingLicenseCategory =>
        (CV_DRIVING_LICENSE_CATEGORIES as readonly string[]).includes(c),
      ),
  )
  return CV_DRIVING_LICENSE_CATEGORIES.filter((cat) => selected.has(cat))
}

export function isCvDriverLicenseCategoryActive(
  selected: readonly CvDrivingLicenseCategory[],
  category: CvDrivingLicenseCategory,
): boolean {
  return selected.includes(category)
}

/** Same toggle rules as CV builder (`CvPrototypeShell.toggleLicense`). */
export function toggleCvDriverLicenseCategory(
  selected: readonly CvDrivingLicenseCategory[],
  category: CvDrivingLicenseCategory,
): CvDrivingLicenseCategory[] {
  const next = new Set(selected)
  if (next.has(category)) {
    next.delete(category)
  } else {
    for (const cat of categoriesIncludedWhenSelecting(category)) {
      next.add(cat)
    }
  }
  return CV_DRIVING_LICENSE_CATEGORIES.filter((cat) => next.has(cat))
}
