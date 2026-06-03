export interface AuditRecordInput {
  readonly actorUserId: string | null;
  readonly actorIp: string | null;
  readonly actorUserAgent: string | null;
  readonly sessionId: string | null;
  readonly deviceId: string | null;
  readonly eventType: string;
  readonly subjectType: string | null;
  readonly subjectId: string | null;
  readonly payload: Record<string, unknown>;
}

export interface AuthSecurityEventInput {
  readonly emailNormalized: string | null;
  readonly actorUserId: string | null;
  readonly eventKind: string;
  readonly success: boolean | null;
  readonly ip: string | null;
  readonly userAgent: string | null;
  readonly deviceId: string | null;
  readonly metadata?: Record<string, unknown>;
  readonly auditEventId?: string | null;
}
