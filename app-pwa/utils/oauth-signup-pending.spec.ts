import { describe, expect, it } from 'vitest'
import { buildProfilePatchFromSignupMeta } from '~/utils/oauth-signup-pending'

describe('buildProfilePatchFromSignupMeta', () => {
  it('maps individual wizard metadata to profile PATCH fields', () => {
    expect(
      buildProfilePatchFromSignupMeta({
        role: 'individual',
        first_name: 'Ján',
        last_name: 'Novák',
        display_name: 'Ján Novák',
        birth_date: '2000-01-15',
        customer_role: 'true',
        worker_role: 'false',
        provider_role: 'false',
      }),
    ).toEqual({
      display_name: 'Ján Novák',
      first_name: 'Ján',
      last_name: 'Novák',
      customer_role: true,
      worker_role: false,
      provider_role: false,
    })
  })

  it('maps company wizard metadata to profile PATCH fields', () => {
    expect(
      buildProfilePatchFromSignupMeta({
        role: 'company',
        company_name: 'ACME s.r.o.',
        registered_office: 'Bratislava',
        ico: '12345678',
        dic: '2023456789',
        ic_dph: 'SK2023456789',
        customer_role: 'true',
      }),
    ).toEqual({
      company_name: 'ACME s.r.o.',
      registered_office: 'Bratislava',
      registration_number: '12345678',
      tax_id: '2023456789',
      vat_id: 'SK2023456789',
      customer_role: true,
    })
  })
})
