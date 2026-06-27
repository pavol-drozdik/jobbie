export const MIN_INDIVIDUAL_REGISTRATION_AGE = 16

export function parseIsoDateOnly(value: string): Date | null {
  const trimmed = value.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null
  const [year, month, day] = trimmed.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }
  return date
}

export function isAtLeastAge(
  birthDate: Date,
  minAge: number,
  referenceDate: Date = new Date(),
): boolean {
  const ref = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
  )
  const latestAllowedBirth = new Date(
    ref.getFullYear() - minAge,
    ref.getMonth(),
    ref.getDate(),
  )
  return birthDate <= latestAllowedBirth
}

export function maxBirthDateForMinAge(
  minAge: number,
  referenceDate: Date = new Date(),
): string {
  const ref = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
  )
  const maxDate = new Date(ref.getFullYear() - minAge, ref.getMonth(), ref.getDate())
  const year = maxDate.getFullYear()
  const month = String(maxDate.getMonth() + 1).padStart(2, '0')
  const day = String(maxDate.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function validateIndividualRegistrationBirthDate(isoDate: string): string | null {
  const parsed = parseIsoDateOnly(isoDate)
  if (!parsed) {
    return 'Vyberte platný dátum narodenia.'
  }
  if (!isAtLeastAge(parsed, MIN_INDIVIDUAL_REGISTRATION_AGE)) {
    return 'Registrácia je dostupná len pre osoby staršie ako 16 rokov.'
  }
  return null
}
