import type { CompanyAdResponseDto } from './company-ads.dto';

export type CompanyAdViewerContext = {
  userId?: string | null;
  isAdmin?: boolean;
};

// SECURITY: Tax IDs and contact fields only for owner/admin — use mapCompanyAdForViewer on public routes.
export function redactPublicCompanyAdFields(
  dto: CompanyAdResponseDto,
): CompanyAdResponseDto {
  const showPhone = dto.show_phone_publicly === true;
  const showEmail = dto.show_email_publicly === true;
  const showExactAddress = dto.show_exact_address === true;
  return {
    ...dto,
    contact_email: showEmail ? dto.contact_email : null,
    contact_phone: showPhone ? dto.contact_phone : null,
    street_address: showExactAddress ? dto.street_address : null,
    ico: null,
    dic: null,
    ic_dph: null,
  };
}

export function mapCompanyAdForViewer(
  dto: CompanyAdResponseDto,
  viewer: CompanyAdViewerContext | null,
): CompanyAdResponseDto {
  const isOwner = Boolean(viewer?.userId && dto.owner_id === viewer.userId);
  const isAdmin = viewer?.isAdmin === true;
  if (isOwner || isAdmin) {
    return dto;
  }
  return redactPublicCompanyAdFields(dto);
}

export function companyAdViewerFromUser(user: {
  id: string;
  appRole?: string;
} | null): CompanyAdViewerContext | null {
  if (!user) return null;
  return {
    userId: user.id,
    isAdmin: user.appRole === 'admin',
  };
}
