import { createHmac, randomUUID } from 'crypto';

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalJson(v)).join(',')}]`;
  }
  const o = value as Record<string, unknown>;
  const keys = Object.keys(o).sort();
  const parts = keys.map(
    (k) => `${JSON.stringify(k)}:${canonicalJson(o[k])}`,
  );
  return `{${parts.join(',')}}`;
}

export function computeAuditRowHash(input: {
  readonly secret: string;
  readonly prevRowHash: string;
  readonly eventType: string;
  readonly occurredAtIso: string;
  readonly subjectType: string | null;
  readonly subjectId: string | null;
  readonly payload: Record<string, unknown>;
}): string {
  const basis = `${input.prevRowHash}|${input.eventType}|${input.occurredAtIso}|${input.subjectType ?? ''}|${input.subjectId ?? ''}|${canonicalJson(input.payload)}`;
  return createHmac('sha256', input.secret).update(basis).digest('hex');
}

export const AUDIT_CHAIN_GENESIS = 'GENESIS_AUDIT_CHAIN_ORIGIN';

export function newAuditEventId(): string {
  return randomUUID();
}
