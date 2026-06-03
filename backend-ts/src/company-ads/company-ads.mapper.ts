import type {
  CompanyAdGalleryItem,
  CompanyAdListItemDto,
  CompanyAdResponseDto,
} from './company-ads.dto';
import {
  companyAdViewerFromUser,
  mapCompanyAdForViewer,
  type CompanyAdViewerContext,
} from './public-response.mapper';
import type { CurrentUser } from '../auth/auth.types';
import type { CompanyAdFieldsDto } from './company-ads.dto';
import { normalizeJobCategorySlugOrNull } from '../common/job-categories.constants';
import { sanitizeExternalUrl } from '../common/sanitize-external-url.util';
import { parseOptionalMoneyAmount } from '../common/money-amount.util';

function normalizeAdCategory(category: unknown): string {
  const raw = category != null ? String(category) : '';
  return normalizeJobCategorySlugOrNull(raw) ?? raw;
}

export type AdRow = Record<string, unknown> & {
  id: string;
  owner_id: string;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
};

export type OwnerListRow = {
  id: string;
  role?: string | null;
  location: string | null;
  company_name: string | null;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  logo_url: string | null;
  avatar_url: string | null;
  registry_verified_at: string | null;
};

/** Mirrors public profile display-name resolution (display_name → first+last → company_name). */
export function resolveOwnerDisplayNameFromProfile(
  owner: OwnerListRow | undefined,
): string | null {
  if (!owner) return null;
  const display = (owner.display_name ?? '').trim();
  if (display) return display;
  const full = [owner.first_name, owner.last_name]
    .map((p) => (p ?? '').trim())
    .filter(Boolean)
    .join(' ');
  if (full) return full;
  const company = (owner.company_name ?? '').trim();
  return company || null;
}

export function ownerSnapshotFromProfile(owner: OwnerListRow | undefined): {
  owner_location: string | null;
  owner_display_name: string | null;
  owner_company_name: string | null;
  owner_logo_url: string | null;
  owner_avatar_url: string | null;
  owner_registry_verified: boolean;
  owner_role: string | null;
} {
  if (!owner) {
    return {
      owner_location: null,
      owner_display_name: null,
      owner_company_name: null,
      owner_logo_url: null,
      owner_avatar_url: null,
      owner_registry_verified: false,
      owner_role: null,
    };
  }
  const companyName = (owner.company_name ?? '').trim() || null;
  const resolvedDisplay = resolveOwnerDisplayNameFromProfile(owner);
  const logo = (owner.logo_url ?? '').trim() || null;
  const avatar = (owner.avatar_url ?? '').trim() || null;
  return {
    owner_location: owner.location ?? null,
    owner_display_name: resolvedDisplay,
    owner_company_name: companyName,
    owner_logo_url: logo,
    owner_avatar_url: avatar,
    owner_registry_verified: ownerRegistryVerified(owner),
    owner_role: owner.role ?? null,
  };
}

function parseGalleryItems(raw: unknown): CompanyAdGalleryItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item) => item && typeof item === 'object' && typeof (item as { url?: unknown }).url === 'string')
    .map((item) => {
      const o = item as { url: string; caption?: unknown };
      return {
        url: o.url,
        caption: o.caption != null ? String(o.caption) : null,
      };
    });
}

function parseStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((s) => String(s).trim()).filter(Boolean);
}

function parseOptionalNumber(raw: unknown): number | null {
  return parseOptionalMoneyAmount(raw);
}

