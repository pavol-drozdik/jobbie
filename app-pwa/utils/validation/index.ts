export function requiredString(
  value: string | null | undefined,
  message: string,
): string | null {
  if (!value?.trim()) return message
  return null
}

export function validateEmail(
  value: string,
  message = 'Zadajte platný e-mail.',
): string | null {
  const trimmed = value.trim()
  if (!trimmed) return message
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return message
  return null
}

export function validateMinLength(
  value: string,
  min: number,
  message: string,
): string | null {
  if (value.trim().length < min) return message
  return null
}
