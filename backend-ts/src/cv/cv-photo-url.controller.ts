import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwksAuthGuard } from '../auth/jwks-auth.guard';
import { CurrentUserDecorator } from '../auth/current-user.decorator';
import type { CurrentUser } from '../auth/auth.types';
import { SupabaseService } from '../supabase/supabase.service';
import { StorageUploadService } from '../storage/storage-upload.service';
import { CvService } from './cv.service';

type CvRowForPhoto = {
  id: string;
  user_id: string;
  photo_url: string | null;
  photo_storage_path: string | null;
  visible_to_employers: boolean | null;
};

function cvOwnerIdsMatch(shellUserId: string, viewerUserId: string): boolean {
  const a = String(shellUserId ?? '').trim().toLowerCase();
  const b = String(viewerUserId ?? '').trim().toLowerCase();
  return Boolean(a && b && a === b);
}

/**
 * Read endpoint for the new private `cv-photos` bucket.
 *
 * Photos uploaded after 2026-06-28 land in a private bucket; clients call
 * this endpoint to receive a short-lived signed URL. Authorization:
 *  - The CV owner can always fetch their own photo URL.
 *  - An employer can fetch the photo URL when the CV is visible to
 *    employers AND either `show_contact_details` is on or the employer has
 *    a `cv_contact_unlocks` row for the CV.
 *
 * Legacy photos still stored in the public `profile-avatars` bucket are
 * returned via their stable public URL — `isPrivateCvPhotoPath` selects
 * which code path applies.
 */
@Controller('cv')
@UseGuards(JwksAuthGuard)
export class CvPhotoUrlController {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly storageUpload: StorageUploadService,
    private readonly cvService: CvService,
  ) {}

  @Get(':cvId/photo-url')
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  async getPhotoUrl(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('cvId', ParseUUIDPipe) cvId: string,
  ): Promise<{ url: string; expires_in_seconds: number }> {
    const client = this.supabase.getClient();
    const [{ data: cvData }, { data: personalData }] = await Promise.all([
      client
        .from('cvs')
        .select('id, user_id, photo_url, photo_storage_path, visible_to_employers')
        .eq('id', cvId)
        .maybeSingle(),
      client
        .from('cv_personal_info')
        .select('show_contact_details')
        .eq('cv_id', cvId)
        .maybeSingle(),
    ]);
    const cv = cvData as CvRowForPhoto | null;
    const showContactDetails =
      (personalData as { show_contact_details?: boolean | null } | null)
        ?.show_contact_details !== false;
    const storagePath = (cv?.photo_storage_path ?? cv?.photo_url ?? '').trim();
    if (!cv || !storagePath) {
      throw new NotFoundException('CV photo not found');
    }
    const isOwner = cvOwnerIdsMatch(cv.user_id, user.id);
    if (!isOwner) {
      if (!cv.visible_to_employers) {
        throw new NotFoundException('CV photo not found');
      }
      const isEmployerLikeService = this.cvService as unknown as {
        isEmployerViewer?: (userId: string) => Promise<boolean>;
        hasContactUnlock?: (
          employerId: string,
          cvId: string,
        ) => Promise<boolean>;
      };
      const isEmployer = isEmployerLikeService.isEmployerViewer
        ? await isEmployerLikeService.isEmployerViewer(user.id)
        : false;
      if (!isEmployer) {
        throw new NotFoundException('CV photo not found');
      }
      if (!showContactDetails) {
        const hasUnlock = isEmployerLikeService.hasContactUnlock
          ? await isEmployerLikeService.hasContactUnlock(user.id, cvId)
          : false;
        if (!hasUnlock) {
          throw new NotFoundException('CV photo not found');
        }
      }
    }
    const url = await this.storageUpload.resolveCvPhotoViewUrl(storagePath, 600);
    const expiresIn =
      this.storageUpload.isPrivateCvPhotoPath(storagePath) ? 600 : 0;
    return { url, expires_in_seconds: expiresIn };
  }
}
