import { S } from '~/utils/strings'

/** Matches Supabase Auth dashboard: minimum password length (recommended 8+). */
export const PASSWORD_MIN_LENGTH = 8

const HAS_LETTER = /[A-Za-z]/
const HAS_DIGIT = /\d/

/** Slovak hint for password field placeholders and helper text. */
export function passwordPolicyHint(): string {
  return S.passwordPolicyHint
}

/**
 * Client-side password policy aligned with Supabase Auth (min 8, letters and digits).
 * Returns a user-facing error string, or null when valid.
 */
export function validatePassword(value: string): string | null {
  if (value.length < PASSWORD_MIN_LENGTH) {
    return S.settingsPasswordMinLength
  }
  if (!HAS_LETTER.test(value) || !HAS_DIGIT.test(value)) {
    return S.passwordPolicyComplexity
  }
  return null
}
