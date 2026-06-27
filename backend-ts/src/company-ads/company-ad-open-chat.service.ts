import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { ChatRoomsService } from '../chat/chat-rooms.service';

export type CompanyAdOpenChatResponseDto = { room_id: string };

type CompanyAdRow = {
  id: string;
  owner_id: string;
  title: string | null;
  status: string;
  ends_at: string | null;
};

/**
 * Opens (or creates) a chat thread between a viewer and a Profesionáli ad owner.
 */
@Injectable()
export class CompanyAdOpenChatService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly chatRooms: ChatRoomsService,
  ) {}

  async openChat(viewerId: string, companyAdId: string): Promise<CompanyAdOpenChatResponseDto> {
    const client = this.supabase.getClient();
    const { data: adRow, error: adErr } = await client
      .from('company_ads')
      .select('id, owner_id, title, status, ends_at')
      .eq('id', companyAdId)
      .maybeSingle();
    if (adErr || !adRow) {
      throw new NotFoundException('Reklama nebola nájdená.');
    }
    const ad = adRow as CompanyAdRow;
    const ownerId = String(ad.owner_id);
    if (viewerId === ownerId) {
      throw new BadRequestException('Nemôžete písať sami sebe.');
    }
    const now = Date.now();
    const ends = ad.ends_at ? new Date(ad.ends_at).getTime() : 0;
    const isLive = ad.status === 'active' && ends > now;
    if (!isLive) {
      throw new NotFoundException('Reklama nebola nájdená.');
    }
    const { data: ownerProfile, error: ownerErr } = await client
      .from('profiles')
      .select('id, is_deleted, public_allow_platform_contact')
      .eq('id', ownerId)
      .maybeSingle();
    if (ownerErr || !ownerProfile) {
      throw new NotFoundException('Profil nebol nájdený');
    }
    const owner = ownerProfile as {
      is_deleted?: boolean;
      public_allow_platform_contact?: boolean;
    };
    if (owner.is_deleted) {
      throw new NotFoundException('Profil nebol nájdený');
    }
    if (owner.public_allow_platform_contact === false) {
      throw new ForbiddenException(
        'Používateľ nepovoľuje kontakt cez platformu. Skúste iný spôsob, ak ho máte k dispozícii.',
      );
    }
    const { room } = await this.chatRooms.ensureRoomForCompanyAdInquiry({
      companyAdId,
      ownerId,
      inquirerId: viewerId,
    });
    return { room_id: room.id };
  }
}