export function toResponse(row: AdRow): CompanyAdResponseDto {
  return {
    id: row.id,
    owner_id: row.owner_id as string,
    thumbnail_url: (row.thumbnail_url as string | null) ?? null,
    title: row.title as string,
    body: row.body as string,
    category: normalizeAdCategory(row.category),
    status: row.status as CompanyAdResponseDto['status'],
    starts_at: (row.starts_at as string | null) ?? null,
    ends_at: (row.ends_at as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    profile_type: (row.profile_type as string) ?? 'company',
    tagline: (row.tagline as string | null) ?? null,
    region: (row.region as string | null) ?? null,
    city: (row.city as string | null) ?? null,
    street_address: (row.street_address as string | null) ?? null,
    postal_code: (row.postal_code as string | null) ?? null,
    show_exact_address: row.show_exact_address === true,
    price_type: (row.price_type as string | null) ?? null,
    price_min: parseOptionalNumber(row.price_min),
    price_max: parseOptionalNumber(row.price_max),
    price_negotiable: row.price_negotiable === true,
    price_note: (row.price_note as string | null) ?? null,
    availability: (row.availability as string | null) ?? null,
    works_weekends: row.works_weekends === true,
    evening_hours: row.evening_hours === true,
    emergency_service: row.emergency_service === true,
    contact_person: (row.contact_person as string | null) ?? null,
    contact_email: (row.contact_email as string | null) ?? null,
    contact_phone: (row.contact_phone as string | null) ?? null,
    website: (row.website as string | null) ?? null,
    preferred_contact_method: (row.preferred_contact_method as string) ?? 'platform',
    show_phone_publicly: row.show_phone_publicly === true,
    show_email_publicly: row.show_email_publicly === true,
    ico: (row.ico as string | null) ?? null,
    dic: (row.dic as string | null) ?? null,
    ic_dph: (row.ic_dph as string | null) ?? null,
    founded_year:
      row.founded_year != null ? Number(row.founded_year) : null,
    employee_count: (row.employee_count as string | null) ?? null,
    duration_months:
      row.duration_months != null ? Number(row.duration_months) : null,
    services: parseStringArray(row.services),
    specializations: parseStringArray(row.specializations),
    certifications: parseStringArray(row.certifications),
    service_areas: parseStringArray(row.service_areas),
    custom_service_areas: parseStringArray(row.custom_service_areas),
    gallery_items: parseGalleryItems(row.gallery_items),
  };
}

export function ownerRegistryVerified(row: OwnerListRow | undefined): boolean {
  const t = row?.registry_verified_at;
  return t != null && String(t).length > 0;
}

function toListItemBase(row: AdRow): CompanyAdListItemDto {
  return {
    id: row.id,
    owner_id: row.owner_id as string,
    thumbnail_url: (row.thumbnail_url as string | null) ?? null,
    title: row.title as string,
    category: normalizeAdCategory(row.category),
    status: row.status as CompanyAdListItemDto['status'],
    starts_at: (row.starts_at as string | null) ?? null,
    ends_at: (row.ends_at as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    profile_type: (row.profile_type as string) ?? 'company',
    tagline: (row.tagline as string | null) ?? null,
    region: (row.region as string | null) ?? null,
    city: (row.city as string | null) ?? null,
    price_type: (row.price_type as string | null) ?? null,
    price_min: parseOptionalNumber(row.price_min),
    price_max: parseOptionalNumber(row.price_max),
    price_negotiable: row.price_negotiable === true,
    availability: (row.availability as string | null) ?? null,
    works_weekends: row.works_weekends === true,
    evening_hours: row.evening_hours === true,
    emergency_service: row.emergency_service === true,
    contact_email: (row.contact_email as string | null) ?? null,
    contact_phone: (row.contact_phone as string | null) ?? null,
    website: (row.website as string | null) ?? null,
    preferred_contact_method: (row.preferred_contact_method as string) ?? 'platform',
    show_phone_publicly: row.show_phone_publicly === true,
    show_email_publicly: row.show_email_publicly === true,
    services: parseStringArray(row.services),
    service_areas: parseStringArray(row.service_areas),
    owner_location: null,
    owner_display_name: null,
    owner_company_name: null,
    owner_logo_url: null,
    owner_avatar_url: null,
    owner_registry_verified: false,
  };
}

export function toListItemDto(
  row: AdRow,
  owner: OwnerListRow | undefined,
  viewer: CompanyAdViewerContext | null = null,
): CompanyAdListItemDto {
  const asResponse: CompanyAdResponseDto = {
    ...toListItemBase(row),
    body: '',
    street_address: null,
    postal_code: null,
    show_exact_address: false,
    price_note: null,
    contact_person: null,
    ico: null,
    dic: null,
    ic_dph: null,
    founded_year: null,
    employee_count: null,
    duration_months: null,
    specializations: [],
    certifications: [],
    custom_service_areas: [],
    gallery_items: [],
  };
  const redacted = mapCompanyAdForViewer(asResponse, viewer);
  const base = toListItemBase(row);
  return {
    ...base,
    contact_email: redacted.contact_email,
    contact_phone: redacted.contact_phone,
    ...ownerSnapshotFromProfile(owner),
  };
}

export function mapAdForViewer(
  row: AdRow,
  user: CurrentUser | null,
): CompanyAdResponseDto {
  return mapCompanyAdForViewer(toResponse(row), companyAdViewerFromUser(user));
}

export function attachOwnerSnapshot(
  dto: CompanyAdResponseDto,
  owner: OwnerListRow | undefined,
): CompanyAdResponseDto {
  return {
    ...dto,
    ...ownerSnapshotFromProfile(owner),
  };
}

export function mapAdForViewerWithOwner(
  row: AdRow,
  user: CurrentUser | null,
  owner: OwnerListRow | undefined,
): CompanyAdResponseDto {
  return attachOwnerSnapshot(mapAdForViewer(row, user), owner);
}

export function rowToPublishShape(row: AdRow): Record<string, unknown> {
  const r = toResponse(row);
  return {
    title: r.title,
    body: r.body,
    category: r.category,
    profile_type: r.profile_type,
    services: r.services,
    region: r.region,
    city: r.city,
    service_areas: r.service_areas,
    price_type: r.price_type,
    price_min: r.price_min,
    price_max: r.price_max,
    price_negotiable: r.price_negotiable,
    preferred_contact_method: r.preferred_contact_method,
    contact_email: r.contact_email,
    contact_phone: r.contact_phone,
    website: r.website,
    founded_year: r.founded_year,
    ico: r.ico,
  };
}

function normalizeStringArray(arr: string[] | undefined): string[] | undefined {
  if (arr === undefined) return undefined;
  return arr.map((s) => String(s).trim()).filter(Boolean);
}

function normalizeGallery(items: CompanyAdGalleryItem[] | undefined): CompanyAdGalleryItem[] | undefined {
  if (items === undefined) return undefined;
  return items
    .filter((i) => i?.url?.trim())
    .map((i) => ({
      url: i.url.trim(),
      caption: i.caption?.trim() || null,
    }));
}

/** Build DB patch/insert fields from DTO (only defined keys). */
export function fieldsFromDto(dto: CompanyAdFieldsDto & {
  title?: string;
  body?: string;
  category?: string;
  thumbnail_url?: string | null;
}): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (dto.title !== undefined) patch.title = dto.title;
  if (dto.body !== undefined) patch.body = dto.body;
  if (dto.category !== undefined) patch.category = dto.category;
  if (dto.thumbnail_url !== undefined) patch.thumbnail_url = dto.thumbnail_url;
  if (dto.profile_type !== undefined) patch.profile_type = dto.profile_type;
  if (dto.tagline !== undefined) patch.tagline = dto.tagline?.trim() || null;
  if (dto.region !== undefined) patch.region = dto.region?.trim() || null;
  if (dto.city !== undefined) patch.city = dto.city?.trim() || null;
  if (dto.street_address !== undefined) patch.street_address = dto.street_address?.trim() || null;
  if (dto.postal_code !== undefined) patch.postal_code = dto.postal_code?.trim() || null;
  if (dto.show_exact_address !== undefined) patch.show_exact_address = dto.show_exact_address;
  if (dto.price_type !== undefined) patch.price_type = dto.price_type;
  if (dto.price_min !== undefined) {
    patch.price_min = parseOptionalMoneyAmount(dto.price_min);
  }
  if (dto.price_max !== undefined) {
    patch.price_max = parseOptionalMoneyAmount(dto.price_max);
  }
  if (dto.price_negotiable !== undefined) patch.price_negotiable = dto.price_negotiable;
  if (dto.price_note !== undefined) patch.price_note = dto.price_note?.trim() || null;
  if (dto.availability !== undefined) patch.availability = dto.availability;
  if (dto.works_weekends !== undefined) patch.works_weekends = dto.works_weekends;
  if (dto.evening_hours !== undefined) patch.evening_hours = dto.evening_hours;
  if (dto.emergency_service !== undefined) patch.emergency_service = dto.emergency_service;
  if (dto.contact_person !== undefined) patch.contact_person = dto.contact_person?.trim() || null;
  if (dto.contact_email !== undefined) patch.contact_email = dto.contact_email?.trim() || null;
  if (dto.contact_phone !== undefined) patch.contact_phone = dto.contact_phone?.trim() || null;
  if (dto.website !== undefined) {
    const raw = dto.website?.trim() || null;
    patch.website = raw ? sanitizeExternalUrl(raw, { allowHttp: true }) : null;
  }
  if (dto.preferred_contact_method !== undefined) {
    patch.preferred_contact_method = dto.preferred_contact_method;
  }
  if (dto.show_phone_publicly !== undefined) patch.show_phone_publicly = dto.show_phone_publicly;
  if (dto.show_email_publicly !== undefined) patch.show_email_publicly = dto.show_email_publicly;
  if (dto.ico !== undefined) patch.ico = dto.ico?.trim() || null;
  if (dto.dic !== undefined) patch.dic = dto.dic?.trim() || null;
  if (dto.ic_dph !== undefined) patch.ic_dph = dto.ic_dph?.trim() || null;
  if (dto.founded_year !== undefined) patch.founded_year = dto.founded_year;
  if (dto.employee_count !== undefined) patch.employee_count = dto.employee_count;
  const services = normalizeStringArray(dto.services);
  if (services !== undefined) patch.services = services;
  const specializations = normalizeStringArray(dto.specializations);
  if (specializations !== undefined) patch.specializations = specializations;
  const certifications = normalizeStringArray(dto.certifications);
  if (certifications !== undefined) patch.certifications = certifications;
  const serviceAreas = normalizeStringArray(dto.service_areas);
  if (serviceAreas !== undefined) patch.service_areas = serviceAreas;
  const customAreas = normalizeStringArray(dto.custom_service_areas);
  if (customAreas !== undefined) patch.custom_service_areas = customAreas;
  const gallery = normalizeGallery(dto.gallery_items);
  if (gallery !== undefined) patch.gallery_items = gallery;
  return patch;
}

