import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export type ChatRoomDbRow = {
  id: string;
  job_id: string;
  company_id: string;
  individual_id: string;
  application_id: string | null;
  created_at: string;
  company_last_read_at?: string | null;
  individual_last_read_at?: string | null;
};

/**
 * Persists chat_rooms rows. Application threads use application_id; CV-database outreach uses null.
 */
@Injectable()
export class ChatRoomsService {
  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Loads the application and job, then returns an existing room or inserts one.
   * Does not authorize the caller — the caller must verify the acting user may access this application.
   */
  async ensureRoomForApplication(applicationId: string): Promise<{
    room: ChatRoomDbRow;
    applicationStatus: string;
  }> {
    const client = this.supabase.getClient();
    const { data: app, error: appErr } = await client
      .from('applications')
      .select('id, job_id, individual_id, status')
      .eq('id', applicationId)
      .single();
    if (appErr || !app) {
      throw new NotFoundException('Application not found');
    }
    const a = app as { job_id: string; individual_id: string; status: string };
    const { data: job, error: jobErr } = await client
      .from('job_offers')
      .select('company_id')
      .eq('id', a.job_id)
      .single();
    if (jobErr || !job) {
      throw new NotFoundException('Job not found');
    }
    const companyId = (job as { company_id: string }).company_id;
    const { data: existing } = await client
      .from('chat_rooms')
      .select('*')
      .eq('application_id', applicationId)
      .maybeSingle();
    if (existing) {
      return { room: existing as ChatRoomDbRow, applicationStatus: a.status };
    }
    const { data: created, error } = await client
      .from('chat_rooms')
      .insert({
        job_id: a.job_id,
        company_id: companyId,
        individual_id: a.individual_id,
        application_id: applicationId,
      })
      .select()
      .single();
    if (error || !created) {
      throw new ForbiddenException('Failed to create room');
    }
    return { room: created as ChatRoomDbRow, applicationStatus: a.status };
  }

  /**
   * CV-database contact: one outreach thread per (company, candidate) without an application.
   * Caller must verify employer may contact the individual (unlock, platform contact flag).
   */
  async ensureRoomForCvDatabaseOutreach(input: {
    companyId: string;
    individualId: string;
    jobId: string;
  }): Promise<{ room: ChatRoomDbRow }> {
    const client = this.supabase.getClient();
    const { data: existing } = await client
      .from('chat_rooms')
      .select('*')
      .eq('company_id', input.companyId)
      .eq('individual_id', input.individualId)
      .is('application_id', null)
      .maybeSingle();
    if (existing) {
      return { room: existing as ChatRoomDbRow };
    }
    const { data: created, error } = await client
      .from('chat_rooms')
      .insert({
        job_id: input.jobId,
        company_id: input.companyId,
        individual_id: input.individualId,
        application_id: null,
      })
      .select()
      .single();
    if (error || !created) {
      throw new ForbiddenException('Failed to create room');
    }
    return { room: created as ChatRoomDbRow };
  }
}
