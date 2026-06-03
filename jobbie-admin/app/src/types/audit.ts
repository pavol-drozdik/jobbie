export type AuditEventItem = {
  id: string
  occurred_at: string
  event_type: string
  actor_user_id: string | null
  actor_label: string | null
  actor_ip: string | null
  actor_user_agent: string | null
  session_id: string | null
  device_id: string | null
  subject_type: string | null
  subject_id: string | null
  payload: Record<string, unknown>
  row_hash: string
}

export type AuditEventsResponse = {
  items: AuditEventItem[]
  next_cursor: string | null
}

export type AuditChainVerifyResult = {
  valid: boolean
  checked: number
  detail?: string
}
