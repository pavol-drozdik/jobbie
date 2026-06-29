import { describe, expect, it } from 'vitest'
import { buildRegistrationSignUpMeta } from '~/composables/useRegistration'
import type { RegistrationCredentials } from '~/composables/useRegistration'

const baseCredentials: RegistrationCredentials = {
  accountType: 'individual',
  email: 'test@example.com',
  password: 'secret12',
  termsAgree: true,
  firstName: 'Ján',
  lastName: 'Novák',
  companyName: '',
  registeredOffice: '',
  ico: '',
  dic: '',
  vatId: '',
  birthDate: '2000-01-15',
}

describe('buildRegistrationSignUpMeta', () => {
  it('includes activity role flags when roles are provided', () => {
    const meta = buildRegistrationSignUpMeta(baseCredentials, null, {
      customer_role: true,
      worker_role: false,
      provider_role: true,
    })
    expect(meta.customer_role).toBe('true')
    expect(meta.worker_role).toBe('false')
    expect(meta.provider_role).toBe('true')
  })

  it('omits activity role flags when roles are not provided', () => {
    const meta = buildRegistrationSignUpMeta(baseCredentials, null, null)
    expect(meta.customer_role).toBeUndefined()
    expect(meta.worker_role).toBeUndefined()
    expect(meta.provider_role).toBeUndefined()
  })
})
