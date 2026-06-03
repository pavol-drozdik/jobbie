import type { JobOfferResponseDto } from './jobs.dto';

export type JobViewerContext = {
  userId?: string | null;
  isAdmin?: boolean;
};

// SECURITY: Anonymous/optional-auth list/detail must use mapJobForViewer — never spread full DB rows.
/** Strip contact fields for anonymous/public API consumers. */
export function redactPublicJobFields(
  dto: JobOfferResponseDto,
): JobOfferResponseDto {
  const showPhone = dto.show_phone_publicly === true;
  const showExactAddress = dto.show_exact_address === true;
  return {
    ...dto,
    employer_email: null,
    contact_email: null,
    contact_phone: showPhone ? dto.contact_phone : null,
    location_address: showExactAddress ? dto.location_address : null,
  };
}

export function mapJobForViewer(
  dto: JobOfferResponseDto,
  viewer: JobViewerContext | null,
): JobOfferResponseDto {
  const isOwner = Boolean(viewer?.userId && dto.company_id === viewer.userId);
  const isAdmin = viewer?.isAdmin === true;
  if (isOwner || isAdmin) {
    return dto;
  }
  return redactPublicJobFields(dto);
}

export function viewerFromUser(user: {
  id: string;
  appRole?: string;
} | null): JobViewerContext | null {
  if (!user) return null;
  return {
    userId: user.id,
    isAdmin: user.appRole === 'admin',
  };
}
