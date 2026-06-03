export type AuditEventRowDto = {
  readonly id: string;
  readonly occurred_at: string;
  readonly event_type: string;
  readonly actor_user_id: string | null;
  readonly actor_label: string | null;
  readonly actor_ip: string | null;
  readonly actor_user_agent: string | null;
  readonly session_id: string | null;
  readonly device_id: string | null;
  readonly subject_type: string | null;
  readonly subject_id: string | null;
  readonly payload: Record<string, unknown>;
  readonly row_hash: string;
};

export type AuditEventsListDto = {
  readonly items: AuditEventRowDto[];
  readonly next_cursor: string | null;
};

export function shortUuid(id: string | null | undefined): string {
  if (!id) return '—';
  const s = String(id);
  return s.length > 8 ? `${s.slice(0, 8)}…` : s;
}

export function actorLabelFromProfile(
  userId: string | null | undefined,
  profile: {
    display_name?: string | null;
    company_name?: string | null;
  } | null,
): string | null {
  if (!userId) return null;
  const name =
    profile?.company_name?.trim() || profile?.display_name?.trim() || '';
  if (name) return name;
  return shortUuid(userId);
}

export function csvEscape(value: unknown): string {
  if (value == null) return '""';
  const s =
    typeof value === 'object'
      ? JSON.stringify(value)
      : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

export function rowToAuditEventDto(
  row: Record<string, unknown>,
  actorLabels: Map<string, string>,
): AuditEventRowDto {
  const actorId = row.actor_user_id ? String(row.actor_user_id) : null;
  const payload =
    row.payload && typeof row.payload === 'object' && !Array.isArray(row.payload)
      ? (row.payload as Record<string, unknown>)
      : {};
  return {
    id: String(row.id ?? ''),
    occurred_at: String(row.occurred_at ?? ''),
    event_type: String(row.event_type ?? ''),
    actor_user_id: actorId,
    actor_label: actorId
      ? (actorLabels.get(actorId) ?? shortUuid(actorId))
      : null,
    actor_ip: row.actor_ip != null ? String(row.actor_ip) : null,
    actor_user_agent:
      row.actor_user_agent != null ? String(row.actor_user_agent) : null,
    session_id: row.session_id != null ? String(row.session_id) : null,
    device_id: row.device_id != null ? String(row.device_id) : null,
    subject_type: row.subject_type != null ? String(row.subject_type) : null,
    subject_id: row.subject_id != null ? String(row.subject_id) : null,
    payload,
    row_hash: String(row.row_hash ?? ''),
  };
}
