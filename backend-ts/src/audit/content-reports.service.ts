import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { AuditService } from './audit.service';

@Injectable()
export class ContentReportsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly audit: AuditService,
  ) {}

  async createReport(
    reporterUserId: string,
    input: {
      target_type: string;
      target_id: string;
      reason: string;
    },
  ) {
    const { data, error } = await this.supabase
      .getClient()
      .from('content_reports')
      .insert({
        reporter_user_id: reporterUserId,
        target_type: input.target_type,
        target_id: input.target_id,
        reason: input.reason,
        status: 'open',
      })
      .select('id')
      .single();
    if (error) {
      throw new NotFoundException('Report could not be created');
    }
    void this.audit.recordAuditEvent({
      actorUserId: reporterUserId,
      actorIp: null,
      actorUserAgent: null,
      sessionId: null,
      deviceId: null,
      eventType: 'content.report.created',
      subjectType: input.target_type,
      subjectId: input.target_id,
      payload: { report_id: (data as { id: string }).id },
    });
    return data;
  }
}
