import type { SupabaseClient } from '@supabase/supabase-js';

export type AuditEventsFilter = {
  readonly userId?: string;
  readonly eventType?: string;
  readonly subjectId?: string;
  readonly from?: string;
  readonly to?: string;
  readonly cursor?: string;
  readonly limit: number;
  readonly ascending?: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AuditQuery = any;

export function buildAuditEventsQuery(
  client: SupabaseClient,
  filter: AuditEventsFilter,
): AuditQuery {
  let q = client
    .from('audit_events')
    .select('*')
    .order('occurred_at', { ascending: filter.ascending ?? false })
    .limit(filter.limit + 1);
  if (filter.userId?.trim()) {
    q = q.eq('actor_user_id', filter.userId.trim());
  }
  if (filter.eventType?.trim()) {
    const et = filter.eventType.trim();
    if (et.endsWith('.') || et.endsWith('%')) {
      const prefix = et.replace(/%$/, '');
      q = q.like('event_type', `${prefix}%`);
    } else {
      q = q.eq('event_type', et);
    }
  }
  if (filter.subjectId?.trim()) {
    q = q.eq('subject_id', filter.subjectId.trim());
  }
  if (filter.from?.trim()) {
    q = q.gte('occurred_at', filter.from.trim());
  }
  if (filter.to?.trim()) {
    q = q.lte('occurred_at', filter.to.trim());
  }
  if (filter.cursor?.trim()) {
    q = q.lt('occurred_at', filter.cursor.trim());
  }
  return q;
}

export async function fetchActorLabels(
  client: SupabaseClient,
  actorIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const unique = [...new Set(actorIds.filter(Boolean))];
  if (unique.length === 0) return map;
  const { data } = await client
    .from('profiles')
    .select('id, display_name, company_name')
    .in('id', unique);
  for (const p of data ?? []) {
    const row = p as {
      id: string;
      display_name?: string | null;
      company_name?: string | null;
    };
    const label =
      row.company_name?.trim() || row.display_name?.trim() || '';
    map.set(row.id, label || row.id.slice(0, 8) + '…');
  }
  return map;
}
