import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { ChatRoomsService } from '../chat/chat-rooms.service';
import type {
  ProfileOpenChatApplicationDto,
  ProfileOpenChatResponseDto,
} from './profiles.dto';

type ApplicationRow = {
  id: string;
  status: string;
  job_id: string;
  individual_id: string;
};

type JobRow = {
  id: string;
  title: string | null;
  company_id: string;
  is_deleted: boolean;
};

type ChatRoomRow = {
  id: string;
  application_id: string;
  company_id: string;
  individual_id: string;
};

/**
 * Opens (or creates) a job-application chat room between the viewer and a public profile user.
 */
@Injectable()
export class ProfileOpenChatService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly chatRooms: ChatRoomsService,
  ) {}

  async openChat(
    viewerId: string,
    profileId: string,
    body: { application_id?: string },
  ): Promise<ProfileOpenChatResponseDto> {
    if (viewerId === profileId) {
      throw new BadRequestException('Nemôžete písať sami sebe.');
    }
    const client = this.supabase.getClient();
    const { data: targetProfile, error: profileErr } = await client
      .from('profiles')
      .select('id, is_deleted, public_allow_platform_contact')
      .eq('id', profileId)
      .maybeSingle();
    if (profileErr || !targetProfile) {
      throw new NotFoundException('Profil nebol nájdený');
    }
    const target = targetProfile as {
      is_deleted?: boolean;
      public_allow_platform_contact?: boolean;
    };
    if (target.is_deleted) {
      throw new NotFoundException('Profil nebol nájdený');
    }
    if (target.public_allow_platform_contact === false) {
      throw new ForbiddenException(
        'Používateľ nepovoľuje kontakt cez platformu. Skúste iný spôsob, ak ho máte k dispozícii.',
      );
    }
    const { data: roomRows, error: roomErr } = await client
      .from('chat_rooms')
      .select('id, application_id, company_id, individual_id')
      .or(`company_id.eq.${viewerId},individual_id.eq.${viewerId}`);
    if (roomErr) {
      throw new ForbiddenException('Nepodarilo sa načítať konverzácie');
    }
    const peerRooms = ((roomRows ?? []) as ChatRoomRow[]).filter(
      (r) => r.company_id === profileId || r.individual_id === profileId,
    );
    if (peerRooms.length === 1 && !body.application_id) {
      return { room_id: peerRooms[0].id };
    }
    if (peerRooms.length > 0) {
      if (body.application_id) {
        const chosen = peerRooms.find((r) => r.application_id === body.application_id);
        if (!chosen) {
          throw new ForbiddenException('Neplatná prihláška pre tento profil');
        }
        return { room_id: chosen.id };
      }
      const applications = await this.buildApplicationPickerFromIds(
        peerRooms.map((r) => r.application_id),
      );
      return { applications };
    }
    const matching = await this.findMatchingApplications(viewerId, profileId);
    if (matching.length === 0) {
      throw new NotFoundException(
        'Najprv musí existovať prihláška na pracovnú ponuku medzi vami, aby ste mohli písať cez chat.',
      );
    }
    if (matching.length === 1) {
      const { room } = await this.chatRooms.ensureRoomForApplication(matching[0].id);
      return { room_id: room.id };
    }
    if (body.application_id) {
      const chosen = matching.find((a) => a.id === body.application_id);
      if (!chosen) {
        throw new ForbiddenException('Neplatná prihláška pre tento profil');
      }
      const { room } = await this.chatRooms.ensureRoomForApplication(chosen.id);
      return { room_id: room.id };
    }
    const applications: ProfileOpenChatApplicationDto[] = matching.map((a) => ({
      id: a.id,
      job_title: a.job_title,
      status: a.status,
    }));
    return { applications };
  }

  private async findMatchingApplications(
    viewerId: string,
    profileId: string,
  ): Promise<Array<{ id: string; status: string; job_title: string | null }>> {
    const client = this.supabase.getClient();
    const { data: apps, error } = await client
      .from('applications')
      .select('id, status, job_id, individual_id')
      .or(`individual_id.eq.${profileId},individual_id.eq.${viewerId}`)
      .eq('is_deleted', false);
    if (error) {
      throw new ForbiddenException('Nepodarilo sa načítať prihlášky');
    }
    const appRows = (apps ?? []) as ApplicationRow[];
    const jobIds = [...new Set(appRows.map((a) => a.job_id))];
    const jobById = new Map<string, JobRow>();
    if (jobIds.length > 0) {
      const { data: jobs, error: jobErr } = await client
        .from('job_offers')
        .select('id, title, company_id, is_deleted')
        .in('id', jobIds);
      if (jobErr) {
        throw new ForbiddenException('Nepodarilo sa načítať ponuky');
      }
      for (const j of (jobs ?? []) as JobRow[]) {
        jobById.set(j.id, j);
      }
    }
    const matching = appRows.filter((a) => {
      const j = jobById.get(a.job_id);
      if (!j || j.is_deleted) {
        return false;
      }
      const companyId = String(j.company_id);
      const individualId = String(a.individual_id);
      return (
        (individualId === profileId && companyId === viewerId) ||
        (individualId === viewerId && companyId === profileId)
      );
    });
    return matching.map((a) => ({
      id: a.id,
      status: a.status,
      job_title: jobById.get(a.job_id)?.title?.trim() || null,
    }));
  }

  private async buildApplicationPickerFromIds(
    applicationIds: string[],
  ): Promise<ProfileOpenChatApplicationDto[]> {
    const uniqueIds = [...new Set(applicationIds.filter(Boolean))];
    if (uniqueIds.length === 0) {
      return [];
    }
    const client = this.supabase.getClient();
    const { data: apps, error } = await client
      .from('applications')
      .select('id, status, job_id')
      .in('id', uniqueIds);
    if (error) {
      throw new ForbiddenException('Nepodarilo sa načítať prihlášky');
    }
    const appRows = (apps ?? []) as { id: string; status: string; job_id: string }[];
    const jobIds = [...new Set(appRows.map((a) => a.job_id))];
    const jobTitleById = new Map<string, string | null>();
    if (jobIds.length > 0) {
      const { data: jobs } = await client
        .from('job_offers')
        .select('id, title')
        .in('id', jobIds);
      for (const j of (jobs ?? []) as { id: string; title: string | null }[]) {
        jobTitleById.set(j.id, j.title?.trim() || null);
      }
    }
    return appRows.map((a) => ({
      id: a.id,
      job_title: jobTitleById.get(a.job_id) ?? null,
      status: a.status,
    }));
  }
}
