export type CookieConsentLogItem = {
  id: string
  visitor_id: string
  user_id: string | null
  action: string
  analytics: boolean
  marketing: boolean
  personalization: boolean
  policy_version: number
  source: string | null
  page_path: string | null
  user_agent: string | null
  recorded_at: string
}

export type CookieConsentLogResponse = {
  items: CookieConsentLogItem[]
  next_cursor: string | null
}
