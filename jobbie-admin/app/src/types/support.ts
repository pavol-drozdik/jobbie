export type AdminJobDetail = {
  id: string
  title: string | null
  owner_id: string | null
  company_id: string | null
  is_active: boolean
  is_draft: boolean
  is_deleted: boolean
  status_label: string
  created_at: string
  updated_at: string | null
  published_at: string | null
  public_url: string
  credits_spent: number
}

export type AdminCompanyAdDetail = {
  id: string
  title: string | null
  owner_id: string | null
  status: string | null
  created_at: string
  updated_at: string | null
  city: string | null
  region: string | null
  public_url: string
  credits_spent: number
}

export type ApplicationListItem = {
  id: string
  job_id: string
  individual_id: string
  status: string
  created_at: string
  updated_at: string
}

export type ChatRoomListItem = {
  id: string
  company_id: string | null
  individual_id: string | null
  created_at: string | null
  updated_at: string | null
  last_message_at: string | null
  last_message_type: string | null
}

export type UserBillingSnapshot = {
  ledger: { items: Array<Record<string, unknown>> }
  stripe: {
    failed_webhooks_7d: number
    missing_fulfillments: string[]
  }
}
